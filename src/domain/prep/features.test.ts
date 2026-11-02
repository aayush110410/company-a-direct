import { describe, expect, it } from "vitest";
import { computeFeatures, orderWorkload } from "./features";

const familyPack = { qty: 1, basePrepMinutes: 18, prepMultiplier: 1.6 };
const meetha = { qty: 2, basePrepMinutes: 4, prepMultiplier: 1 };

describe("orderWorkload", () => {
  it("sums qty × base × multiplier", () => {
    expect(orderWorkload([familyPack, meetha])).toBeCloseTo(28.8 + 8);
  });
});

describe("computeFeatures", () => {
  const fridayDinner = new Date("2026-11-06T14:00:00Z"); // Fri 19:30 IST
  const saturdayDinner = new Date("2026-11-07T14:00:00Z"); // Sat 19:30 IST

  it("uses the slowest line as the critical item", () => {
    const f = computeFeatures({ lines: [familyPack, meetha], openOrders: [], capacitySlots: 4, at: saturdayDinner });
    expect(f.criticalItem).toBeCloseTo(28.8);
    expect(f.workload).toBeCloseTo(36.8);
    expect(f.queueLoad).toBe(0);
  });

  it("counts orders ahead per cooking slot, with orders already preparing as half", () => {
    const f = computeFeatures({
      lines: [meetha],
      openOrders: [{ status: "placed" }, { status: "placed" }, { status: "preparing" }, { status: "preparing" }],
      capacitySlots: 4,
      at: saturdayDinner,
    });
    expect(f.queueLoad).toBeCloseTo((2 + 1) / 4);
  });

  it("flags Friday and Sunday dinner as peak, not Saturday", () => {
    expect(computeFeatures({ lines: [meetha], openOrders: [], capacitySlots: 4, at: fridayDinner }).peak).toBe(1);
    expect(computeFeatures({ lines: [meetha], openOrders: [], capacitySlots: 4, at: saturdayDinner }).peak).toBe(0);
  });
});
