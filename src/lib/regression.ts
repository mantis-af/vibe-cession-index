/**
 * Simple OLS linear regression. Pure math, zero dependencies.
 * Used at build time to predict official benchmarks from alt signals.
 */

export function linearRegression(x: number[], y: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  residualStd: number;
} {
  const n = x.length;
  if (n < 5) return { slope: 0, intercept: 0, rSquared: 0, residualStd: 1 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXY = 0, ssX2 = 0, ssY2 = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - meanX) * (y[i] - meanY);
    ssX2 += (x[i] - meanX) ** 2;
    ssY2 += (y[i] - meanY) ** 2;
  }

  const slope = ssX2 > 0 ? ssXY / ssX2 : 0;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (y[i] - (slope * x[i] + intercept)) ** 2;
  }
  const rSquared = ssY2 > 0 ? Math.max(0, 1 - ssRes / ssY2) : 0;
  const residualStd = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 1;

  return { slope, intercept, rSquared: Math.round(rSquared * 1000) / 1000, residualStd };
}

/**
 * Multivariate ridge regression. Used for AR(3) + alt-signal nowcast models.
 * X is n×p matrix (each row = features), y is n×1 target.
 * Returns coefficients β, intercept, and OOS R² from rolling evaluation.
 *
 * β = (X'X + λI)^{-1} X'y  (with intercept via centering)
 */
export function ridgeRegression(
  X: number[][],
  y: number[],
  lambda = 0.01
): { beta: number[]; intercept: number; rSquared: number } {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  if (n < p + 3 || p === 0) return { beta: Array(p).fill(0), intercept: 0, rSquared: 0 };

  // Center X and y
  const meanX = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) meanX[j] += X[i][j];
    meanX[j] /= n;
  }
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  const Xc: number[][] = X.map(row => row.map((v, j) => v - meanX[j]));
  const yc = y.map(v => v - meanY);

  // X'X + λI
  const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) {
        XtX[j][k] += Xc[i][j] * Xc[i][k];
      }
    }
  }
  for (let j = 0; j < p; j++) XtX[j][j] += lambda;

  // X'y
  const Xty = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += Xc[i][j] * yc[i];
    }
  }

  // Solve via Cholesky or Gaussian elimination (small p, so simple approach)
  const beta = solveLinearSystem(XtX, Xty);
  if (!beta) return { beta: Array(p).fill(0), intercept: meanY, rSquared: 0 };

  // Intercept from centering: intercept = meanY - β·meanX
  let intercept = meanY;
  for (let j = 0; j < p; j++) intercept -= beta[j] * meanX[j];

  // R² on training data
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    let pred = intercept;
    for (let j = 0; j < p; j++) pred += beta[j] * X[i][j];
    ssRes += (y[i] - pred) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { beta, intercept, rSquared: Math.round(rSquared * 1000) / 1000 };
}

/** Gaussian elimination for small linear systems */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    if (Math.abs(M[col][col]) < 1e-12) return null;

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

/**
 * Z-score a series: (value - mean) / std
 */
export function zScore(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values.map(() => 0);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  if (std < 1e-10) return values.map(() => 0);
  return values.map(v => Math.round(((v - mean) / std) * 1000) / 1000);
}
