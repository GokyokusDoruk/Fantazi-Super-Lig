import { describe, expect, it } from "vitest";
import {
  nextAvailableTransfers,
  transferPenalty,
  validateLineup,
  validateSquad,
  type SquadMember,
} from "./game-rules";

function squad(overrides: Partial<SquadMember>[] = []): SquadMember[] {
  const pos = [
    ...Array(2).fill("GK"),
    ...Array(5).fill("DEF"),
    ...Array(5).fill("MID"),
    ...Array(3).fill("FWD"),
  ] as SquadMember["position"][];
  // 15 oyuncu, 5 kulüp x 3, her biri 6.0M (toplam 90M)
  return pos.map((position, i) => ({
    position,
    teamId: Math.floor(i / 3),
    price: 6,
    ...overrides[i],
  }));
}

describe("validateSquad", () => {
  it("accepts a valid squad", () => {
    expect(validateSquad(squad())).toEqual([]);
  });

  it("rejects wrong size", () => {
    expect(validateSquad(squad().slice(0, 14)).length).toBeGreaterThan(0);
  });

  it("rejects going over budget", () => {
    const errors = validateSquad(squad([{ price: 20 }])); // 104M
    expect(errors.some((e) => e.includes("Bütçe"))).toBe(true);
  });

  it("rejects more than 3 players from one club", () => {
    const four = squad([{ teamId: 0 }, { teamId: 0 }, { teamId: 0 }, { teamId: 0 }]);
    expect(validateSquad(four).some((e) => e.includes("Aynı kulüp"))).toBe(true);
  });

  it("rejects wrong position counts", () => {
    const s = squad([{ position: "FWD" }]); // 1 GK, 4 FWD
    expect(validateSquad(s).length).toBeGreaterThanOrEqual(2);
  });
});

describe("validateLineup", () => {
  const xi = (g: number, d: number, m: number, f: number) =>
    [
      ...Array(g).fill({ position: "GK" }),
      ...Array(d).fill({ position: "DEF" }),
      ...Array(m).fill({ position: "MID" }),
      ...Array(f).fill({ position: "FWD" }),
    ] as { position: SquadMember["position"] }[];

  it("accepts 4-4-2 and 3-4-3, rejects 2-5-3 and 2 keepers", () => {
    expect(validateLineup(xi(1, 4, 4, 2))).toEqual([]);
    expect(validateLineup(xi(1, 3, 4, 3))).toEqual([]);
    expect(validateLineup(xi(1, 2, 5, 3))).not.toEqual([]);
    expect(validateLineup(xi(2, 3, 4, 2))).not.toEqual([]);
  });
});

describe("transfers", () => {
  it("no penalty within the free allowance", () => {
    expect(transferPenalty(2, 2)).toBe(0);
    expect(transferPenalty(5, 4)).toBe(0);
  });

  it("each transfer above the allowance costs 3 points", () => {
    expect(transferPenalty(2, 3)).toBe(3);
    expect(transferPenalty(2, 5)).toBe(9);
  });

  it("unused transfers roll over, capped at 5", () => {
    expect(nextAvailableTransfers(2, 2)).toBe(2); // hepsi kullanıldı -> +2
    expect(nextAvailableTransfers(2, 0)).toBe(4); // 2 artan + 2
    expect(nextAvailableTransfers(4, 0)).toBe(5); // 4 + 2 = 6 -> 5 sınırı
    expect(nextAvailableTransfers(2, 5)).toBe(2); // aşıldı -> 0 artan + 2
  });
});
