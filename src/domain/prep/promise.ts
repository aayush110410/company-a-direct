import type { PrepEstimate } from "./model";

const MINUTE = 60_000;
const OVERRIDE_MIN_DELTA = -30;
const OVERRIDE_MAX_DELTA = 60;
const OVERRIDE_MAX_AHEAD_MIN = 120;

export type Promise_ = {
  promiseMinutes: number;
  promisedAt: Date;
  readyBy: Date;
  source: "model" | "fallback" | "outlet_minimum";
};

/**
 * The customer promise: the pessimistic (P80) prep time plus travel, never sooner than
 * the outlet's own minimum. The kitchen works to `readyBy`, the promise minus travel.
 */
export function computePromise(input: {
  estimate: PrepEstimate;
  travelMinutes: number;
  outletMinPromiseMinutes: number;
  at: Date;
}): Promise_ {
  const aiTotal = Math.ceil(input.estimate.p80Minutes + input.travelMinutes);
  const floorWins = input.outletMinPromiseMinutes > aiTotal;
  const promiseMinutes = floorWins ? input.outletMinPromiseMinutes : aiTotal;
  const promisedAt = new Date(input.at.getTime() + promiseMinutes * MINUTE);
  return {
    promiseMinutes,
    promisedAt,
    readyBy: new Date(promisedAt.getTime() - input.travelMinutes * MINUTE),
    source: floorWins ? "outlet_minimum" : input.estimate.source,
  };
}

/** A manager nudging the promise from the kitchen screen. */
export function applyOverride(input: {
  promisedAt: Date;
  travelMinutes: number;
  now: Date;
  deltaMinutes: number;
}): { ok: true; promisedAt: Date; readyBy: Date } | { ok: false; error: "too_far" | "in_past" } {
  if (input.deltaMinutes < OVERRIDE_MIN_DELTA || input.deltaMinutes > OVERRIDE_MAX_DELTA) {
    return { ok: false, error: "too_far" };
  }
  const promisedAt = new Date(input.promisedAt.getTime() + input.deltaMinutes * MINUTE);
  if (promisedAt.getTime() <= input.now.getTime()) return { ok: false, error: "in_past" };
  if (promisedAt.getTime() > input.now.getTime() + OVERRIDE_MAX_AHEAD_MIN * MINUTE) return { ok: false, error: "too_far" };
  return { ok: true, promisedAt, readyBy: new Date(promisedAt.getTime() - input.travelMinutes * MINUTE) };
}
