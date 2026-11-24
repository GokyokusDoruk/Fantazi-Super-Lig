import { rulePoints } from "./engine";
import type { PlayerStats, RuleSet } from "./types";

export interface BreakdownItem {
  label: string;
  points: number;
}

/**
 * Oyuncunun maç puanının kalem kalem dökümü. Toplamı
 * `scorePlayer(s, r) + bonus` eder; puanı sıfır olan kalem listeye girmez.
 *
 * Kart mantığı engine.ts ile aynı: kırmızı kart varsa sarılar ayrıca
 * cezalandırılmaz, atılma tek kırmızı olarak sayılır.
 */
export function pointsBreakdown(s: PlayerStats, r: RuleSet, bonus = 0): BreakdownItem[] {
  if (s.minutes <= 0) return [];

  const p = s.position;
  const items: BreakdownItem[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) items.push({ label, points });
  };
  const longPlay = s.minutes >= r.longPlayMinutes;

  add(s.started ? "İlk 11" : "Yedekten", rulePoints(s.started ? r.started : r.subAppearance, p));
  if (longPlay) add(`${r.longPlayMinutes - 1}+ dakika`, rulePoints(r.longPlay, p));
  if (longPlay && s.teamGoalsConceded === 0) add("Clean sheet", rulePoints(r.cleanSheet, p));
  add("Gol", s.goals * rulePoints(r.goal, p));
  add("Asist", s.assists * rulePoints(r.assist, p));
  add("Kurtarış", Math.floor(s.saves / r.savesStep) * rulePoints(r.save, p));
  add("Penaltı kurtardı", s.penaltiesSaved * rulePoints(r.penaltySaved, p));
  add("Penaltıya sebep", s.penaltiesCommitted * rulePoints(r.penaltyCommitted, p));
  if (s.redCards > 0) {
    add("Kırmızı kart", s.redCards * rulePoints(r.redCard, p));
  } else {
    add("Sarı kart", s.yellowCards * rulePoints(r.yellowCard, p));
  }
  add("Kendi kalesine", s.ownGoals * rulePoints(r.ownGoal, p));
  add("Bonus", bonus);

  return items;
}
