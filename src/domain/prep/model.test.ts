import { describe, expect, it } from "vitest";
import { estimatePrep, fallbackPrep, type PrepModel, trainPrepModel } from "./model";
import { fromPrepModelRow, toPrepModelRow } from "./model-row";
import { generateHistory } from "./synthetic";

const menu = [
  { basePrepMinutes: 18, prepMultipliers: [1, 1.6] },
  { basePrepMinutes: 12, prepMultipliers: [1] },
  { basePrepMinutes: 4, prepMultipliers: [1] },
  { basePrepMinutes: 6, prepMultipliers: [1] },
];
const samples = generateHistory({
  outlets: [
    { id: "kondapur", capacitySlots: 4 },
    { id: "gachibowli", capacitySlots: 6 },
  ],
  menu,
  days: 42,
  seed: 42,
  endAt: new Date("2026-11-01T00:00:00Z"),
});
const model = trainPrepModel(samples, { version: "test-1", trainedAt: "2026-11-01T00:00:00Z" });
const typical = { workload: 30, criticalItem: 18, queueLoad: 1.5, peak: 0 as const };

describe("trainPrepModel", () => {
  it("beats both baselines on held-out orders", () => {
    expect(model.mae).toBeLessThan(model.baselineMeanMae);
    expect(model.mae).toBeLessThan(model.baselineRuleMae);
  });
  it("learns that a busier kitchen takes longer", () => {
    expect(model.coefficients[3]).toBeGreaterThan(0);
  });
  it("errs by only a few minutes on held-out orders", () => {
    expect(model.mae).toBeLessThan(4);
  });
  it("is deterministic for the same data", () => {
    const again = trainPrepModel(samples, { version: "test-1", trainedAt: "2026-11-01T00:00:00Z" });
    expect(again.coefficients).toEqual(model.coefficients);
  });
  it("records training counts per outlet", () => {
    expect(model.outletTrainCounts.kondapur).toBeGreaterThan(200);
  });
});

describe("estimatePrep", () => {
  it("is normal confidence for a typical order at a well-trained outlet", () => {
    const e = estimatePrep(model, typical, "kondapur");
    expect(e).toMatchObject({ confidence: "normal", source: "model", modelVersion: "test-1" });
    expect(e.p80Minutes).toBeGreaterThan(e.predictedMinutes);
  });

  it("falls back safely with no model", () => {
    const e = estimatePrep(null, typical, "kondapur");
    expect(e).toMatchObject({ source: "fallback", confidence: "low", modelVersion: null });
    expect(e.predictedMinutes).toBe(Math.ceil(fallbackPrep(typical)));
    expect(e.p80Minutes).toBe(Math.ceil(fallbackPrep(typical)) + 5);
  });

  it("falls back when the model has broken coefficients", () => {
    const broken: PrepModel = { ...model, coefficients: [Number.NaN, 1, 1, 1, 1] };
    expect(estimatePrep(broken, typical, "kondapur").source).toBe("fallback");
  });

  it("is low confidence and wider when kitchen load is beyond anything seen", () => {
    const busy = { ...typical, queueLoad: model.featureRanges.queueLoad.p95 + 3 };
    const e = estimatePrep(model, busy, "kondapur");
    expect(e.confidence).toBe("low");
    const widening = e.p80Minutes - e.predictedMinutes;
    expect(widening).toBeGreaterThanOrEqual(Math.floor(1.5 * model.residualP80));
  });

  it("is low confidence for an outlet with little history", () => {
    const thin = { ...model, outletTrainCounts: { ...model.outletTrainCounts, newOutlet: 150 } };
    expect(estimatePrep(thin, typical, "newOutlet").confidence).toBe("low");
    expect(estimatePrep(model, typical, "unknown").confidence).toBe("low");
  });

  it("never predicts under 5 minutes", () => {
    const tiny = { workload: 0, criticalItem: 0, queueLoad: 0, peak: 0 as const };
    expect(estimatePrep(model, tiny, "kondapur").predictedMinutes).toBeGreaterThanOrEqual(5);
  });
});

describe("model rows", () => {
  it("round-trips through the database row shape", () => {
    expect(fromPrepModelRow(toPrepModelRow(model, true))).toEqual(model);
  });
  it("rejects a corrupt row", () => {
    expect(fromPrepModelRow({ ...toPrepModelRow(model, true), coefficients: ["x"] })).toBeNull();
    expect(fromPrepModelRow(null)).toBeNull();
  });
});
