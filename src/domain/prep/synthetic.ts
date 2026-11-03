/**
 * Synthetic order history for training the first prep-time model (assumption A10:
 * the brief has no historical data). The generating process, which the TDD quotes:
 *
 *   - Each outlet gets 60–140 orders a day, half at lunch (12:00–15:00 IST) and half at
 *     dinner (19:00–23:00 IST). Friday and Sunday dinners get 1.8× the orders.
 *   - Each order has 1–4 lines drawn from the menu, qty 1–3, a random portion.
 *   - Orders are replayed in time order through a simple kitchen: queueLoad is the number
 *     of unfinished orders per cooking slot, with orders past half-way counted as half.
 *   - actual = 6 + 0.20·workload + 0.45·criticalItem + 2.5·queueLoad + 4·peak + N(0, 3²),
 *     plus a "rush incident" (+8–15 min) on 3% of orders; never under 8 minutes.
 *
 * The model never sees these coefficients; it has to learn them from the samples.
 */
import { computeFeatures, type PrepLine } from "./features";
import type { TrainingSample } from "./model";
import { gaussian, mulberry32 } from "./random";

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 3_600_000;

export function generateHistory(input: {
  outlets: { id: string; capacitySlots: number }[];
  menu: { basePrepMinutes: number; prepMultipliers: number[] }[];
  days: number;
  seed: number;
  endAt: Date;
}): TrainingSample[] {
  const rand = mulberry32(input.seed);
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const samples: TrainingSample[] = [];

  // Midnight IST of the first simulated day.
  const endMidnightIst = Math.floor((input.endAt.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  const firstDay = endMidnightIst - input.days * DAY_MS;

  for (const outlet of input.outlets) {
    for (let d = 0; d < input.days; d++) {
      const dayStart = firstDay + d * DAY_MS;
      const weekday = new Date(dayStart + IST_OFFSET_MS).getUTCDay();
      const busyDinner = weekday === 5 || weekday === 0 ? 1.8 : 1;
      const base = Math.round(between(60, 140));
      const lunch = Math.round(base / 2);
      const dinner = Math.round((base / 2) * busyDinner);

      const times = [
        ...Array.from({ length: lunch }, () => dayStart + between(12, 15) * 3_600_000),
        ...Array.from({ length: dinner }, () => dayStart + between(19, 23) * 3_600_000),
      ].sort((a, b) => a - b);

      const open: { placedAt: number; finishAt: number }[] = [];
      for (const t of times) {
        for (let i = open.length - 1; i >= 0; i--) if (open[i]!.finishAt <= t) open.splice(i, 1);

        const lines: PrepLine[] = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => {
          const item = pick(input.menu);
          return { qty: 1 + Math.floor(rand() * 3), basePrepMinutes: item.basePrepMinutes, prepMultiplier: pick(item.prepMultipliers) };
        });
        // Orders more than half done count as "preparing" (half their work left), like the live system.
        const openOrders = open.map((o) => ({
          status: (t - o.placedAt) / (o.finishAt - o.placedAt) > 0.5 ? ("preparing" as const) : ("placed" as const),
        }));
        const features = computeFeatures({ lines, openOrders, capacitySlots: outlet.capacitySlots, at: new Date(t) });

        let actual =
          6 +
          0.2 * features.workload +
          0.45 * features.criticalItem +
          2.5 * features.queueLoad +
          4 * features.peak +
          3 * gaussian(rand);
        if (rand() < 0.03) actual += between(8, 15);
        actual = Math.max(8, Math.round(actual * 10) / 10);

        samples.push({ outletId: outlet.id, features, actualMinutes: actual });
        open.push({ placedAt: t, finishAt: t + actual * 60_000 });
      }
    }
  }
  return samples;
}
