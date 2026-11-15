import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "../scoring/default-rules";
import { scorePlayer } from "../scoring/engine";
import { mapPosition, toPlayerStats, type ApiPlayerEntry } from "./map";

// Gerçek bir API-Football yanıtından (Galatasaray kalecisi) kısaltılmış örnek.
const keeper: ApiPlayerEntry = {
  player: { id: 429, name: "Fernando Muslera" },
  statistics: [
    {
      games: { minutes: 90, position: "G", rating: "7.2" },
      goals: { total: null, conceded: 1, assists: 0, saves: 3 },
      cards: { yellow: 0, red: 0 },
      penalty: { missed: 0, saved: 0 },
    },
  ],
};

describe("api-football map", () => {
  it("maps position codes", () => {
    expect(mapPosition("G")).toBe("GK");
    expect(mapPosition("D")).toBe("DEF");
    expect(mapPosition("M")).toBe("MID");
    expect(mapPosition("F")).toBe("FWD");
    expect(mapPosition(null)).toBeNull();
    expect(mapPosition("X")).toBeNull();
  });

  it("turns nulls into zeros", () => {
    expect(toPlayerStats(keeper)).toEqual({
      position: "GK",
      minutes: 90,
      goals: 0,
      assists: 0,
      goalsConceded: 1,
      saves: 3,
      penaltiesSaved: 0,
      penaltiesMissed: 0,
      yellowCards: 0,
      redCards: 0,
      ownGoals: 0,
    });
  });

  it("returns null when the position is unknown or stats are missing", () => {
    expect(toPlayerStats({ ...keeper, statistics: [] })).toBeNull();
  });

  it("end to end: keeper with 1 conceded and 3 saves", () => {
    const stats = toPlayerStats(keeper)!;
    // 2 (60+) + 0 (yenilen 1 gol, adım 2) + 1 (3 kurtarış)
    expect(scorePlayer(stats, DEFAULT_RULES)).toBe(3);
  });
});
