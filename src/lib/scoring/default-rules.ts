import type { RuleSet } from "./types";

/**
 * YER TUTUCU kurallar (FPL'e yakın). Gerçek kurallar belirlenince burası
 * ya da `scoring_rules` tablosu güncellenir; motor değişmez.
 */
export const DEFAULT_RULES: RuleSet = {
  minutesUnder60: { all: 1 },
  minutes60Plus: { all: 2 },
  goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
  assist: { all: 3 },
  cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
  goalsConceded: { GK: -1, DEF: -1, MID: 0, FWD: 0 },
  goalsConcededStep: 2,
  save: { GK: 1 },
  savesStep: 3,
  penaltySaved: { GK: 5 },
  penaltyMissed: { all: -2 },
  yellowCard: { all: -1 },
  redCard: { all: -3 },
  ownGoal: { all: -2 },
};
