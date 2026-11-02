import { describe, expect, it } from "vitest";
import type { PrepEstimate } from "./model";
import { applyOverride, computePromise } from "./promise";

const at = new Date("2026-11-06T14:44:00Z"); // 20:14 IST
const est = (p80Minutes: number): PrepEstimate => ({
  predictedMinutes: p80Minutes - 5,
  p80Minutes,
  confidence: "normal",
  source: "model",
  modelVersion: "v1",
});
const plus = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);

describe("computePromise", () => {
  it("promises the pessimistic prep plus travel when that exceeds the outlet minimum", () => {
    const p = computePromise({ estimate: est(30), travelMinutes: 12, outletMinPromiseMinutes: 35, at });
    expect(p).toEqual({ promiseMinutes: 42, promisedAt: plus(at, 42), readyBy: plus(at, 30), source: "model" });
  });

  it("never promises sooner than the outlet minimum", () => {
    const p = computePromise({ estimate: est(15), travelMinutes: 10, outletMinPromiseMinutes: 35, at });
    expect(p.promiseMinutes).toBe(35);
    expect(p.source).toBe("outlet_minimum");
    expect(p.readyBy).toEqual(plus(at, 25));
  });

  it("keeps the fallback source when the fallback estimate wins", () => {
    const p = computePromise({ estimate: { ...est(40), source: "fallback" }, travelMinutes: 10, outletMinPromiseMinutes: 35, at });
    expect(p.source).toBe("fallback");
  });
});

describe("applyOverride", () => {
  const promisedAt = plus(at, 45);
  it("moves the promise and ready-by together", () => {
    expect(applyOverride({ promisedAt, travelMinutes: 12, now: at, deltaMinutes: 10 })).toEqual({
      ok: true,
      promisedAt: plus(at, 55),
      readyBy: plus(at, 43),
    });
  });
  it("refuses pushes beyond an hour or two hours from now", () => {
    expect(applyOverride({ promisedAt, travelMinutes: 12, now: at, deltaMinutes: 90 })).toEqual({ ok: false, error: "too_far" });
    expect(applyOverride({ promisedAt: plus(at, 100), travelMinutes: 12, now: at, deltaMinutes: 30 })).toEqual({
      ok: false,
      error: "too_far",
    });
  });
  it("refuses a promise in the past", () => {
    expect(applyOverride({ promisedAt, travelMinutes: 12, now: at, deltaMinutes: -60 })).toEqual({ ok: false, error: "too_far" });
    expect(applyOverride({ promisedAt: plus(at, 20), travelMinutes: 12, now: at, deltaMinutes: -25 })).toEqual({
      ok: false,
      error: "in_past",
    });
  });
});
