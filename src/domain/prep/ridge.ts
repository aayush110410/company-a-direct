/**
 * Ridge regression by closed-form normal equations: (XᵀX + λI)β = Xᵀy.
 * Four features need no ML library, and every coefficient stays explainable.
 */

/** Returns [b0, b1..bk]. The intercept b0 is not penalised. */
export function fitRidge(X: number[][], y: number[], lambda: number): number[] {
  const n = X.length;
  if (n === 0 || n !== y.length) throw new Error("fitRidge needs matching, non-empty X and y");
  const k = (X[0]?.length ?? 0) + 1;

  const A = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b = new Array<number>(k).fill(0);
  for (let r = 0; r < n; r++) {
    const row = [1, ...X[r]!];
    for (let i = 0; i < k; i++) {
      b[i]! += row[i]! * y[r]!;
      for (let j = 0; j < k; j++) A[i]![j]! += row[i]! * row[j]!;
    }
  }
  for (let i = 1; i < k; i++) A[i]![i]! += lambda;

  return solve(A, b);
}

export function predictLinear(coefs: number[], x: number[]): number {
  return x.reduce((sum, xi, i) => sum + (coefs[i + 1] ?? 0) * xi, coefs[0] ?? 0);
}

/** Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const k = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    if (Math.abs(M[pivot]![col]!) < 1e-12) throw new Error("fitRidge: singular system");
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];
    for (let r = col + 1; r < k; r++) {
      const factor = M[r]![col]! / M[col]![col]!;
      for (let c = col; c <= k; c++) M[r]![c]! -= factor * M[col]![c]!;
    }
  }
  const x = new Array<number>(k).fill(0);
  for (let r = k - 1; r >= 0; r--) {
    let sum = M[r]![k]!;
    for (let c = r + 1; c < k; c++) sum -= M[r]![c]! * x[c]!;
    x[r] = sum / M[r]![r]!;
  }
  return x;
}
