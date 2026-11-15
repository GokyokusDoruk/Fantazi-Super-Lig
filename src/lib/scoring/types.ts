export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface PlayerStats {
  position: Position;
  minutes: number;
  /** Maçı ilk 11'de başladı mı (yedekten girmediyse true). */
  started: boolean;
  /** Penaltı golleri dahil. */
  goals: number;
  assists: number;
  /**
   * Oyuncunun takımının o maçta yediği gol. Oyuncu bazlı "yenilen gol" alanı
   * kaleci dışında 0 geldiği için clean sheet buradan hesaplanır.
   */
  teamGoalsConceded: number;
  saves: number;
  penaltiesSaved: number;
  /** Penaltıya sebep olma (faul). */
  penaltiesCommitted: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
}

/** Bir kuralın puanı: `all` tüm mevkiler için, mevki anahtarı ise o mevkiyi ezer. */
export type RulePoints = Partial<Record<Position | "all", number>>;

export interface RuleSet {
  /** İlk 11'de başlayan oyuncu. */
  started: RulePoints;
  /** Yedekten oyuna giren oyuncu. */
  subAppearance: RulePoints;
  /** `longPlayMinutes` ve üzeri oynayan oyuncu. */
  longPlay: RulePoints;
  longPlayMinutes: number;
  goal: RulePoints;
  assist: RulePoints;
  /** longPlayMinutes+ oynayıp takım gol yemediyse. */
  cleanSheet: RulePoints;
  /** Her `savesStep` kurtarış için bir kez. */
  save: RulePoints;
  savesStep: number;
  penaltySaved: RulePoints;
  penaltyCommitted: RulePoints;
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
