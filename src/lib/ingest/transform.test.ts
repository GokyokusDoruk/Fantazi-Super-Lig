import { describe, expect, it } from "vitest";
import {
  bonusForStats,
  buildFixtures,
  buildGameweeks,
  buildTeams,
  mapFixtureStatus,
  pickFantasyPosition,
  roundToGameweek,
  type ApiFixture,
} from "./transform";

const fx = (id: number, round: string, date: string, short = "FT"): ApiFixture => ({
  fixture: { id, date, status: { short } },
  league: { round },
  teams: { home: { id: 1 }, away: { id: 2 } },
  goals: { home: 2, away: 1 },
});

describe("roundToGameweek", () => {
  it("reads the trailing number", () => {
    expect(roundToGameweek("Regular Season - 1")).toBe(1);
    expect(roundToGameweek("Regular Season - 38")).toBe(38);
  });
  it("returns null when there is no number", () => {
    expect(roundToGameweek("Quarter-finals")).toBeNull();
  });
});

describe("mapFixtureStatus", () => {
  it("maps API codes", () => {
    expect(mapFixtureStatus("FT")).toBe("finished");
    expect(mapFixtureStatus("PEN")).toBe("finished");
    expect(mapFixtureStatus("PST")).toBe("postponed");
    expect(mapFixtureStatus("CANC")).toBe("postponed");
    expect(mapFixtureStatus("2H")).toBe("live");
    expect(mapFixtureStatus("NS")).toBe("scheduled");
  });
});

describe("buildTeams", () => {
  it("uses the code as short name, falls back to the name", () => {
    const rows = buildTeams([
      { team: { id: 549, name: "Beşiktaş", code: "BES" } },
      { team: { id: 9, name: "Rizespor", code: null } },
    ]);
    expect(rows).toEqual([
      { api_id: 549, name: "Beşiktaş", short_name: "BES" },
      { api_id: 9, name: "Rizespor", short_name: "RIZ" },
    ]);
  });
});

describe("buildFixtures / buildGameweeks", () => {
  const fixtures = buildFixtures([
    fx(1, "Regular Season - 1", "2024-08-09T18:00:00+00:00"),
    fx(2, "Regular Season - 1", "2024-08-10T16:00:00+00:00"),
    fx(3, "Regular Season - 2", "2024-08-17T16:00:00+00:00", "PST"),
  ]);

  it("builds fixture rows", () => {
    expect(fixtures[0]).toEqual({
      api_id: 1,
      gameweek: 1,
      home_api_id: 1,
      away_api_id: 2,
      kickoff: "2024-08-09T18:00:00.000Z",
      status: "finished",
      home_goals: 2,
      away_goals: 1,
    });
    expect(fixtures[2].status).toBe("postponed");
  });

  it("deadline is 90 minutes before the first kickoff of the week", () => {
    const gws = buildGameweeks(2024, fixtures);
    expect(gws).toEqual([
      { season: 2024, number: 1, deadline: "2024-08-09T16:30:00.000Z" },
      { season: 2024, number: 2, deadline: "2024-08-17T14:30:00.000Z" },
    ]);
  });
});

describe("pickFantasyPosition", () => {
  it("picks the most frequent position", () => {
    expect(pickFantasyPosition(["MID", "FWD", "MID", "MID", "FWD"])).toBe("MID");
  });
  it("on a tie, the most recently seen position wins", () => {
    expect(pickFantasyPosition(["DEF", "MID", "MID", "DEF"])).toBe("DEF");
    expect(pickFantasyPosition(["DEF", "DEF", "MID", "MID"])).toBe("MID");
  });
  it("returns null for no matches", () => {
    expect(pickFantasyPosition([])).toBeNull();
  });
});

describe("bonusForStats", () => {
  const row = (fixture: number, player: number, minutes: number, rating: number | null) => ({
    fixture_api_id: fixture,
    player_api_id: player,
    minutes,
    rating,
  });

  it("gives 3/2/1 to the best three of each match, matches do not mix", () => {
    const stats = [
      row(1, 10, 90, 8.5),
      row(1, 11, 90, 7.9),
      row(1, 12, 90, 7.1),
      row(1, 13, 90, 6.0),
      row(2, 20, 90, 6.2),
      row(2, 21, 90, 9.1),
    ];
    expect(bonusForStats(stats)).toEqual([3, 2, 1, 0, 2, 3]);
  });

  it("a player who did not play or has no rating gets no bonus", () => {
    const stats = [row(1, 10, 0, 9.9), row(1, 11, 90, null), row(1, 12, 90, 7.0)];
    expect(bonusForStats(stats)).toEqual([0, 0, 3]);
  });
});
