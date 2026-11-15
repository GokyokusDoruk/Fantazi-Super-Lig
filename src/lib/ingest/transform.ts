import type { Position } from "../scoring/types";

/** Transfer/kadro kilidi: haftanın ilk maçından kaç dakika önce. */
export const DEADLINE_OFFSET_MINUTES = 90;

export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed";

export interface ApiTeam {
  team: { id: number; name: string; code: string | null };
}

export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
}

export interface TeamRow {
  api_id: number;
  name: string;
  short_name: string;
}

export interface GameweekRow {
  season: number;
  number: number;
  deadline: string; // ISO
}

export interface FixtureRow {
  api_id: number;
  gameweek: number | null;
  home_api_id: number;
  away_api_id: number;
  kickoff: string; // ISO
  status: FixtureStatus;
  home_goals: number | null;
  away_goals: number | null;
}

/** "Regular Season - 12" -> 12; hafta numarası yoksa null. */
export function roundToGameweek(round: string): number | null {
  const m = round.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

export function mapFixtureStatus(short: string): FixtureStatus {
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST", "CANC", "SUSP", "ABD", "AWD", "WO"].includes(short)) return "postponed";
  if (["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"].includes(short)) return "live";
  return "scheduled";
}

export function buildTeams(teams: ApiTeam[]): TeamRow[] {
  return teams.map(({ team }) => ({
    api_id: team.id,
    name: team.name,
    short_name: team.code ?? team.name.slice(0, 3).toUpperCase(),
  }));
}

export function buildFixtures(fixtures: ApiFixture[]): FixtureRow[] {
  return fixtures.map((f) => ({
    api_id: f.fixture.id,
    gameweek: roundToGameweek(f.league.round),
    home_api_id: f.teams.home.id,
    away_api_id: f.teams.away.id,
    kickoff: new Date(f.fixture.date).toISOString(),
    status: mapFixtureStatus(f.fixture.status.short),
    home_goals: f.goals.home,
    away_goals: f.goals.away,
  }));
}

/** Her hafta için deadline = haftanın ilk maçı - DEADLINE_OFFSET_MINUTES. */
export function buildGameweeks(season: number, fixtures: FixtureRow[]): GameweekRow[] {
  const firstKickoff = new Map<number, number>();
  for (const f of fixtures) {
    if (f.gameweek === null) continue;
    const t = Date.parse(f.kickoff);
    const cur = firstKickoff.get(f.gameweek);
    if (cur === undefined || t < cur) firstKickoff.set(f.gameweek, t);
  }
  return [...firstKickoff.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, t]) => ({
      season,
      number,
      deadline: new Date(t - DEADLINE_OFFSET_MINUTES * 60_000).toISOString(),
    }));
}

/**
 * Oyuncunun sabit fantazi mevkisi: maçlarda en sık görüldüğü mevki.
 * `seen` kronolojik sıradadır; beraberlikte en son görülen mevki kazanır.
 */
export function pickFantasyPosition(seen: Position[]): Position | null {
  if (seen.length === 0) return null;
  const count = new Map<Position, number>();
  for (const p of seen) count.set(p, (count.get(p) ?? 0) + 1);
  const best = Math.max(...count.values());
  for (let i = seen.length - 1; i >= 0; i--) {
    if (count.get(seen[i]) === best) return seen[i];
  }
  return null;
}
