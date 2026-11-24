import { CURRENT_SEASON } from "../season";
import type { Position } from "../scoring/types";
import { createPublicClient } from "../supabase/public";

export interface PlayerTotal {
  id: number;
  name: string;
  position: Position;
  teamName: string;
  teamSlug: string;
  matches: number;
  goals: number;
  assists: number;
  points: number;
}

interface TotalsRow {
  player_id: number;
  name: string;
  position: Position;
  team_name: string;
  team_slug: string;
  matches: number;
  goals: number;
  assists: number;
  points: number;
}

const COLUMNS = "player_id,name,position,team_name,team_slug,matches,goals,assists,points";

function toPlayerTotal(r: TotalsRow): PlayerTotal {
  return {
    id: r.player_id,
    name: r.name,
    position: r.position,
    teamName: r.team_name,
    teamSlug: r.team_slug,
    matches: r.matches ?? 0,
    goals: r.goals ?? 0,
    assists: r.assists ?? 0,
    points: r.points ?? 0,
  };
}

/** Sezonun bütün oyuncuları, puana göre azalan. */
export async function getPlayerTotals(): Promise<PlayerTotal[]> {
  "use cache";
  const db = createPublicClient();
  const { data, error } = await db
    .from("player_season_totals")
    .select(COLUMNS)
    .eq("season", CURRENT_SEASON)
    .order("points", { ascending: false })
    .order("name");
  if (error) throw new Error(`oyuncu toplamları okunamadı: ${error.message}`);
  return (data as TotalsRow[]).map(toPlayerTotal);
}

/** Bir takımın kadrosu, puana göre azalan. */
export async function getTeamSquad(slug: string): Promise<PlayerTotal[]> {
  "use cache";
  const db = createPublicClient();
  const { data, error } = await db
    .from("player_season_totals")
    .select(COLUMNS)
    .eq("season", CURRENT_SEASON)
    .eq("team_slug", slug)
    .order("points", { ascending: false })
    .order("name");
  if (error) throw new Error(`${slug} kadrosu okunamadı: ${error.message}`);
  return (data as TotalsRow[]).map(toPlayerTotal);
}
