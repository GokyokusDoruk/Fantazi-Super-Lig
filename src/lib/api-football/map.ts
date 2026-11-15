import type { PlayerStats, Position } from "../scoring/types";

/** `/fixtures/players` yanıtındaki tek bir oyuncu kaydı (kullandığımız alanlar). */
export interface ApiPlayerEntry {
  player: { id: number; name: string };
  statistics: Array<{
    games: { minutes: number | null; position: string | null; rating: string | null };
    goals: {
      total: number | null;
      conceded: number | null;
      assists: number | null;
      saves: number | null;
    };
    cards: { yellow: number | null; red: number | null };
    penalty: { missed: number | null; saved: number | null };
  }>;
}

const POSITIONS: Record<string, Position> = { G: "GK", D: "DEF", M: "MID", F: "FWD" };

export function mapPosition(code: string | null | undefined): Position | null {
  return code ? (POSITIONS[code] ?? null) : null;
}

/**
 * API oyuncu kaydını motorun girdisine çevirir. Oynamadıysa null döner.
 * Kendi kalesine gol bu endpoint'te yok; `fixtures/events`'ten gelmeli (şimdilik 0).
 */
export function toPlayerStats(entry: ApiPlayerEntry): PlayerStats | null {
  const s = entry.statistics[0];
  const position = mapPosition(s?.games.position);
  if (!s || !position) return null;
  return {
    position,
    minutes: s.games.minutes ?? 0,
    goals: s.goals.total ?? 0,
    assists: s.goals.assists ?? 0,
    goalsConceded: s.goals.conceded ?? 0,
    saves: s.goals.saves ?? 0,
    penaltiesSaved: s.penalty.saved ?? 0,
    penaltiesMissed: s.penalty.missed ?? 0,
    yellowCards: s.cards.yellow ?? 0,
    redCards: s.cards.red ?? 0,
    ownGoals: 0,
  };
}
