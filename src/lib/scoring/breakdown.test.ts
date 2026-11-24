import { describe, expect, it } from "vitest";
import { pointsBreakdown } from "./breakdown";
import { DEFAULT_RULES } from "./default-rules";
import { scorePlayer } from "./engine";
import type { PlayerStats } from "./types";

const base: PlayerStats = {
  position: "MID",
  minutes: 90,
  started: true,
  goals: 0,
  assists: 0,
  teamGoalsConceded: 1,
  saves: 0,
  penaltiesSaved: 0,
  penaltiesCommitted: 0,
  yellowCards: 0,
  redCards: 0,
  ownGoals: 0,
};

const total = (s: PlayerStats, bonus?: number) =>
  pointsBreakdown(s, DEFAULT_RULES, bonus).reduce((a, i) => a + i.points, 0);

describe("pointsBreakdown", () => {
  it("adds up to the same number as scorePlayer", () => {
    const cases: PlayerStats[] = [
      base,
      { ...base, position: "DEF", goals: 1, assists: 1, yellowCards: 1, teamGoalsConceded: 0 },
      { ...base, position: "GK", saves: 7, penaltiesSaved: 1, teamGoalsConceded: 0 },
      { ...base, position: "FWD", minutes: 20, started: false, goals: 2 },
      { ...base, penaltiesCommitted: 1, ownGoals: 1, redCards: 1 },
    ];
    for (const s of cases) {
      expect(total(s)).toBe(scorePlayer(s, DEFAULT_RULES));
    }
  });

  it("bonus is its own item and is included in the total", () => {
    const items = pointsBreakdown(base, DEFAULT_RULES, 3);
    expect(items.find((i) => i.label === "Bonus")?.points).toBe(3);
    expect(total(base, 3)).toBe(scorePlayer(base, DEFAULT_RULES) + 3);
  });

  it("no bonus item when there is no bonus", () => {
    expect(pointsBreakdown(base, DEFAULT_RULES, 0).some((i) => i.label === "Bonus")).toBe(false);
    expect(pointsBreakdown(base, DEFAULT_RULES).some((i) => i.label === "Bonus")).toBe(false);
  });

  it("second yellow shows the red item, not the yellow one", () => {
    const labels = pointsBreakdown({ ...base, yellowCards: 2, redCards: 1 }, DEFAULT_RULES).map(
      (i) => i.label,
    );
    expect(labels).toContain("Kırmızı kart");
    expect(labels).not.toContain("Sarı kart");
  });

  it("a player who did not play has an empty breakdown", () => {
    expect(pointsBreakdown({ ...base, minutes: 0 }, DEFAULT_RULES)).toEqual([]);
  });

  it("items with zero points are left out", () => {
    const items = pointsBreakdown({ ...base, position: "DEF", saves: 6 }, DEFAULT_RULES);
    expect(items.some((i) => i.label === "Kurtarış")).toBe(false);
    expect(items.every((i) => i.points !== 0)).toBe(true);
  });
});
