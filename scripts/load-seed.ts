/**
 * data/dataset-<sezon>.json dosyasını Supabase veritabanına yükler.
 * Tekrar çalıştırılabilir (upsert); sezon ilerledikçe aynı komut yeniden çalışır.
 *
 * Gerekli: .env içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY
 * Kullanım: npm run load:seed -- [sezon=2024]
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../src/lib/supabase/admin";

const season = Number(process.argv[2] ?? 2024);

interface Dataset {
  teams: Array<{ api_id: number; name: string; short_name: string }>;
  gameweeks: Array<{ season: number; number: number; deadline: string }>;
  players: Array<{ api_id: number; name: string; team_api_id: number; position: string }>;
  fixtures: Array<{
    api_id: number;
    gameweek: number | null;
    home_api_id: number;
    away_api_id: number;
    kickoff: string;
    status: string;
    home_goals: number | null;
    away_goals: number | null;
  }>;
  stats: Array<{
    fixture_api_id: number;
    player_api_id: number;
    minutes: number;
    started: boolean;
    goals: number;
    assists: number;
    teamGoalsConceded: number;
    saves: number;
    penaltiesSaved: number;
    penaltiesCommitted: number;
    yellowCards: number;
    redCards: number;
    ownGoals: number;
    rating: number | null;
    points_before_bonus: number;
    bonus_points: number;
  }>;
}

const BATCH = 500;

async function upsert(
  db: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db
      .from(table)
      .upsert(rows.slice(i, i + BATCH), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`${table}: ${rows.length} satır`);
}

/** api_id -> veritabanı id eşlemesi. */
async function idMap(db: SupabaseClient, table: string): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select("id, api_id")
      .range(from, from + 999);
    if (error) throw new Error(`${table} okunamadı: ${error.message}`);
    for (const r of data as Array<{ id: number; api_id: number }>) map.set(r.api_id, r.id);
    if (data.length < 1000) return map;
  }
}

async function main() {
  const db = createAdminClient();
  const data = JSON.parse(
    readFileSync(join("data", `dataset-${season}.json`), "utf8"),
  ) as Dataset;

  await upsert(db, "teams", data.teams, "api_id");
  await upsert(db, "gameweeks", data.gameweeks, "season,number");

  const teamIds = await idMap(db, "teams");
  await upsert(
    db,
    "players",
    data.players.map((p) => ({
      api_id: p.api_id,
      name: p.name,
      position: p.position,
      team_id: teamIds.get(p.team_api_id),
    })),
    "api_id",
  );

  const { data: gwRows, error: gwErr } = await db
    .from("gameweeks")
    .select("id, number")
    .eq("season", season);
  if (gwErr) throw new Error(`gameweeks okunamadı: ${gwErr.message}`);
  const gwIds = new Map((gwRows as Array<{ id: number; number: number }>).map((g) => [g.number, g.id]));

  await upsert(
    db,
    "fixtures",
    data.fixtures.map((f) => ({
      api_id: f.api_id,
      gameweek_id: f.gameweek === null ? null : (gwIds.get(f.gameweek) ?? null),
      home_team_id: teamIds.get(f.home_api_id),
      away_team_id: teamIds.get(f.away_api_id),
      kickoff: f.kickoff,
      status: f.status,
      home_goals: f.home_goals,
      away_goals: f.away_goals,
    })),
    "api_id",
  );

  const fixtureIds = await idMap(db, "fixtures");
  const playerIds = await idMap(db, "players");
  await upsert(
    db,
    "player_match_stats",
    data.stats.map((s) => ({
      fixture_id: fixtureIds.get(s.fixture_api_id),
      player_id: playerIds.get(s.player_api_id),
      minutes: s.minutes,
      started: s.started,
      goals: s.goals,
      assists: s.assists,
      goals_conceded: s.teamGoalsConceded,
      saves: s.saves,
      penalties_saved: s.penaltiesSaved,
      penalties_missed: s.penaltiesCommitted, // şemadaki kolon: penaltıya sebep olma
      yellow_cards: s.yellowCards,
      red_cards: s.redCards,
      own_goals: s.ownGoals,
      rating: s.rating,
      points: s.points_before_bonus,
      bonus_points: s.bonus_points,
    })),
    "fixture_id,player_id",
  );

  console.log("Yükleme tamam.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
