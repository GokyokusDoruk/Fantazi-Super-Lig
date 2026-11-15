import type { RuleSet } from "./types";

/** Projenin puan kuralları. Değişiklik gerekirse yalnızca burası güncellenir. */
export const DEFAULT_RULES: RuleSet = {
  started: { all: 1 },
  subAppearance: { all: 1 },
  longPlay: { all: 1 },
  longPlayMinutes: 61, // "60 dakikadan fazla"
  goal: { GK: 8, DEF: 6, MID: 5, FWD: 4 },
  assist: { all: 3 },
  cleanSheet: { GK: 4, DEF: 4 },
  save: { GK: 1 },
  savesStep: 2,
  penaltySaved: { GK: 4 },
  penaltyCommitted: { all: -1 },
  yellowCard: { all: -1 },
  redCard: { all: -2 },
  ownGoal: { all: -2 },
};

/** Maç bonusu: reytinge göre en iyi 3 oyuncu (sırasıyla). */
export const BONUS_POINTS = [3, 2, 1] as const;
