# Lig sayfaları — tasarım

Tarih: 2026-11-23 · Dal: `feat/lig-sayfalari`

## Amaç ve neden

Veritabanında 2024 sezonunun tamamı var (19 takım, 445 oyuncu, 342 maç, 2887
istatistik satırı) ve puanlama motoru yazılıp test edildi. Ama şu an hiç
arayüz yok; uygulama Next.js'in kurulum sayfasını gösteriyor. Bu tur, veriyi ve
puanlama kurallarını gözle görülür hâle getiriyor: oyuncuların sezon puanları,
hafta hafta maç sonuçları ve haftanın en iyileri.

Bu aynı zamanda puanlama motorunun 445 oyunculuk gerçek veri üzerinde
doğrulanması. Sayılar sahada olanla uyuşmuyorsa, kadro kurucuyu yazmadan önce
görülmesi gerekir.

## Hedefler

- Oyuncu listesi: sezon puanı sıralı, mevki ve takıma göre süzülebilir.
- Hafta sayfası: o haftanın maç sonuçları ve en yüksek puanlı oyuncuları,
  puanın hangi kalemlerden geldiği görünecek şekilde.
- Takım sayfası: kadro ve oyuncuların sezon puanları.
- Üyelik gerekmeden açılır; yayına alınabilir durumda.
- Türkçe arayüz, telefonda da okunabilir düzen.

## Hedef olmayanlar

- Üyelik, giriş, kullanıcı kadrosu, transfer ekranı.
- Oyuncu fiyatlama (şu an hepsi 5.0; kadro kurucu turunda yapılacak).
- Canlı sezon verisi; bu tur 2024 tekrar sezonu üzerinde çalışır.
- Yönetim paneli, özel ligler.

## Anti-hedefler

Şunlar olursa teknik olarak çalışsa bile başarısız sayılır:

- Puanlama kurallarının ikinci bir kopyasının ortaya çıkması. Kurallar senin
  koyduğun kurallar ve bu projenin kalbi; tek kaynakta durmalı.
- Sayfaların her açılışta bütün sezonu hesaplaması.
- Ekranda ham veritabanı terimleri görünmesi (`FWD`, `clean_sheet` gibi).

## Kısıtlar

- Next.js 16.4.6, App Router, `cacheComponents: true` açık. Veri okuyan
  fonksiyonlar `'use cache'` ile işaretlenmeli, yoksa sayfa her istekte
  yeniden render edilir.
- Tailwind v4, Turbopack üzerinden. Ek arayüz kütüphanesi eklenmeyecek.
- Supabase ücretsiz plan. Sayfalar yayınlanabilir anahtarla (anon) okur;
  oyun verisi RLS'te herkese açık. Gizli anahtar arayüz tarafına girmez.
- Veri değişmiyor (tekrar sezonu), yani sayfalar statik üretilebilir.

## Yaklaşımlar

Puanın nerede hesaplandığı tek önemli mimari karardı:

1. **Yükleme sırasında hesaplanıp saklanır** — `scripts/load-seed.ts`
   TypeScript motorunu çağırır, sonucu kolona yazar. Kurallar tek yerde
   (testli TypeScript), sayfalar basit toplama yapar. Bedeli: kural
   değişince yükleyiciyi tekrar çalıştırmak gerekir.
2. **Postgres görünümü** — kurallar SQL'de ikinci kez yazılır. Hızlı, ama
   kurallar iki yerde durur ve birini güncellemeyi unutmak kaçınılmaz.
   Anti-hedefe çarpıyor.
3. **Her istekte TypeScript'te** — kurallar tek yerde ama her sayfa açılışı
   2887 satır çekip hesaplar. Yavaş ve sezon büyüdükçe kötüleşir.

**Seçilen: 1.** Kurallar TypeScript'te tek kaynak kalır, veritabanı sonucu
saklar, sayfalar hızlı açılır. Yükleyici zaten tekrar çalıştırılabilir
yazıldığı için yeniden hesaplama bir komut.

## Kararlaştırılanlar

### Veritabanı

`0002_points.sql` göçü, `player_match_stats` tablosuna iki kolon ekler:

- `points integer not null default 0` — maç puanı, bonus hariç.
- `bonus_points integer not null default 0` — reytinge göre maç bonusu.

İkisi ayrı tutuluyor çünkü hafta sayfasında puanın dökümünü gösterirken
bonusun nereden geldiği ayrı anlatılacak.

### Yükleyici

`scripts/load-seed.ts`, istatistikleri yazmadan önce:

