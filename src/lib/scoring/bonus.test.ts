import { describe, expect, it } from "vitest";
import { bonusByRating } from "./bonus";

const p = (playerId: number, rating: number | null, minutes = 90) => ({
  playerId,
  rating,
  minutes,
});

describe("bonusByRating", () => {
  it("gives 3/2/1 to the top three ratings", () => {
    const b = bonusByRating([p(1, 6.5), p(2, 8.1), p(3, 7.4), p(4, 7.0)]);
    expect(b.get(2)).toBe(3);
    expect(b.get(3)).toBe(2);
    expect(b.get(4)).toBe(1);
    expect(b.has(1)).toBe(false);
  });

  it("ties share the same bonus and the next rank is skipped", () => {
    const b = bonusByRating([p(1, 8.0), p(2, 8.0), p(3, 7.0), p(4, 6.0)]);
    expect(b.get(1)).toBe(3);
    expect(b.get(2)).toBe(3);
    expect(b.get(3)).toBe(1);
    expect(b.has(4)).toBe(false);
  });

  it("ignores players who did not play or have no rating", () => {
    const b = bonusByRating([p(1, 9.0, 0), p(2, null), p(3, 6.0)]);
    expect([...b.keys()]).toEqual([3]);
    expect(b.get(3)).toBe(3);
  });
});
