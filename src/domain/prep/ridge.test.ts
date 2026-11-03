import { describe, expect, it } from "vitest";
import { fitRidge, predictLinear } from "./ridge";

describe("fitRidge", () => {
  it("recovers exact coefficients from noiseless data", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 6; b++) {
        X.push([a, b * 1.7]);
        y.push(2 + 3 * a - b * 1.7);
      }
    }
    const coefs = fitRidge(X, y, 1e-9);
    expect(coefs).toHaveLength(3);
    expect(coefs[0]).toBeCloseTo(2, 3);
    expect(coefs[1]).toBeCloseTo(3, 3);
    expect(coefs[2]).toBeCloseTo(-1, 3);
    expect(predictLinear(coefs, [1, 1])).toBeCloseTo(4, 3);
  });

  it("shrinks coefficients as lambda grows but leaves the intercept free", () => {
    const X = [[1], [2], [3], [4]];
    const y = [12, 14, 16, 18];
    const loose = fitRidge(X, y, 1e-9);
    const tight = fitRidge(X, y, 1000);
    expect(Math.abs(tight[1]!)).toBeLessThan(Math.abs(loose[1]!));
    // With the slope shrunk to ~0, the intercept moves to the mean of y.
    expect(tight[0]).toBeCloseTo(15, 0);
  });
});
