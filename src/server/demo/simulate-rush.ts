import { computeFeatures } from "@/domain/prep/features";
import { estimatePrep, type PrepModel } from "@/domain/prep/model";
import { mulberry32 } from "@/domain/prep/random";
import { buildPaidOrder } from "./build-order";
import type { CatalogLine, DemoOutlet } from "./catalog";
import type { PaidOrderRow } from "./insert-paid-order";

export type RushDeps = {
  loadCatalog(outletId: string): Promise<{ outlet: DemoOutlet; lines: CatalogLine[] }>;
  loadOpenOrders(outletId: string): Promise<{ status: "placed" | "preparing" }[]>;
  loadActiveModel(): Promise<PrepModel | null>;
  demoCustomerId(): Promise<string>;
  insertPaidOrder(row: PaidOrderRow): Promise<string>;
};

/**
 * Demo tool: a Friday-night rush at one outlet. Each order goes through the real
 * features → estimate → promise path, and counts in the queue for the next one,
 * so the kitchen board fills and the quoted times visibly stretch.
 */
export async function simulateRushCore(
  input: { outletId: string; count: number; now: Date; seed: number },
  deps: RushDeps,
): Promise<{
  orderIds: string[];
  promiseMinutes: number[];
  prepMinutes: number[];
  reference: { name: string; beforeMinutes: number; afterMinutes: number };
}> {
  const { outlet, lines } = await deps.loadCatalog(input.outletId);
  if (lines.length === 0) throw new Error("This outlet has nothing on the menu");
  const [customerId, model] = await Promise.all([deps.demoCustomerId(), deps.loadActiveModel()]);
  const rand = mulberry32(input.seed);

  // One standard dish, quoted against the kitchen before and after the rush: a like-for-like view of the load.
  const ref = lines[0]!;
  const quoteRef = async () =>
    estimatePrep(
      model,
      computeFeatures({
        lines: [{ qty: 1, basePrepMinutes: ref.basePrepMinutes, prepMultiplier: ref.prepMultiplier }],
        openOrders: await deps.loadOpenOrders(outlet.id),
        capacitySlots: outlet.capacitySlots,
        at: input.now,
      }),
      outlet.id,
    ).p80Minutes;
  const beforeMinutes = await quoteRef();

  const orderIds: string[] = [];
  const promiseMinutes: number[] = [];
  const prepMinutes: number[] = [];
  for (let i = 0; i < input.count; i++) {
    const picks = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => ({
      line: lines[Math.floor(rand() * lines.length)]!,
      qty: 1 + Math.floor(rand() * 2),
    }));
    const placedAt = new Date(input.now.getTime() + i * 1000);
    const row = buildPaidOrder({
      outlet,
      customerId,
      picks,
      openOrders: await deps.loadOpenOrders(outlet.id),
      model,
      placedAt,
      status: "placed",
      paymentMethod: rand() < 0.7 ? "upi" : "card",
      distanceKm: 1 + rand() * 3,
    });
    orderIds.push(await deps.insertPaidOrder(row));
    promiseMinutes.push(Math.round((row.order.promisedAt.getTime() - placedAt.getTime()) / 60_000));
    prepMinutes.push(row.estimate.result.p80Minutes);
  }
  return { orderIds, promiseMinutes, prepMinutes, reference: { name: ref.name, beforeMinutes, afterMinutes: await quoteRef() } };
}
