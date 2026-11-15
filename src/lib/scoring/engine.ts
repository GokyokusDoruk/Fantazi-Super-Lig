import type {
  PlayerStats,
  Position,
  RulePoints,
  RuleSet,
  SquadInput,
  SquadPlayerResult,
} from "./types";

function pts(rule: RulePoints, position: Position): number {
  return rule[position] ?? rule.all ?? 0;
}

/** Tek oyuncunun tek maçtaki puanı. */
export function scorePlayer(s: PlayerStats, r: RuleSet): number {
  if (s.minutes <= 0) return 0;
  const p = s.position;
  const played60 = s.minutes >= 60;

  let total = pts(played60 ? r.minutes60Plus : r.minutesUnder60, p);
  total += s.goals * pts(r.goal, p);
  total += s.assists * pts(r.assist, p);
  if (played60 && s.goalsConceded === 0) total += pts(r.cleanSheet, p);
  total += Math.floor(s.goalsConceded / r.goalsConcededStep) * pts(r.goalsConceded, p);
  total += Math.floor(s.saves / r.savesStep) * pts(r.save, p);
  total += s.penaltiesSaved * pts(r.penaltySaved, p);
  total += s.penaltiesMissed * pts(r.penaltyMissed, p);
  total += s.yellowCards * pts(r.yellowCard, p);
  total += s.redCards * pts(r.redCard, p);
  total += s.ownGoals * pts(r.ownGoal, p);
  return total;
}

/**
 * Kullanıcı kadrosunun haftalık puanı: oynamayan ilk 11 oyuncusu yedekten
 * değişir, kaptan çift puan alır, kaptan oynamadıysa yardımcı kaptan alır.
 * Not: mevki/formasyon kısıtı henüz uygulanmıyor (ilk sürüm).
 */
export function scoreSquad(input: SquadInput): number {
  const bench = [...input.bench];
  const active: SquadPlayerResult[] = [];

  for (const starter of input.starters) {
    if (starter.played) {
      active.push(starter);
      continue;
    }
    const idx = bench.findIndex((b) => b.played);
    if (idx !== -1) active.push(...bench.splice(idx, 1));
  }

  const all = [...input.starters, ...input.bench];
  const captain = all.find((p) => p.playerId === input.captainId);
  const multiplied = captain?.played ? input.captainId : input.viceId;

  return active.reduce(
    (sum, p) => sum + (p.playerId === multiplied ? p.points * 2 : p.points),
    0,
  );
}
