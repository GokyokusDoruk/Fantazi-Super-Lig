/**
 * API-Football'dan bir sezonu yerel önbelleğe (data/api-cache) çeker.
 * Ücretsiz plan: günde 100 istek, sezon 2022-2024. Script kalan hakka bakar,
 * rezerve bırakıp durur; ertesi gün tekrar çalıştırınca kaldığı yerden devam eder.
 *
 * Kullanım: npm run fetch:season -- [sezon=2024] [maksMaç=80]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 203; // Süper Lig
const RESERVE = 5; // günlük hakkın bu kadarını elimizde tut

const season = Number(process.argv[2] ?? 2024);
const maxFixtures = Number(process.argv[3] ?? 80);
const key = process.env.API_FOOTBALL_KEY;
if (!key) throw new Error("API_FOOTBALL_KEY yok (.env)");

const dir = join("data", "api-cache", String(season));
mkdirSync(join(dir, "fixture-players"), { recursive: true });

let remaining = Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Ücretsiz planda dakika başına ~10 istek sınırı var: istekler arası bekle.
const SPACING_MS = 6500;

async function call(path: string, attempt = 1): Promise<unknown> {
  await sleep(SPACING_MS);
  const res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": key! } });
  const left = res.headers.get("x-ratelimit-requests-remaining");
  if (left !== null) remaining = Number(left);
  const json = (await res.json()) as { errors: unknown; response: unknown };
  const errs = json.errors;
  if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length)) {
    if (JSON.stringify(errs).includes("rateLimit") && attempt < 3) {
      console.log("dakika limiti, 65 sn bekleniyor...");
      await sleep(65_000);
      return call(path, attempt + 1);
    }
    throw new Error(`API hatası (${path}): ${JSON.stringify(errs)}`);
  }
  return json.response;
}

async function cached(file: string, path: string): Promise<unknown> {
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const data = await call(path);
  writeFileSync(file, JSON.stringify(data));
  console.log(`çekildi ${path} (kalan hak: ${remaining})`);
  return data;
}

interface Fixture {
  fixture: { id: number; status: { short: string } };
}

async function main() {
  await cached(join(dir, "teams.json"), `/teams?league=${LEAGUE}&season=${season}`);
  const fixtures = (await cached(
    join(dir, "fixtures.json"),
    `/fixtures?league=${LEAGUE}&season=${season}`,
  )) as Fixture[];

  const finished = fixtures.filter((f) => ["FT", "AET", "PEN"].includes(f.fixture.status.short));
  console.log(`${fixtures.length} maç, ${finished.length} bitmiş`);

  let fetched = 0;
  for (const f of finished) {
    const file = join(dir, "fixture-players", `${f.fixture.id}.json`);
    if (existsSync(file)) continue;
    if (fetched >= maxFixtures || remaining <= RESERVE) break;
    await cached(file, `/fixtures/players?fixture=${f.fixture.id}`);
    fetched++;
  }

  const done = finished.filter((f) =>
    existsSync(join(dir, "fixture-players", `${f.fixture.id}.json`)),
  ).length;
  console.log(`Önbellekte ${done}/${finished.length} maçın oyuncu istatistiği var. Kalan hak: ${remaining}`);

}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
