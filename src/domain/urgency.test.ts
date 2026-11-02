import { describe, expect, it } from "vitest";
import { customerStatusLabel, kitchenUrgency, minutesLate, shouldRaiseLateAlert } from "./urgency";

const at = (hhmm: string) => new Date(`2026-11-06T${hhmm}:00+05:30`);
const sec = (d: Date, s: number) => new Date(d.getTime() + s * 1000);

describe("kitchenUrgency", () => {
  const readyBy = at("20:47");
  it("is on time with more than 5 minutes left", () => {
    expect(kitchenUrgency({ status: "preparing", readyBy }, sec(readyBy, -301))).toBe("on_time");
  });
  it("is at risk within 5 minutes", () => {
    expect(kitchenUrgency({ status: "preparing", readyBy }, sec(readyBy, -300))).toBe("at_risk");
  });
  it("is late once ready-by passes", () => {
    expect(kitchenUrgency({ status: "placed", readyBy }, sec(readyBy, 1))).toBe("late");
  });
  it("stops counting once food is ready", () => {
    expect(kitchenUrgency({ status: "ready", readyBy }, sec(readyBy, 600))).toBe("on_time");
  });
});

describe("lateness for customers (sample WEB-778146)", () => {
  const promisedAt = at("21:16");
  it("counts whole minutes late", () => {
    expect(minutesLate(promisedAt, at("21:20"))).toBe(4);
    expect(minutesLate(promisedAt, at("21:10"))).toBe(0);
  });
  it("labels the order as late", () => {
    expect(customerStatusLabel({ status: "preparing", promisedAt, revisedEta: null }, at("21:20"))).toBe("Late by 4 minutes");
  });
  it("adds the revised estimate when there is one", () => {
    expect(customerStatusLabel({ status: "preparing", promisedAt, revisedEta: at("21:31") }, at("21:27"))).toBe(
      "Late by 11 minutes · New estimate 9:31 pm",
    );
  });
  it("shows the promise while on time and nothing late once delivered", () => {
    expect(customerStatusLabel({ status: "preparing", promisedAt, revisedEta: null }, at("21:00"))).toBe("Arrives by 9:16 pm");
    expect(customerStatusLabel({ status: "delivered", promisedAt, revisedEta: null }, at("21:30"))).toBe("Delivered");
  });
});

describe("shouldRaiseLateAlert", () => {
  const promisedAt = at("21:16");
  const base = { status: "preparing" as const, promisedAt, lateAlertedAt: null };
  it("waits until more than 10 minutes past the promise", () => {
    expect(shouldRaiseLateAlert(base, sec(promisedAt, 600))).toBe(false);
    expect(shouldRaiseLateAlert(base, sec(promisedAt, 601))).toBe(true);
  });
  it("fires once only", () => {
    expect(shouldRaiseLateAlert({ ...base, lateAlertedAt: at("21:27") }, at("21:40"))).toBe(false);
  });
  it("ignores finished orders", () => {
    expect(shouldRaiseLateAlert({ ...base, status: "delivered" }, at("21:40"))).toBe(false);
    expect(shouldRaiseLateAlert({ ...base, status: "cancelled" }, at("21:40"))).toBe(false);
  });
});
