/**
 * Retrains the prep-time model from real orders (prep_estimates.actual_minutes), topped up
 * with synthetic history while fewer than 500 real orders exist. Run: `pnpm train:prep`.
 */
import { trainPrepModel, type TrainingSample } from "@/domain/prep/model";
import type { PrepFeatures } from "@/domain/prep/features";
import { generateHistory } from "@/domain/prep/synthetic";
import { saveModel } from "@/server/model-store";
import { adminClientForScripts } from "./lib/admin-client";
import { MENU } from "./seed-data/menu";

const db = adminClientForScripts();

async function main() {
  const { data, error } = await db
    .from("prep_estimates")
    .select("features, actual_minutes, orders!inner(outlet_id)")
    .not("actual_minutes", "is", null);
  if (error) throw new Error(error.message);

  const real: TrainingSample[] = (data ?? []).map((r) => ({
    outletId: r.orders.outlet_id,
    features: r.features as PrepFeatures,
    actualMinutes: r.actual_minutes!,
  }));

  let samples = real;
  if (real.length < 500) {
    const { data: outlets } = await db.from("outlets").select("id, capacity_slots");
    const synthetic = generateHistory({
      outlets: (outlets ?? []).map((o) => ({ id: o.id, capacitySlots: o.capacity_slots })),
      menu: MENU.map((m) => ({ basePrepMinutes: m.basePrep, prepMultipliers: m.portions.map((p) => p.multiplier) })),
      days: 42,
      seed: Date.now() % 100_000,
      endAt: new Date(),
    });
    samples = [...synthetic, ...real];
  }

  const now = new Date();
  const model = trainPrepModel(samples, { version: `v-${now.toISOString().replace(/[:.]/g, "-")}`, trainedAt: now.toISOString() });
  await saveModel(db, model);
  console.table({
    "real orders": real.length,
    "training orders": model.trainN,
    "model MAE (min)": model.mae.toFixed(2),
    "baseline: predict mean": model.baselineMeanMae.toFixed(2),
    "baseline: fallback rule": model.baselineRuleMae.toFixed(2),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
