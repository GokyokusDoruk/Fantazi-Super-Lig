/**
 * Önbellekteki ham API verisini şemamıza uygun satırlara çevirip
 * data/dataset-<sezon>.json olarak yazar (Supabase'e yüklemeden önceki ara ürün).
 *
 * Kullanım: npm run build:dataset -- [sezon=2024]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mapPosition, toPlayerStats, type ApiPlayerEntry } from "../src/lib/api-football/map";
import {
  bonusForStats,
  buildFixtures,
  buildGameweeks,
  buildTeams,
  pickFantasyPosition,
  type ApiFixture,
  type ApiTeam,
  type BonusStatRow,
} from "../src/lib/ingest/transform";
import { DEFAULT_RULES } from "../src/lib/scoring/default-rules";
import { scorePlayer } from "../src/lib/scoring/engine";
import type { Position } from "../src/lib/scoring/types";

const season = Number(process.argv[2] ?? 2024);
const dir = join("data", "api-cache", String(season));
const read = <T>(f: string): T => JSON.parse(readFileSync(join(dir, f), "utf8")) as T;

interface ApiFixturePlayers {
  team: { id: number };
  players: ApiPlayerEntry[];
}

const apiTeams = read<ApiTeam[]>("teams.json");
const apiFixtures = read<ApiFixture[]>("fixtures.json");

const teams = buildTeams(apiTeams);
const fixtures = buildFixtures(apiFixtures);
const gameweeks = buildGameweeks(season, fixtures);

// Maç verisi olan fikstürleri kronolojik sırayla oku.
const playersDir = join(dir, "fixture-players");
const available = new Set(
  existsSync(playersDir) ? readdirSync(playersDir).map((f) => Number(f.replace(".json", ""))) : [],
);
const withStats = apiFixtures
  .filter((f) => available.has(f.fixture.id))
  .sort((a, b) => Date.parse(a.fixture.date) - Date.parse(b.fixture.date));

// 1. geçiş: oyuncu başına görülen mevkiler (kronolojik) ve takım.
const seen = new Map<number, Position[]>();
const playerInfo = new Map<number, { name: string; team: number }>();
const perFixture = new Map<number, ApiFixturePlayers[]>();
for (const f of withStats) {
  const data = JSON.parse(
    readFileSync(join(playersDir, `${f.fixture.id}.json`), "utf8"),
  ) as ApiFixturePlayers[];
  perFixture.set(f.fixture.id, data);
  for (const t of data) {
    for (const p of t.players) {
      const s = p.statistics[0];
      const pos = mapPosition(s?.games.position);
      if (!s || !pos || !s.games.minutes) continue;
      const list = seen.get(p.player.id) ?? [];
      list.push(pos);
      seen.set(p.player.id, list);
      playerInfo.set(p.player.id, { name: p.player.name, team: t.team.id });
    }
  }
}

const players = [...seen.entries()].map(([id, positions]) => ({
  api_id: id,
  name: playerInfo.get(id)!.name,
  team_api_id: playerInfo.get(id)!.team,
  position: pickFantasyPosition(positions)!,
}));
const fantasyPos = new Map(players.map((p) => [p.api_id, p.position]));

// 2. geçiş: maç istatistikleri, sabit mevkiyle puanlanmış.
const stats: Array<BonusStatRow & Record<string, unknown>> = [];
for (const f of withStats) {
  for (const t of perFixture.get(f.fixture.id)!) {
    const conceded = t.team.id === f.teams.home.id ? f.goals.away : f.goals.home;
    for (const p of t.players) {
      const pos = fantasyPos.get(p.player.id);
      const s = toPlayerStats(p, conceded ?? 0, pos);
      if (!s || s.minutes === 0) continue;
      stats.push({
        fixture_api_id: f.fixture.id,
        player_api_id: p.player.id,
        ...s,
        rating: p.statistics[0].games.rating ? Number(p.statistics[0].games.rating) : null,
        points_before_bonus: scorePlayer(s, DEFAULT_RULES),
      });
    }
  }
}

// Bonus maç bazlıdır, bu yüzden bütün satırlar kurulduktan sonra dağıtılır.
const bonuses = bonusForStats(stats);
bonuses.forEach((b, i) => {
  stats[i].bonus_points = b;
});

const out = join("data", `dataset-${season}.json`);
writeFileSync(out, JSON.stringify({ season, teams, gameweeks, fixtures, players, stats }));
console.log(
  `${teams.length} takım, ${gameweeks.length} hafta, ${fixtures.length} maç, ` +
    `${players.length} oyuncu, ${stats.length} oyuncu-maç satırı -> ${out}`,
);
