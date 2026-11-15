import { BONUS_POINTS } from "./default-rules";

export interface RatedPlayer {
  playerId: number;
  minutes: number;
  rating: number | null;
}

/**
 * Maçın en yüksek reytingli oyuncularına bonus verir (3/2/1).
 * Beraberlikte aynı sıradakiler aynı bonusu alır, sonraki sıra atlanır (1,1,3).
 * Oynamayan ve reytingi olmayan oyuncular dikkate alınmaz.
 */
export function bonusByRating(players: RatedPlayer[]): Map<number, number> {
  const rated = players
    .filter((p) => p.minutes > 0 && p.rating !== null)
    .sort((a, b) => b.rating! - a.rating!);

  const bonus = new Map<number, number>();
  rated.forEach((p, i) => {
    const rank = i > 0 && rated[i - 1].rating === p.rating ? rankOf(rated, i) : i;
    const points = BONUS_POINTS[rank];
    if (points) bonus.set(p.playerId, points);
  });
  return bonus;
}

/** Beraberlikte, aynı reytingin ilk göründüğü sıra. */
function rankOf(sorted: RatedPlayer[], i: number): number {
  let r = i;
  while (r > 0 && sorted[r - 1].rating === sorted[i].rating) r--;
  return r;
}
