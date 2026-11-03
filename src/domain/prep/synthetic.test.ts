import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import { generateHistory } from "./synthetic";

const input = {
  outlets: [{ id: "a", capacitySlots: 4 }],
  menu: [{ basePrepMinutes: 18, prepMultipliers: [1, 1.6] }],
  days: 7,
  seed: 7,
  endAt: new Date("2026-11-01T00:00:00Z"),
};

describe("mulberry32", () => {
  it("is reproducible and in [0, 1)", () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe("generateHistory", () => {
  it("is deterministic for a seed", () => {
    expect(generateHistory(input)).toEqual(generateHistory(input));
  });
  it("keeps the simulated kitchen stable: a realistic queue at dinner", () => {
    const s = generateHistory({ ...input, days: 21 });
    const loads = s.map((x) => x.features.queueLoad).sort((a, b) => a - b);
    expect(loads[Math.floor(loads.length * 0.95)]).toBeLessThan(6);
  });

  it("produces 60–140 orders a day per outlet, never faster than 8 minutes", () => {
    const s = generateHistory(input);
    expect(s.length).toBeGreaterThanOrEqual(7 * 60);
    expect(s.length).toBeLessThanOrEqual(7 * 140 * 1.8);
    expect(s.every((x) => x.actualMinutes >= 8 && x.outletId === "a")).toBe(true);
  });
});
