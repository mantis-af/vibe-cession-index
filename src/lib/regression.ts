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
