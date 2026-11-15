import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./default-rules";
import { scorePlayer, scoreSquad } from "./engine";
import type { PlayerStats } from "./types";

const base: PlayerStats = {
  position: "MID",
  minutes: 90,
  started: true,
  goals: 0,
  assists: 0,
  teamGoalsConceded: 1, // clean sheet puanı karışmasın diye takım gol yemiş
  saves: 0,
  penaltiesSaved: 0,
  penaltiesCommitted: 0,
  yellowCards: 0,
  redCards: 0,
  ownGoals: 0,
};

describe("scorePlayer", () => {
  it("did not play = 0 points", () => {
    expect(scorePlayer({ ...base, minutes: 0 }, DEFAULT_RULES)).toBe(0);
  });

  it("starter gets 1, plus 1 for playing more than 60 minutes", () => {
    expect(scorePlayer({ ...base, minutes: 30 }, DEFAULT_RULES)).toBe(1);
    expect(scorePlayer({ ...base, minutes: 60 }, DEFAULT_RULES)).toBe(1);
    expect(scorePlayer({ ...base, minutes: 61 }, DEFAULT_RULES)).toBe(2);
    expect(scorePlayer({ ...base, minutes: 90 }, DEFAULT_RULES)).toBe(2);
  });

  it("substitute gets 1 for coming on, plus 1 if he plays more than 60", () => {
    expect(scorePlayer({ ...base, started: false, minutes: 20 }, DEFAULT_RULES)).toBe(1);
    expect(scorePlayer({ ...base, started: false, minutes: 65 }, DEFAULT_RULES)).toBe(2);
  });

  it("goal points depend on position (GK 8, DEF 6, MID 5, FWD 4)", () => {
    const g = (position: PlayerStats["position"]) =>
      scorePlayer({ ...base, position, goals: 1 }, DEFAULT_RULES) - 2;
    expect(g("GK")).toBe(8);
    expect(g("DEF")).toBe(6);
    expect(g("MID")).toBe(5);
    expect(g("FWD")).toBe(4);
  });

  it("assist is 3 for every position", () => {
    for (const position of ["GK", "DEF", "MID", "FWD"] as const) {
      expect(scorePlayer({ ...base, position, assists: 1 }, DEFAULT_RULES)).toBe(2 + 3);
    }
  });

  it("clean sheet: GK and DEF get 4, only with more than 60 minutes", () => {
    const cs = { ...base, teamGoalsConceded: 0 };
    expect(scorePlayer({ ...cs, position: "DEF" }, DEFAULT_RULES)).toBe(2 + 4);
    expect(scorePlayer({ ...cs, position: "GK" }, DEFAULT_RULES)).toBe(2 + 4);
    expect(scorePlayer({ ...cs, position: "MID" }, DEFAULT_RULES)).toBe(2);
    expect(scorePlayer({ ...cs, position: "DEF", minutes: 60 }, DEFAULT_RULES)).toBe(1);
    expect(scorePlayer({ ...base, position: "DEF" }, DEFAULT_RULES)).toBe(2);
  });

  it("goalkeeper: 1 point per 2 saves, 4 for a saved penalty", () => {
    const gk = { ...base, position: "GK" as const, saves: 7, penaltiesSaved: 1 };
    expect(scorePlayer(gk, DEFAULT_RULES)).toBe(2 + 3 + 4);
  });

  it("saves only count for goalkeepers", () => {
    expect(scorePlayer({ ...base, position: "DEF", saves: 6 }, DEFAULT_RULES)).toBe(2);
  });

  it("penalty committed -1, yellow -1, own goal -2", () => {
    const s = { ...base, penaltiesCommitted: 1, yellowCards: 1, ownGoals: 1 };
    expect(scorePlayer(s, DEFAULT_RULES)).toBe(2 - 1 - 1 - 2);
  });

  it("straight red -2", () => {
    expect(scorePlayer({ ...base, redCards: 1 }, DEFAULT_RULES)).toBe(2 - 2);
  });

  it("second yellow: 2 yellows + 1 red counts only the red (-2)", () => {
    const s = { ...base, yellowCards: 2, redCards: 1 };
    expect(scorePlayer(s, DEFAULT_RULES)).toBe(2 - 2);
  });

  it("a yellow and a straight red in one match counts only the red", () => {
    const s = { ...base, yellowCards: 1, redCards: 1 };
    expect(scorePlayer(s, DEFAULT_RULES)).toBe(2 - 2);
  });

  it("a custom rule set overrides defaults", () => {
    const rules = { ...DEFAULT_RULES, assist: { all: 10 } };
    expect(scorePlayer({ ...base, assists: 1 }, rules)).toBe(2 + 10);
  });
});

describe("scoreSquad", () => {
  const mk = (id: number, points: number, minutes = 90) => ({
    playerId: id,
    points,
    played: minutes > 0,
  });

  it("sums starters and doubles the captain", () => {
    const total = scoreSquad({
      starters: [mk(1, 5), mk(2, 3)],
      bench: [mk(3, 9)],
      captainId: 1,
      viceId: 2,
    });
    expect(total).toBe(5 * 2 + 3);
  });

  it("vice captain is doubled if captain did not play", () => {
    const total = scoreSquad({
      starters: [mk(1, 0, 0), mk(2, 4)],
      bench: [],
      captainId: 1,
      viceId: 2,
    });
    expect(total).toBe(0 + 4 * 2);
  });

  it("a starter who did not play is replaced by the first bench player who did", () => {
    const total = scoreSquad({
      starters: [mk(1, 0, 0), mk(2, 3)],
      bench: [mk(3, 0, 0), mk(4, 6)],
      captainId: 2,
      viceId: 1,
    });
    expect(total).toBe(3 * 2 + 6);
  });
});
