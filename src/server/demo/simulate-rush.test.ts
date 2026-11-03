import { describe, expect, it } from "vitest";
import type { PaidOrderRow } from "./insert-paid-order";
import { type RushDeps, simulateRushCore } from "./simulate-rush";

const now = new Date("2026-11-06T14:00:00Z"); // Friday 19:30 IST

function deps(): RushDeps & { inserted: PaidOrderRow[] } {
  const inserted: PaidOrderRow[] = [];
  const open: { status: "placed" | "preparing" }[] = [];
  return {
    inserted,
    loadCatalog: async () => ({
      outlet: { id: "o1", slug: "kondapur", cityId: "c", lat: 17.47, lng: 78.357, capacitySlots: 4, minPromiseMinutes: 35 },
      lines: [
        {
          itemId: "i1",
          itemSlug: "chicken-dum-biryani",
          portionId: "p1",
          name: "Chicken dum biryani",
          portionName: "Single",
          pricePaise: 34000,
          basePrepMinutes: 18,
          prepMultiplier: 1,
        },
      ],
    }),
    loadOpenOrders: async () => [...open],
    loadActiveModel: async () => null,
    demoCustomerId: async () => "cust-1",
    insertPaidOrder: async (row) => {
      inserted.push(row);
      open.push({ status: "placed" });
      return `WEB-${778300 + inserted.length}`;
    },
  };
}

describe("simulateRushCore", () => {
  it("creates the requested number of paid orders", async () => {
    const d = deps();
    const r = await simulateRushCore({ outletId: "o1", count: 8, now, seed: 1 }, d);
    expect(r.orderIds).toHaveLength(8);
    expect(d.inserted.every((o) => o.order.status === "placed")).toBe(true);
  });

  it("never promises sooner than the outlet minimum", async () => {
    const r = await simulateRushCore({ outletId: "o1", count: 8, now, seed: 2 }, deps());
    expect(r.promiseMinutes.every((m) => m >= 35)).toBe(true);
  });

  it("quotes the same reference dish before and after, so the load effect is fair", async () => {
    const r = await simulateRushCore({ outletId: "o1", count: 10, now, seed: 4 }, deps());
    expect(r.reference.name).toBe("Chicken dum biryani");
    expect(r.reference.afterMinutes).toBeGreaterThan(r.reference.beforeMinutes);
  });

  it("quotes longer kitchen time as the queue fills, for the same dish", async () => {
    const r = await simulateRushCore({ outletId: "o1", count: 10, now, seed: 3 }, deps());
    for (let i = 1; i < r.prepMinutes.length; i++) expect(r.prepMinutes[i]).toBeGreaterThanOrEqual(r.prepMinutes[i - 1]!);
    expect(r.prepMinutes.at(-1)).toBeGreaterThan(r.prepMinutes[0]!);
  });
});
