export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface PlayerStats {
  position: Position;
  minutes: number;
  goals: number;
  assists: number;
  goalsConceded: number;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
}

/** Bir kuralın puanı: `all` tüm mevkiler için, mevki anahtarı ise o mevkiyi ezer. */
export type RulePoints = Partial<Record<Position | "all", number>>;

export interface RuleSet {
  minutesUnder60: RulePoints;
  minutes60Plus: RulePoints;
  goal: RulePoints;
  assist: RulePoints;
  cleanSheet: RulePoints;
  /** Her `goalsConcededStep` yenen gol için uygulanır. */
  goalsConceded: RulePoints;
  goalsConcededStep: number;
  /** Her `savesStep` kurtarış için uygulanır. */
  save: RulePoints;
  savesStep: number;
  penaltySaved: RulePoints;
  penaltyMissed: RulePoints;
  yellowCard: RulePoints;
  redCard: RulePoints;
  ownGoal: RulePoints;
}

export interface SquadPlayerResult {
  playerId: number;
  points: number;
  played: boolean;
}

export interface SquadInput {
  /** İlk 11, sıralı. */
  starters: SquadPlayerResult[];
  /** Yedekler, otomatik değişiklik sırasıyla. */
  bench: SquadPlayerResult[];
  captainId: number;
  viceId: number;
}
