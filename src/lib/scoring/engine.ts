import type {
  PlayerStats,
  Position,
  RulePoints,
  RuleSet,
  SquadInput,
  SquadPlayerResult,
} from "./types";

/** Bir kuralın o mevkideki puanı: mevki anahtarı varsa o, yoksa `all`. */
export function rulePoints(rule: RulePoints, position: Position): number {
  return rule[position] ?? rule.all ?? 0;
}

const pts = rulePoints;

/** Tek oyuncunun tek maçtaki puanı (bonus hariç). */
export function scorePlayer(s: PlayerStats, r: RuleSet): number {
  if (s.minutes <= 0) return 0;
  const p = s.position;
  const longPlay = s.minutes >= r.longPlayMinutes;

  let total = pts(s.started ? r.started : r.subAppearance, p);
  if (longPlay) total += pts(r.longPlay, p);
  if (longPlay && s.teamGoalsConceded === 0) total += pts(r.cleanSheet, p);
  total += s.goals * pts(r.goal, p);
  total += s.assists * pts(r.assist, p);
  total += Math.floor(s.saves / r.savesStep) * pts(r.save, p);
  total += s.penaltiesSaved * pts(r.penaltySaved, p);
  total += s.penaltiesCommitted * pts(r.penaltyCommitted, p);
  // İkinci sarıyla atılan oyuncu API'de "2 sarı + 1 kırmızı" görünür; sarılar
  // ayrıca cezalandırılmaz, atılma tek kırmızı olarak sayılır.
  if (s.redCards > 0) {
    total += s.redCards * pts(r.redCard, p);
  } else {
    total += s.yellowCards * pts(r.yellowCard, p);
  }
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
