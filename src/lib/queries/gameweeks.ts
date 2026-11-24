import { CURRENT_SEASON } from "../season";
import type { PlayerStats, Position } from "../scoring/types";
import { createPublicClient } from "../supabase/public";

export interface GameweekSummary {
  number: number;
  deadline: string;
  fixtures: number;
  covered: number;
}

export interface FixtureResult {
  id: number;
  gameweek: number | null;
  kickoff: string;
  status: string;
  homeName: string;
  homeSlug: string;
  awayName: string;
  awaySlug: string;
  homeGoals: number | null;
  awayGoals: number | null;
  hasStats: boolean;
}

export interface GameweekPlayer {
  playerId: number;
  name: string;
  position: Position;
  teamName: string;
  teamSlug: string;
  stats: PlayerStats;
  rating: number | null;
  points: number;
  bonus: number;
}

/** Sezonun bütün haftaları, kapsama bilgisiyle. */
export async function getGameweeks(): Promise<GameweekSummary[]> {
  "use cache";
  const db = createPublicClient();
  const { data, error } = await db
    .from("gameweek_coverage")
    .select("number,deadline,fixtures,covered")
    .eq("season", CURRENT_SEASON)
    .order("number");
  if (error) throw new Error(`haftalar okunamadı: ${error.message}`);
  return data as GameweekSummary[];
}

/**
 * Oyuncu verisi tam olan en son hafta. Hiçbir hafta tam değilse null.
 * İki kolonu karşılaştırmak PostgREST'te yapılamadığı için burada süzülüyor.
 */
export async function getLastCoveredGameweek(): Promise<number | null> {
  "use cache";
  const weeks = await getGameweeks();
  const covered = weeks.filter((w) => w.fixtures > 0 && w.covered === w.fixtures);
  return covered.length > 0 ? Math.max(...covered.map((w) => w.number)) : null;
}

/** Bir haftanın maçları, ilk maçtan sona. */
export async function getFixtures(gameweek: number): Promise<FixtureResult[]> {
  "use cache";
  const db = createPublicClient();
  const { data, error } = await db
    .from("fixture_results")
    .select(
      "fixture_id,gameweek,kickoff,status,home_goals,away_goals,home_name,home_slug,away_name,away_slug,has_stats",
    )
    .eq("season", CURRENT_SEASON)
    .eq("gameweek", gameweek)
    .order("kickoff");
  if (error) throw new Error(`${gameweek}. hafta maçları okunamadı: ${error.message}`);

  interface Row {
    fixture_id: number;
    gameweek: number | null;
    kickoff: string;
    status: string;
    home_goals: number | null;
    away_goals: number | null;
    home_name: string;
    home_slug: string;
    away_name: string;
    away_slug: string;
    has_stats: boolean;
  }

  return (data as Row[]).map((r) => ({
    id: r.fixture_id,
    gameweek: r.gameweek,
    kickoff: r.kickoff,
    status: r.status,
    homeName: r.home_name,
    homeSlug: r.home_slug,
    awayName: r.away_name,
    awaySlug: r.away_slug,
    homeGoals: r.home_goals,
    awayGoals: r.away_goals,
    hasStats: r.has_stats,
  }));
}

/**
 * Bir haftanın oyuncu performansları, toplam puana (maç puanı + bonus) göre
 * azalan. Sıralama burada yapılıyor çünkü iki kolonun toplamına göre
 * sıralamak veritabanı tarafında yapılamıyor.
 */
export async function getGameweekPlayers(
  gameweek: number,
  limit?: number,
): Promise<GameweekPlayer[]> {
  "use cache";
  const db = createPublicClient();
  const { data, error } = await db
    .from("gameweek_player_points")
    .select(
      "player_id,name,position,team_name,team_slug,minutes,started,goals,assists," +
        "goals_conceded,saves,penalties_saved,penalties_missed,yellow_cards,red_cards," +
        "own_goals,rating,points,bonus_points",
    )
    .eq("season", CURRENT_SEASON)
    .eq("gameweek", gameweek);
  if (error) throw new Error(`${gameweek}. hafta oyuncuları okunamadı: ${error.message}`);

  interface Row {
    player_id: number;
    name: string;
    position: Position;
    team_name: string;
    team_slug: string;
    minutes: number;
    started: boolean;
    goals: number;
    assists: number;
    goals_conceded: number;
    saves: number;
    penalties_saved: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    own_goals: number;
    rating: string | number | null;
    points: number;
    bonus_points: number;
  }

  const players: GameweekPlayer[] = (data as unknown as Row[]).map((r) => ({
    playerId: r.player_id,
    name: r.name,
    position: r.position,
    teamName: r.team_name,
    teamSlug: r.team_slug,
    rating: r.rating === null ? null : Number(r.rating),
    points: r.points,
    bonus: r.bonus_points,
    stats: {
      position: r.position,
      minutes: r.minutes,
      started: r.started,
      goals: r.goals,
      assists: r.assists,
      teamGoalsConceded: r.goals_conceded,
      saves: r.saves,
      penaltiesSaved: r.penalties_saved,
      // Şemadaki kolon adı penalties_missed; tuttuğu veri penaltıya sebep olma.
      penaltiesCommitted: r.penalties_missed,
      yellowCards: r.yellow_cards,
      redCards: r.red_cards,
      ownGoals: r.own_goals,
    },
  }));

  players.sort((a, b) => b.points + b.bonus - (a.points + a.bonus));
  return limit === undefined ? players : players.slice(0, limit);
}
