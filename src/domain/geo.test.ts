import { describe, expect, it } from "vitest";
import { haversineKm, matchOutlet, type OutletGeo, travelMinutes } from "./geo";

const outlets: OutletGeo[] = [
  { id: "kondapur", lat: 17.47, lng: 78.357, radiusKm: 5, isAcceptingOrders: true },
  { id: "madhapur", lat: 17.4483, lng: 78.3915, radiusKm: 5, isAcceptingOrders: true },
  { id: "charminar", lat: 17.3616, lng: 78.4747, radiusKm: 5, isAcceptingOrders: true },
];

describe("haversineKm", () => {
  it("measures known distances", () => {
    expect(haversineKm({ lat: 17.47, lng: 78.357 }, { lat: 17.47, lng: 78.357 })).toBe(0);
    // Kondapur ↔ Madhapur is roughly 4.4 km
    expect(haversineKm(outlets[0]!, outlets[1]!)).toBeCloseTo(4.36, 1);
  });
});

describe("travelMinutes", () => {
  it("is 4 min/km plus 6 min handling", () => {
    expect(travelMinutes(2.5)).toBe(16);
  });
  it("caps at 45 minutes", () => {
    expect(travelMinutes(20)).toBe(45);
  });
});

describe("matchOutlet", () => {
  it("picks the nearest outlet whose radius covers the customer", () => {
    expect(matchOutlet({ lat: 17.47, lng: 78.357 }, outlets)).toEqual({ kind: "match", outletId: "kondapur", distanceKm: 0 });
  });

  it("returns the nearest outlet when nobody delivers there", () => {
    const shamshabad = { lat: 17.2403, lng: 78.4294 };
    const r = matchOutlet(shamshabad, outlets);
    expect(r.kind).toBe("out_of_range");
    expect(r).toMatchObject({ nearestOutletId: "charminar" });
  });

  it("skips outlets that are not accepting orders", () => {
    const closed = outlets.map((o) => (o.id === "kondapur" ? { ...o, isAcceptingOrders: false } : o));
    expect(matchOutlet({ lat: 17.47, lng: 78.357 }, closed)).toMatchObject({ kind: "match", outletId: "madhapur" });
  });

  it("returns none when no outlet is accepting orders", () => {
    expect(matchOutlet({ lat: 17.47, lng: 78.357 }, outlets.map((o) => ({ ...o, isAcceptingOrders: false })))).toEqual({
      kind: "none",
    });
  });
});
