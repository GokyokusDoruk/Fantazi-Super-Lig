import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "../scoring/default-rules";
import { scorePlayer } from "../scoring/engine";
import { mapPosition, toPlayerStats, type ApiPlayerEntry } from "./map";

// Gerçek bir API-Football yanıtından (Galatasaray kalecisi) kısaltılmış örnek.
const keeper: ApiPlayerEntry = {
  player: { id: 429, name: "Fernando Muslera" },
  statistics: [
    {
      games: { minutes: 90, position: "G", rating: "7.2", substitute: false },
      goals: { total: null, conceded: 1, assists: 0, saves: 3 },
      cards: { yellow: 0, red: 0 },
      penalty: { commited: null, saved: 0 },
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
    expect(toPlayerStats(keeper, 1)).toEqual({
      position: "GK",
      minutes: 90,
      started: true,
      goals: 0,
      assists: 0,
      teamGoalsConceded: 1,
      saves: 3,
      penaltiesSaved: 0,
      penaltiesCommitted: 0,
      yellowCards: 0,
      redCards: 0,
      ownGoals: 0,
    });
  });

  it("returns null when the position is unknown or stats are missing", () => {
    expect(toPlayerStats({ ...keeper, statistics: [] }, 0)).toBeNull();
  });

  it("fantasy position overrides the position seen in the match", () => {
    expect(toPlayerStats(keeper, 0, "DEF")?.position).toBe("DEF");
    expect(toPlayerStats(keeper, 0)?.position).toBe("GK");
  });

  it("a substitute is not a starter", () => {
    const s = keeper.statistics[0];
    const sub = { ...keeper, statistics: [{ ...s, games: { ...s.games, substitute: true } }] };
    expect(toPlayerStats(sub, 0)?.started).toBe(false);
  });

  it("reads the misspelled 'commited' field as penaltiesCommitted", () => {
    const s = keeper.statistics[0];
    const e = { ...keeper, statistics: [{ ...s, penalty: { commited: 1, saved: 0 } }] };
    expect(toPlayerStats(e, 0)?.penaltiesCommitted).toBe(1);
  });

  it("end to end: keeper, team conceded 1, 3 saves", () => {
    const stats = toPlayerStats(keeper, 1)!;
    // 1 (ilk 11) + 1 (60+) + 1 (3 kurtarış / 2); takım gol yedi, clean sheet yok
    expect(scorePlayer(stats, DEFAULT_RULES)).toBe(3);
  });
});