- her satır için `scorePlayer()` çağırır (oyuncunun sabit fantazi mevkisiyle,
  maçtaki değişken mevkisiyle değil),
- her maç için `bonusByRating()` çağırıp o maçın ilk üçüne 3/2/1 dağıtır,
- ikisini satırlara yazar.

Mevcut upsert yapısı korunur; kural değişince `npm run build:dataset &&
npm run load:seed -- 2024` puanları yeniden yazar.

Plan yazılırken bir düzeltme: `points_before_bonus` zaten
`scripts/build-dataset.ts` içinde hesaplanıyormuş. Bu yüzden bonus da orada
hesaplanıyor ve yükleyici sadece yazıyor. Hesap dönüşüm katmanında, yazma
yükleyicide kalıyor; ikisi karışmıyor. (Benim kararım.)

### Sayfalar

| Yol | İçerik |
|---|---|
| `/` | Son haftanın özeti, sezonun en iyi 10 oyuncusu, sayfalara giriş |
| `/oyuncular` | Bütün oyuncular, sezon puanı sıralı, mevki + takım süzgeci |
| `/haftalar` | 38 haftanın listesi, tarih ve maç sayısıyla |
| `/haftalar/[hafta]` | O haftanın maç sonuçları + haftanın en iyi 10'u, puan dökümüyle |
| `/takimlar` | 19 takım |
| `/takimlar/[slug]` | Takım kadrosu, oyuncuların sezon puanları |

Yollar Türkçe. Takım slug'ı `short_name`'in küçük harfli hâli (`gs`, `fb`).

### Veri erişimi

`src/lib/supabase/public.ts` — yayınlanabilir anahtarla okuyan istemci.
`src/lib/queries/` altında sayfa başına bir fonksiyon, her biri `'use cache'`
ile işaretli. Her fonksiyon ekranın ihtiyacı olan şekli döndürür; sayfa
bileşenleri veritabanı şemasını görmez.

### Süzgeçler

Mevki ve takım süzgeci istemci tarafında, bellekteki listede çalışır. 445
oyuncu küçük bir yük ve bu sayede sayfa statik kalıp önbelleğe girebilir.
`searchParams` kullanılsaydı sayfa her istekte yeniden render edilirdi.

### Görünüm

Mevcut Tailwind kurulumu, ek kütüphane yok. Koyu/açık tema `prefers-color-scheme`
ile. Mevkiler Türkçe ve kısaltmalı gösterilir: Kaleci/KL, Defans/DF,
Orta saha/OS, Forvet/FV. Üstte dört bağlantılı sade bir gezinme çubuğu.
Next.js kurulum sayfası ve `metadata` başlığı değiştirilir.

### Veri kapsamı (önemli)

342 maçın **93'ünde** oyuncu istatistiği var: 1–10. haftalar tam, 11. hafta
kısmi (9 maçın 3'ü), 12–38. haftalar boş. Sebebi ücretsiz kotanın (günde 100
istek) dolması; kalan 249 maç için birkaç gün daha çekim gerekiyor. Maç
sonuçları (skorlar) ise bütün sezon için var, çünkü ayrı bir uçnoktadan tek
seferde geliyor.

Sayfalar bunu gizlemeyecek, gösterecek:

- `/haftalar` her haftanın yanında kapsama durumunu yazar ("9/9 maç",
  "veri yok").
- `/haftalar/[hafta]` istatistiği olmayan haftada maç sonuçlarını gösterir,
  oyuncu puanları yerine verinin henüz çekilmediğini söyler.
- `/` son **tam kapsanan** haftayı özetler (şu an 10).
- Oyuncu listesindeki sezon puanı, kapsanan maçlar üzerinden hesaplanır;
  listenin başında kaç maçı kapsadığı yazar.

Kapsama arttıkça bu sayılar kendiliğinden güncellenir; sayfalarda sabit
hafta numarası tutulmaz.

### Küçük kararlar (benim kararım)

- Sezon numarası `src/lib/season.ts` içinde tek sabit (`CURRENT_SEASON = 2024`),
  sayfalara dağılmaz.
- Oyuncunun "maç" sayısı: dakikası sıfırdan büyük istatistik satırı sayısı.
  Kadroda olup oynamayan maçlar sayılmaz.
- Sezon puanı = `points + bonus_points` toplamı.

## Builder'a bırakılanlar

- Tablo ve kart bileşenlerinin ayrıştırılması.
- Boş durum ve hata durumu metinleri.
- Sıralama kolonlarının tam listesi (puan sıralı başlamak yeterli).
- `loading.tsx` / `<Suspense>` yerleşimi.
