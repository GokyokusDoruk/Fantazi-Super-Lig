import type { PlayerStats, Position } from "../scoring/types";

/** `/fixtures/players` yanıtındaki tek bir oyuncu kaydı (kullandığımız alanlar). */
export interface ApiPlayerEntry {
  player: { id: number; name: string };
  statistics: Array<{
    games: {
      minutes: number | null;
      position: string | null;
      rating: string | null;
      substitute: boolean;
    };
    goals: {
      total: number | null;
      conceded: number | null;
      assists: number | null;
      saves: number | null;
    };
    cards: { yellow: number | null; red: number | null };
    // API alan adı "commited" şeklinde (yazım hatası API'de).
    penalty: { commited: number | null; saved: number | null };
  }>;
}

const POSITIONS: Record<string, Position> = { G: "GK", D: "DEF", M: "MID", F: "FWD" };

export function mapPosition(code: string | null | undefined): Position | null {
  return code ? (POSITIONS[code] ?? null) : null;
}

/**
 * API oyuncu kaydını motorun girdisine çevirir; pozisyonu bilinmiyorsa null.
 * `teamGoalsConceded` maç skorundan gelir (oyuncu alanı kaleci dışında 0 geliyor).
 * Kendi kalesine gol bu endpoint'te yok; `fixtures/events`'ten gelmeli (şimdilik 0).
 */
export function toPlayerStats(
  entry: ApiPlayerEntry,
  teamGoalsConceded: number,
): PlayerStats | null {
  const s = entry.statistics[0];
  const position = mapPosition(s?.games.position);
  if (!s || !position) return null;
  return {
    position,
    minutes: s.games.minutes ?? 0,
    started: !s.games.substitute,
    goals: s.goals.total ?? 0,
    assists: s.goals.assists ?? 0,
    teamGoalsConceded,
    saves: s.goals.saves ?? 0,
    penaltiesSaved: s.penalty.saved ?? 0,
    penaltiesCommitted: s.penalty.commited ?? 0,
    yellowCards: s.cards.yellow ?? 0,
    redCards: s.cards.red ?? 0,
    ownGoals: 0,
  };
}
