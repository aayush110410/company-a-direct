import { FEATURE_KEYS, featureVector, type PrepFeatures } from "./features";
import { fitRidge, predictLinear } from "./ridge";

export type FeatureRange = { min: number; p95: number };

export type PrepModel = {
  version: string;
  coefficients: number[];
  /** Quantiles of (actual − predicted) on held-out orders. */
  residualP50: number;
  residualP80: number;
  featureRanges: Record<keyof PrepFeatures, FeatureRange>;
  trainN: number;
  /** Mean absolute error on the hold-out set, minutes. */
  mae: number;
  /** MAE of always predicting the training mean. */
  baselineMeanMae: number;
  /** MAE of the hand-written fallback rule. */
  baselineRuleMae: number;
  outletTrainCounts: Record<string, number>;
  trainedAt: string;
};

export type TrainingSample = { outletId: string; features: PrepFeatures; actualMinutes: number };

export type PrepEstimate = {
  predictedMinutes: number;
  p80Minutes: number;
  confidence: "normal" | "low";
  source: "model" | "fallback";
  modelVersion: string | null;
};

/** Below this many training orders an outlet's estimates are flagged low confidence. */
export const MIN_OUTLET_SAMPLES = 200;
const MIN_PREP_MINUTES = 5;
const LOW_CONFIDENCE_WIDENING = 1.5;
const FALLBACK_MARGIN_MINUTES = 5;

/** The documented rule used when there is no usable model. */
export function fallbackPrep(f: PrepFeatures): number {
  return f.criticalItem + 2 * f.queueLoad + 10;
}

export function trainPrepModel(
  samples: TrainingSample[],
  opts: { version: string; lambda?: number; holdoutEvery?: number; trainedAt: string },
): PrepModel {
  const lambda = opts.lambda ?? 1;
  const every = opts.holdoutEvery ?? 5;
  const train = samples.filter((_, i) => i % every !== every - 1);
  const holdout = samples.filter((_, i) => i % every === every - 1);
  if (train.length < 10 || holdout.length < 2) throw new Error("trainPrepModel needs more samples");

  const coefficients = fitRidge(
    train.map((s) => featureVector(s.features)),
    train.map((s) => s.actualMinutes),
    lambda,
  );
  const predict = (f: PrepFeatures) => Math.max(MIN_PREP_MINUTES, predictLinear(coefficients, featureVector(f)));

  const residuals = holdout.map((s) => s.actualMinutes - predict(s.features));
  const trainMean = mean(train.map((s) => s.actualMinutes));

  const featureRanges = Object.fromEntries(
    FEATURE_KEYS.map((k) => {
      const values = train.map((s) => s.features[k]);
      return [k, { min: Math.min(...values), p95: quantile(values, 0.95) }];
    }),
  ) as Record<keyof PrepFeatures, FeatureRange>;

  const outletTrainCounts: Record<string, number> = {};
  for (const s of samples) outletTrainCounts[s.outletId] = (outletTrainCounts[s.outletId] ?? 0) + 1;

  return {
    version: opts.version,
    coefficients,
    residualP50: quantile(residuals, 0.5),
    residualP80: quantile(residuals, 0.8),
    featureRanges,
    trainN: train.length,
    mae: mean(residuals.map(Math.abs)),
    baselineMeanMae: mean(holdout.map((s) => Math.abs(s.actualMinutes - trainMean))),
    baselineRuleMae: mean(holdout.map((s) => Math.abs(s.actualMinutes - fallbackPrep(s.features)))),
    outletTrainCounts,
    trainedAt: opts.trainedAt,
  };
}

export function estimatePrep(model: PrepModel | null, f: PrepFeatures, outletId: string): PrepEstimate {
  if (!model || !isUsable(model)) {
    const minutes = Math.ceil(fallbackPrep(f));
    return {
      predictedMinutes: minutes,
      p80Minutes: minutes + FALLBACK_MARGIN_MINUTES,
      confidence: "low",
      source: "fallback",
      modelVersion: null,
    };
  }

  const predicted = Math.max(MIN_PREP_MINUTES, predictLinear(model.coefficients, featureVector(f)));
  // `peak` is a 0/1 flag, so "beyond the 95th percentile" only makes sense for the continuous features.
  const outOfRange = (["workload", "criticalItem", "queueLoad"] as const).some((k) => f[k] > model.featureRanges[k].p95);
  const thinHistory = (model.outletTrainCounts[outletId] ?? 0) < MIN_OUTLET_SAMPLES;
  const confidence = outOfRange || thinHistory ? "low" : "normal";
  const margin = Math.max(0, model.residualP80) * (confidence === "low" ? LOW_CONFIDENCE_WIDENING : 1);

  return {
    predictedMinutes: Math.ceil(predicted),
    p80Minutes: Math.ceil(predicted + margin),
    confidence,
    source: "model",
    modelVersion: model.version,
  };
}

function isUsable(m: PrepModel): boolean {
  return (
    m.coefficients.length === FEATURE_KEYS.length + 1 &&
    m.coefficients.every(Number.isFinite) &&
    Number.isFinite(m.residualP80)
  );
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

function quantile(xs: number[], q: number): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}
