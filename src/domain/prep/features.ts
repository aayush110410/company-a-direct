import { istClock } from "../time";

/** What the model sees about an order at the moment it is paid. */
export type PrepFeatures = {
  /** Σ qty × base prep × portion multiplier, in minutes of cooking. */
  workload: number;
  /** The slowest single line: dum biryani takes as long as it takes. */
  criticalItem: number;
  /** Orders ahead of this one per cooking slot (orders already preparing count as half). */
  queueLoad: number;
  /** Friday or Sunday dinner, 19:00–22:59 IST. */
  peak: 0 | 1;
};

export type PrepLine = { qty: number; basePrepMinutes: number; prepMultiplier: number };

export function orderWorkload(lines: PrepLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty * l.basePrepMinutes * l.prepMultiplier, 0);
}

export function isPeak(at: Date): 0 | 1 {
  const { day, minutes } = istClock(at);
  return (day === 5 || day === 0) && minutes >= 19 * 60 && minutes < 23 * 60 ? 1 : 0;
}

export function computeFeatures(input: {
  lines: PrepLine[];
  openOrders: { status: "placed" | "preparing" }[];
  capacitySlots: number;
  at: Date;
}): PrepFeatures {
  // An order already on the stove has roughly half its work left.
  const ahead = input.openOrders.reduce((sum, o) => sum + (o.status === "preparing" ? 0.5 : 1), 0);
  return {
    workload: orderWorkload(input.lines),
    criticalItem: Math.max(0, ...input.lines.map((l) => l.basePrepMinutes * l.prepMultiplier)),
    queueLoad: ahead / Math.max(1, input.capacitySlots),
    peak: isPeak(input.at),
  };
}

export const FEATURE_KEYS = ["workload", "criticalItem", "queueLoad", "peak"] as const satisfies readonly (keyof PrepFeatures)[];

export function featureVector(f: PrepFeatures): number[] {
  return FEATURE_KEYS.map((k) => f[k]);
}
