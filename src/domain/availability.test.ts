import { describe, expect, it } from "vitest";
import { isOrderable, itemAvailability } from "./availability";

const now = new Date("2026-11-06T10:30:00Z"); // 16:00 IST
const evenings = { days: [0, 1, 2, 3, 4, 5, 6], startsAt: "17:00", endsAt: "23:59" };

describe("itemAvailability", () => {
  it("is available with no row and no schedule", () => {
    expect(itemAvailability({ status: null, schedule: null, isActive: true }, now)).toEqual({ state: "available" });
  });
  it("hides archived and hidden items", () => {
    expect(itemAvailability({ status: null, schedule: null, isActive: false }, now)).toEqual({ state: "hidden" });
    expect(itemAvailability({ status: "hidden", schedule: null, isActive: true }, now)).toEqual({ state: "hidden" });
  });
  it("marks out-of-stock items", () => {
    expect(itemAvailability({ status: "out_of_stock", schedule: null, isActive: true }, now)).toEqual({ state: "out_of_stock" });
  });
  it("marks items outside their schedule with the opening time", () => {
    expect(itemAvailability({ status: "available", schedule: evenings, isActive: true }, now)).toEqual({
      state: "off_schedule",
      label: "Available from 5:00 pm",
    });
  });
});

describe("isOrderable", () => {
  it("only allows available items", () => {
    expect(isOrderable({ state: "available" })).toBe(true);
    expect(isOrderable({ state: "out_of_stock" })).toBe(false);
    expect(isOrderable({ state: "off_schedule", label: "x" })).toBe(false);
  });
});
