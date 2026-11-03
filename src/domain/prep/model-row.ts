import { z } from "zod";
import type { PrepModel } from "./model";

/** The `prep_models` table row. Kept beside the model so the two never drift. */
export type PrepModelRow = {
  version: string;
  coefficients: number[];
  residual_p50: number;
  residual_p80: number;
  feature_ranges: PrepModel["featureRanges"];
  train_n: number;
  mae: number;
  baseline_mean_mae: number;
  baseline_rule_mae: number;
  outlet_train_counts: Record<string, number>;
  trained_at: string;
  is_active: boolean;
};

const finite = z.coerce.number().refine(Number.isFinite);
const range = z.object({ min: finite, p95: finite });

const rowSchema = z.object({
  version: z.string().min(1),
  coefficients: z.array(z.number().refine(Number.isFinite)).length(5),
  residual_p50: finite,
  residual_p80: finite,
  feature_ranges: z.object({ workload: range, criticalItem: range, queueLoad: range, peak: range }),
  train_n: finite,
  mae: finite,
  baseline_mean_mae: finite,
  baseline_rule_mae: finite,
  outlet_train_counts: z.record(z.string(), finite),
  trained_at: z.string(),
});

export function toPrepModelRow(m: PrepModel, isActive: boolean): PrepModelRow {
  return {
    version: m.version,
    coefficients: m.coefficients,
    residual_p50: m.residualP50,
    residual_p80: m.residualP80,
    feature_ranges: m.featureRanges,
    train_n: m.trainN,
    mae: m.mae,
    baseline_mean_mae: m.baselineMeanMae,
    baseline_rule_mae: m.baselineRuleMae,
    outlet_train_counts: m.outletTrainCounts,
    trained_at: m.trainedAt,
    is_active: isActive,
  };
}

/** Returns null for a missing or corrupt row, so callers fall back to the safe rule. */
export function fromPrepModelRow(row: unknown): PrepModel | null {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) return null;
  const r = parsed.data;
  return {
    version: r.version,
    coefficients: r.coefficients,
    residualP50: r.residual_p50,
    residualP80: r.residual_p80,
    featureRanges: r.feature_ranges,
    trainN: r.train_n,
    mae: r.mae,
    baselineMeanMae: r.baseline_mean_mae,
    baselineRuleMae: r.baseline_rule_mae,
    outletTrainCounts: r.outlet_train_counts,
    trainedAt: r.trained_at,
  };
}
