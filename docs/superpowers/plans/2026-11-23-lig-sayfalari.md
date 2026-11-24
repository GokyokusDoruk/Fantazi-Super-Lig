# Lig Sayfaları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2024 sezonu verisini ve puanlama kurallarını üyelik gerektirmeyen altı sayfada göstermek.

**Architecture:** Maç puanları veri hattında (build-dataset) hesaplanıp veritabanına yazılır; Postgres görünümleri sadece bu hazır puanları toplar, yani puanlama kuralları TypeScript'te tek kaynak kalır. Sayfalar server component olarak görünümlerden okur, `'use cache'` ile önbelleğe girer; süzgeçler istemcide bellekteki liste üzerinde çalışır.

**Tech Stack:** Next.js 16.4.6 (App Router, cacheComponents), React 19, Tailwind v4, Supabase (Postgres + supabase-js), vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-lig-sayfalari-design.md`

## Global Constraints

- Arayüz dili Türkçe; yollar Türkçe (`/oyuncular`, `/haftalar`, `/takimlar`).
- Mevki etiketleri: GK=Kaleci/KL, DEF=Defans/DF, MID=Orta saha/OS, FWD=Forvet/FV. Ekranda ham kod (`FWD`) görünmez.
- Puanlama kuralları yalnızca `src/lib/scoring/` içinde yaşar. SQL'de kural hesabı yapılmaz; görünümler sadece toplar.
- Gizli anahtar (`SUPABASE_SERVICE_ROLE_KEY`) arayüz kodunda kullanılmaz; sayfalar `NEXT_PUBLIC_SUPABASE_ANON_KEY` ile okur.
- Sezon numarası tek sabitten gelir: `src/lib/season.ts` → `CURRENT_SEASON = 2024`.
- Ek arayüz/veri kütüphanesi kurulmaz.
- Veri okuyan her fonksiyon `'use cache'` ile işaretlenir.

## Review Focus

Spec'in gerektirdiği ama hiçbir görevin doğal akışında sınanmayan, kullanıcıyı en çok vuracak durumlar. Her biri sahibi olan göreve test olarak eklendi.

1. **İstatistiği olmayan hafta (12–38).** Oyuncu puanı yok; sayfa boş tablo ya da hata değil, "veri henüz çekilmedi" açıklaması ve maç sonuçlarını gösterir. → Task 6.
2. **Geçersiz hafta numarası** (`/haftalar/99`, `/haftalar/abc`). 404 döner, çökmez. → Task 6.
3. **Bilinmeyen takım slug'ı** (`/takimlar/xyz`). 404 döner. → Task 7.
4. **Hiç oynamamış oyuncu** (kadroda olup dakika almamış). Listede 0 maç / 0 puan görünür, sıfıra bölme ya da `NaN` olmaz. → Task 3.
5. **Reytingi olmayan oyuncu** (`rating` null, oyuncuların ~%2'si). Bonus almaz ve puan dökümünde bonus satırı görünmez. → Task 2.

---

### Task 1: Puan kolonları, görünümler ve dolu puanlar

**Files:**
- Create: `supabase/migrations/0002_points_and_views.sql`
- Modify: `src/lib/ingest/transform.ts` (sona ekleme)
- Modify: `scripts/build-dataset.ts`
- Modify: `scripts/load-seed.ts`
- Test: `src/lib/ingest/transform.test.ts` (sona ekleme)

**Interfaces:**
- Consumes: `bonusByRating(players: RatedPlayer[]): Map<number, number>` — `src/lib/scoring/bonus.ts`.
- Produces:
  - `bonusForStats<T extends BonusStatRow>(stats: T[]): number[]` — `src/lib/ingest/transform.ts`. Girişle aynı uzunlukta, aynı sıralı bonus dizisi.
  - `interface BonusStatRow { fixture_api_id: number; player_api_id: number; minutes: number; rating: number | null }`
  - Veritabanı görünümleri: `player_season_totals`, `fixture_results`, `gameweek_player_points`, `gameweek_coverage` (kolonları aşağıda).

- [ ] **Step 1: Write the failing test**

`src/lib/ingest/transform.test.ts` sonuna:

```ts
describe("bonusForStats", () => {
  const row = (fixture: number, player: number, minutes: number, rating: number | null) =>
    ({ fixture_api_id: fixture, player_api_id: player, minutes, rating });

  it("her maçın en iyi üçüne 3/2/1 verir, maçlar birbirini etkilemez", () => {
    const stats = [
      row(1, 10, 90, 8.5), row(1, 11, 90, 7.9), row(1, 12, 90, 7.1), row(1, 13, 90, 6.0),
      row(2, 20, 90, 6.2), row(2, 21, 90, 9.1),
    ];
    expect(bonusForStats(stats)).toEqual([3, 2, 1, 0, 2, 3]);
  });

  it("oynamayan ve reytingi olmayan oyuncu bonus almaz", () => {
    const stats = [row(1, 10, 0, 9.9), row(1, 11, 90, null), row(1, 12, 90, 7.0)];
    expect(bonusForStats(stats)).toEqual([0, 0, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- transform`
Expected: FAIL, "bonusForStats is not defined".

- [ ] **Step 3: Implement `bonusForStats` in `src/lib/ingest/transform.ts`**

Satırları `fixture_api_id`'ye göre grupla, her grup için `bonusByRating` çağır, dönen `Map`'ten her satırın bonusunu oku, yoksa 0. Giriş sırası korunur.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- transform`
Expected: PASS.

- [ ] **Step 5: Write the migration `supabase/migrations/0002_points_and_views.sql`**

Üç kolon ekler:

```sql
alter table player_match_stats
  add column if not exists points       integer not null default 0,
  add column if not exists bonus_points integer not null default 0,
  add column if not exists started      boolean not null default false;
```

Dört görünüm oluşturur, hepsi `with (security_invoker = on)` ve `grant select ... to anon, authenticated`:

- `player_season_totals`: `player_id, name, position, price, team_name, team_slug, matches, goals, assists, points`. `players` + `teams` iç birleşim, `player_match_stats` sol birleşim; `matches` = `count(*) filter (where minutes > 0)`, `points` = `coalesce(sum(points + bonus_points), 0)`. Oynamamış oyuncu da listede, sıfırlarla.
- `fixture_results`: `fixture_id, season, gameweek, kickoff, status, home_goals, away_goals, home_name, home_slug, away_name, away_slug, has_stats`. `has_stats` = o maça ait istatistik satırı var mı.
- `gameweek_player_points`: `season, gameweek, player_id, name, position, team_name, team_slug, minutes, started, goals, assists, goals_conceded, saves, penalties_saved, penalties_missed, yellow_cards, red_cards, own_goals, rating, points, bonus_points`.
- `gameweek_coverage`: `season, number, deadline, fixtures, covered`. `covered` = istatistiği olan maç sayısı.

`team_slug` her yerde `lower(short_name)`.

- [ ] **Step 6: Apply the migration**

Supabase bağlantısıyla `0002_points_and_views.sql` uygulanır (`apply_migration`, ad: `points_and_views`).
Expected: dört görünüm oluşur, `player_season_totals` 445 satır döner.

- [ ] **Step 7: Add bonus to the dataset in `scripts/build-dataset.ts`**

İstatistik satırları kurulduktan sonra `bonusForStats(stats)` çağrılır ve her satıra `bonus_points` yazılır. `points_before_bonus` zaten hesaplanıyor, dokunulmaz.

- [ ] **Step 8: Write the new columns in `scripts/load-seed.ts`**

`Dataset["stats"]` tipine `started: boolean`, `points_before_bonus: number`, `bonus_points: number` eklenir; `player_match_stats` upsert'ine `points: s.points_before_bonus`, `bonus_points: s.bonus_points`, `started: s.started` eklenir.

- [ ] **Step 9: Rebuild and reload**

Run: `npm run build:dataset && npm run load:seed -- 2024`
Expected: 2887 istatistik satırı; `select sum(points), sum(bonus_points) from player_match_stats` sıfırdan büyük, ve her maçta bonus toplamı en çok 6.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/0002_points_and_views.sql src/lib/ingest/transform.ts src/lib/ingest/transform.test.ts scripts/build-dataset.ts scripts/load-seed.ts
git commit -m "Store match points and add reporting views"
```

---

### Task 2: Etiketler ve puan dökümü

**Files:**
- Create: `src/lib/labels.ts`
- Create: `src/lib/scoring/breakdown.ts`
- Test: `src/lib/scoring/breakdown.test.ts`

**Interfaces:**
- Consumes: `PlayerStats`, `RuleSet`, `DEFAULT_RULES`, `scorePlayer` — `src/lib/scoring/`.
- Produces:
  - `POSITION_LABEL: Record<Position, string>` ve `POSITION_SHORT: Record<Position, string>` — `src/lib/labels.ts`.
  - `interface BreakdownItem { label: string; points: number }`
  - `pointsBreakdown(s: PlayerStats, r: RuleSet, bonus?: number): BreakdownItem[]` — `src/lib/scoring/breakdown.ts`. Yalnızca puanı sıfırdan farklı kalemler döner; toplamı `scorePlayer(s, r) + (bonus ?? 0)` eder.

- [ ] **Step 1: Write the failing test**

`src/lib/scoring/breakdown.test.ts`:

```ts
const base: PlayerStats = { position: "MID", minutes: 90, started: true, goals: 0, assists: 0,
  teamGoalsConceded: 1, saves: 0, penaltiesSaved: 0, penaltiesCommitted: 0,
  yellowCards: 0, redCards: 0, ownGoals: 0 };

it("döküm toplamı scorePlayer ile aynı", () => {
  const s = { ...base, position: "DEF" as const, goals: 1, assists: 1, yellowCards: 1, teamGoalsConceded: 0 };
  const sum = pointsBreakdown(s, DEFAULT_RULES).reduce((a, i) => a + i.points, 0);
  expect(sum).toBe(scorePlayer(s, DEFAULT_RULES));
});

it("bonus verilince dökümde ayrı kalem olur", () => {
  const items = pointsBreakdown(base, DEFAULT_RULES, 3);
  expect(items.find((i) => i.label === "Bonus")?.points).toBe(3);
});

it("bonus yoksa bonus kalemi görünmez", () => {
  expect(pointsBreakdown(base, DEFAULT_RULES, 0).some((i) => i.label === "Bonus")).toBe(false);
  expect(pointsBreakdown(base, DEFAULT_RULES).some((i) => i.label === "Bonus")).toBe(false);
});

it("ikinci sarıda sarı kalemi değil kırmızı kalemi görünür", () => {
  const items = pointsBreakdown({ ...base, yellowCards: 2, redCards: 1 }, DEFAULT_RULES);
  expect(items.map((i) => i.label)).toContain("Kırmızı kart");
  expect(items.map((i) => i.label)).not.toContain("Sarı kart");
});

it("oynamayan oyuncunun dökümü boş", () => {
  expect(pointsBreakdown({ ...base, minutes: 0 }, DEFAULT_RULES)).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- breakdown`
Expected: FAIL, modül yok.

- [ ] **Step 3: Implement `src/lib/labels.ts` and `pointsBreakdown` in `src/lib/scoring/breakdown.ts`**

Kalem etiketleri: `İlk 11`, `Yedekten`, `60+ dakika`, `Gol`, `Asist`, `Clean sheet`, `Kurtarış`, `Penaltı kurtardı`, `Penaltıya sebep`, `Sarı kart`, `Kırmızı kart`, `Kendi kalesine`, `Bonus`. Kart mantığı `engine.ts` ile aynı: kırmızı varsa sarılar cezalandırılmaz. Sıfır puanlı kalem listeye girmez.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- breakdown`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/labels.ts src/lib/scoring/breakdown.ts src/lib/scoring/breakdown.test.ts
git commit -m "Add Turkish labels and a points breakdown helper"
```

---

### Task 3: Sorgu katmanı

**Files:**
- Create: `src/lib/season.ts`
- Create: `src/lib/supabase/public.ts`
- Create: `src/lib/queries/players.ts`
- Create: `src/lib/queries/gameweeks.ts`
- Create: `src/lib/queries/teams.ts`
- Create: `scripts/check-queries.ts`
- Modify: `package.json` (script: `check:queries`)

**Interfaces:**
- Produces:
  - `CURRENT_SEASON = 2024` — `src/lib/season.ts`.
  - `createPublicClient(): SupabaseClient` — `src/lib/supabase/public.ts`. `NEXT_PUBLIC_*` değişkenlerini kullanır, yoksa açıklayıcı hata atar.
  - `src/lib/queries/players.ts`: `interface PlayerTotal { id: number; name: string; position: Position; teamName: string; teamSlug: string; matches: number; goals: number; assists: number; points: number }`, `getPlayerTotals(): Promise<PlayerTotal[]>` (puana göre azalan), `getTeamSquad(slug: string): Promise<PlayerTotal[]>`.
  - `src/lib/queries/gameweeks.ts`: `interface GameweekSummary { number: number; deadline: string; fixtures: number; covered: number }`, `interface FixtureResult { id: number; gameweek: number | null; kickoff: string; status: string; homeName: string; homeSlug: string; awayName: string; awaySlug: string; homeGoals: number | null; awayGoals: number | null; hasStats: boolean }`, `interface GameweekPlayer { playerId: number; name: string; position: Position; teamName: string; teamSlug: string; stats: PlayerStats; rating: number | null; points: number; bonus: number }`; `getGameweeks(): Promise<GameweekSummary[]>`, `getLastCoveredGameweek(): Promise<number | null>`, `getFixtures(gameweek: number): Promise<FixtureResult[]>`, `getGameweekPlayers(gameweek: number, limit?: number): Promise<GameweekPlayer[]>` (puana göre azalan).
  - `src/lib/queries/teams.ts`: `interface TeamRow { name: string; slug: string; shortName: string }`, `getTeams(): Promise<TeamRow[]>`, `getTeam(slug: string): Promise<TeamRow | null>`.

Her sorgu fonksiyonu `'use cache'` ile başlar ve `CURRENT_SEASON`'a göre süzer. `GameweekPlayer.stats`, `pointsBreakdown`'a doğrudan verilebilecek şekilde `PlayerStats` biçiminde kurulur (`teamGoalsConceded` ← `goals_conceded`, `penaltiesCommitted` ← `penalties_missed`, mevki oyuncunun sabit fantazi mevkisi).

- [ ] **Step 1: Write the modules**

Yukarıdaki imzalar. Supabase hatası gelirse fonksiyon hatayı fırlatır (sessizce boş liste dönmez).

- [ ] **Step 2: Write `scripts/check-queries.ts`**

Her sorguyu gerçek veritabanına karşı çağırıp tek satırlık özet basar: oyuncu sayısı, en yüksek puanlı oyuncu, son kapsanan hafta, 1. haftanın maç sayısı, 12. haftanın maç ve oyuncu sayısı, oynamamış oyuncu sayısı. Oynamamış oyuncuların `matches` ve `points` değerleri 0 olmalı; `NaN` ya da `null` görülürse hata ile çıkar.

- [ ] **Step 3: Run it**

Run: `npm run check:queries`
Expected: 445 oyuncu; son kapsanan hafta 10; 1. hafta 9 maç ve 10 oyuncu; 12. hafta 9 maç ve 0 oyuncu; oynamamış oyuncularda 0/0, `NaN` yok.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: hata yok.

- [ ] **Step 5: Commit**

```bash
git add src/lib/season.ts src/lib/supabase/public.ts src/lib/queries scripts/check-queries.ts package.json
git commit -m "Add public Supabase client and page queries"
```

---

### Task 4: Uygulama kabuğu

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx` (sayfalara yönlendiren sade bir giriş; Task 8'de yeniden yazılır)
- Create: `src/components/nav.tsx`
- Create: `src/components/table.tsx`

**Interfaces:**
- Produces: `<Nav />` — `src/components/nav.tsx`; `Table`, `Th`, `Td` — `src/components/table.tsx`.

- [ ] **Step 1: Rewrite the shell**

`layout.tsx`: `metadata` başlığı "Fantazi Süper Lig", açıklaması bir cümle; `lang="tr"`; `<Nav />` body'nin üstünde; içerik `max-w-5xl mx-auto px-4` bir `<main>` içinde. `globals.css`'teki `font-family: Arial...` satırı kaldırılır (Geist değişkenleri zaten tanımlı).

`nav.tsx`: dört `<Link>` — marka (`/`), Oyuncular, Haftalar, Takımlar. Telefon genişliğinde yatay kaydırma olmadan sığar.

`table.tsx`: tekrar eden tablo sınıflarını tek yerde tutan ince sarmalayıcılar.

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`, tarayıcıda `/`.
Expected: gezinme çubuğu görünür, Next.js kurulum sayfası gitmiş, konsolda hata yok.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.tsx src/components
git commit -m "Replace the starter shell with the app nav and layout"
```

---

### Task 5: Oyuncular sayfası

**Files:**
- Create: `src/app/oyuncular/page.tsx`
- Create: `src/app/oyuncular/player-table.tsx`

**Interfaces:**
- Consumes: `getPlayerTotals()`, `POSITION_LABEL`, `POSITION_SHORT`, `Table`/`Th`/`Td`.
- Produces: `<PlayerTable players={PlayerTotal[]} />` — `'use client'`.

- [ ] **Step 1: Build the page and the client table**

`page.tsx` server component: `getPlayerTotals()` çağırır, başlık ve kapsama notu ("Puanlar kapsanan maçlar üzerinden") basar, listeyi `<PlayerTable>`'a verir.

`player-table.tsx` `'use client'`: iki `<select>` (mevki, takım) ve arama kutusu; süzme `useMemo` ile bellekte. Kolonlar: Oyuncu, Takım, Mevki, Maç, Gol, Asist, Puan. Puana göre azalan sıralı başlar. Süzgeç sonucu boşsa açıklayıcı bir satır gösterir.

- [ ] **Step 2: Verify in the browser**

`/oyuncular`: 445 satır, mevki süzgeci Kaleci seçilince yalnızca kaleciler, takım süzgeci çalışır, en üstteki oyuncunun puanı `check:queries` çıktısıyla aynı.

- [ ] **Step 3: Commit**

```bash
git add src/app/oyuncular
git commit -m "Add the players page with position and club filters"
```

---

### Task 6: Hafta sayfaları

**Files:**
- Create: `src/app/haftalar/page.tsx`
- Create: `src/app/haftalar/[hafta]/page.tsx`

**Interfaces:**
- Consumes: `getGameweeks()`, `getFixtures(n)`, `getGameweekPlayers(n, limit)`, `pointsBreakdown`, `POSITION_SHORT`.

- [ ] **Step 1: Build the gameweek list**

`/haftalar`: 38 hafta, her satırda hafta numarası, ilk maç tarihi ve kapsama (`9/9 maç` ya da `veri yok`). Kapsananlar bağlantılı.

- [ ] **Step 2: Build the gameweek detail page**

`/haftalar/[hafta]`: `PageProps<'/haftalar/[hafta]'>` ile `params` okunur. Hafta numarası tam sayı değilse ya da 1–38 aralığı dışındaysa `notFound()`. Maç sonuçları listelenir. `getGameweekPlayers` boş dönerse "Bu haftanın oyuncu verisi henüz çekilmedi." açıklaması ve nedeni (ücretsiz kota) tek satırda yazılır; doluysa en iyi 10 oyuncu, her birinin puan dökümü `pointsBreakdown` ile satır altında gösterilir. `generateStaticParams` 1–38 arasını döndürür.

- [ ] **Step 3: Verify the uncovered and invalid cases in the browser**

- `/haftalar/1`: 9 maç, 10 oyuncu, dökümler toplamı oyuncunun puanına eşit.
- `/haftalar/12`: 9 maç sonucu görünür, oyuncu verisi yok açıklaması var, hata yok.
- `/haftalar/99` ve `/haftalar/abc`: 404.

- [ ] **Step 4: Commit**

```bash
git add src/app/haftalar
git commit -m "Add gameweek list and detail pages"
```

---

### Task 7: Takım sayfaları

**Files:**
- Create: `src/app/takimlar/page.tsx`
- Create: `src/app/takimlar/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getTeams()`, `getTeam(slug)`, `getTeamSquad(slug)`.

- [ ] **Step 1: Build both pages**

`/takimlar`: 19 takım, isimleriyle, sayfalarına bağlantılı. `/takimlar/[slug]`: `getTeam(slug)` null dönerse `notFound()`; kadro puana göre azalan, mevki gruplarıyla. `generateStaticParams` takım slug'larını döndürür.

- [ ] **Step 2: Verify in the browser**

`/takimlar/gs` kadroyu gösterir; `/takimlar/xyz` 404.

- [ ] **Step 3: Commit**

```bash
git add src/app/takimlar
git commit -m "Add team list and squad pages"
```

---

### Task 8: Ana sayfa

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `getLastCoveredGameweek()`, `getFixtures(n)`, `getGameweekPlayers(n, 5)`, `getPlayerTotals()`.

- [ ] **Step 1: Build the overview**

Son kapsanan haftanın numarası, o haftanın maç sonuçları ve en iyi 5 oyuncusu; altında sezonun en iyi 10 oyuncusu; üç sayfaya bağlantı. Kapsanan hafta yoksa sayfa yine açılır ve veri beklendiğini söyler.

- [ ] **Step 2: Verify in the browser**

`/`: 10. hafta özeti ve sezon listesi görünür.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Add the overview home page"
```

---

### Task 9: Doğrulama ve PR

- [ ] **Step 1: Full check**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: hepsi temiz; `build` altı yolu üretir.

- [ ] **Step 2: Walk the pages**

Tarayıcıda `/`, `/oyuncular`, `/haftalar`, `/haftalar/1`, `/haftalar/12`, `/takimlar`, `/takimlar/gs`; konsolda hata yok; telefon genişliğinde yatay kaydırma yok.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/lig-sayfalari
```

PR açıklaması: ne eklendi, veri kapsamı (93/342 maç, 1–10. haftalar), puanların nerede hesaplandığı ve kuralların tek kaynakta kaldığı.
