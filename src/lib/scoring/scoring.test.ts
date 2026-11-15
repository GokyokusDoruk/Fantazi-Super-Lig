import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./default-rules";
import { scorePlayer, scoreSquad } from "./engine";
import type { PlayerStats } from "./types";

const base: PlayerStats = {
  position: "MID",
  minutes: 90,
  goals: 0,
  assists: 0,
  goalsConceded: 1, // clean sheet puanı karışmasın diye 1 gol yemiş
  saves: 0,
  penaltiesSaved: 0,
  penaltiesMissed: 0,
  yellowCards: 0,
  redCards: 0,
  ownGoals: 0,
};

describe("scorePlayer", () => {
  it("did not play = 0 points", () => {
    expect(scorePlayer({ ...base, minutes: 0 }, DEFAULT_RULES)).toBe(0);
  });

  it("under 60 minutes gives 1 point, 60+ gives 2", () => {
    expect(scorePlayer({ ...base, minutes: 30 }, DEFAULT_RULES)).toBe(1);
    expect(scorePlayer({ ...base, minutes: 60 }, DEFAULT_RULES)).toBe(2);
  });

  it("goal points depend on position", () => {
    const g = (position: PlayerStats["position"]) =>
      scorePlayer({ ...base, position, goals: 1 }, DEFAULT_RULES) - 2;
    expect(g("GK")).toBe(6);
    expect(g("DEF")).toBe(6);
    expect(g("MID")).toBe(5);
    expect(g("FWD")).toBe(4);
  });

  it("clean sheet needs 60+ minutes and zero conceded", () => {
    const cs = { ...base, position: "DEF" as const, goalsConceded: 0 };
    expect(scorePlayer(cs, DEFAULT_RULES)).toBe(2 + 4);
    expect(scorePlayer({ ...cs, minutes: 59 }, DEFAULT_RULES)).toBe(1);
    expect(scorePlayer({ ...cs, goalsConceded: 1 }, DEFAULT_RULES)).toBe(2);
  });

  it("goalkeeper: conceded penalty applies per 2 goals, saves per 3", () => {
    const gk = { ...base, position: "GK" as const, goalsConceded: 3, saves: 7 };
    // 2 (60+) + floor(3/2) * -1 + floor(7/3) * 1
    expect(scorePlayer(gk, DEFAULT_RULES)).toBe(2 - 1 + 2);
  });

  it("cards, own goals and penalties are applied", () => {
    const s = {
      ...base,
      goalsConceded: 1,
      yellowCards: 1,
      redCards: 1,
      ownGoals: 1,
      penaltiesMissed: 1,
    };
    expect(scorePlayer(s, DEFAULT_RULES)).toBe(2 - 1 - 3 - 2 - 2);
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
