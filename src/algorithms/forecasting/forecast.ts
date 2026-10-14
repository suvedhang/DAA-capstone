/**
 * Demand forecasting and threshold-search utilities.
 *
 * These are deliberately simple and well-documented methods — a least-squares
 * linear trend plus a compounding growth adjustment — because the module is
 * explicitly illustrative: real Chennai consumption history is not part of the
 * supplied dataset. Nobody should mistake this for an authoritative forecast.
 */
export interface TrendResult {
  slope: number;
  intercept: number;
  /** R² goodness of fit, 0..1 */
  r2: number;
}

/** Ordinary least-squares linear fit y = intercept + slope * x. */
export function linearTrend(xs: number[], ys: number[]): TrendResult {
  if (xs.length !== ys.length || xs.length === 0) {
    throw new Error("linearTrend requires equal, non-empty arrays.");
  }
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

/** Simple centred moving average for smoothing a series. Window must be odd. */
export function movingAverage(values: number[], window: number): (number | null)[] {
  if (window <= 0) throw new Error("window must be positive");
  if (window % 2 === 0) window += 1;
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length - 1, i + half);
    const slice = values.slice(from, to + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

/**
 * Project monthly demand for `months` steps.
 * Demand = (trendIntercept + slope * t) * (1 + growthRate)^k where t continues
 * past the fitted history and k counts forecast steps. Trend captures the
 * historical lean; growthRate adds a user-adjustable scenario.
 */
export function projectDemand(
  horizon: number,
  trend: TrendResult,
  growthRate: number,
  lastX: number,
  seasonal?: number[],
): number[] {
  const out: number[] = [];
  for (let k = 0; k < horizon; k++) {
    const t = lastX + k + 1;
    let demand = (trend.intercept + trend.slope * t) * Math.pow(1 + growthRate, k);
    if (seasonal && seasonal.length > 0) {
      demand *= seasonal[k % seasonal.length];
    }
    out.push(Math.max(0, demand));
  }
  return out;
}

/**
 * Minimal monthly supply (MLD) such that the cumulative shortage over the
 * horizon is at most `allowableShortageRatio` of cumulative demand.
 *
 * The predicate is monotone in supply, so a binary search finds the breakeven
 * point. lo/hi bound the search; precision controls the MLD resolution.
 */
export function findBreakevenSupply(
  projectedDemand: number[],
  allowableShortageRatio: number,
  lo = 0,
  hi = 2000,
  precision = 0.5,
): { supply: number; shortageMld: number; iterations: number } {
  const total = projectedDemand.reduce((s, v) => s + v, 0);
  if (total <= 0) return { supply: 0, shortageMld: 0, iterations: 0 };
  const shortageOf = (supply: number) =>
    Math.max(0, (total - projectedDemand.reduce((s, v) => s + Math.min(v, supply), 0)) / total);

  const feasible = (supply: number) => shortageOf(supply) <= allowableShortageRatio;

  let loV = lo;
  let hiV = hi;
  let iterations = 0;
  while (hiV - loV > precision && iterations < 200) {
    iterations++;
    const mid = (loV + hiV) / 2;
    if (feasible(mid)) hiV = mid;
    else loV = mid;
  }
  const supply = (loV + hiV) / 2;
  return { supply, shortageMld: shortageOf(supply) * total, iterations };
}

/** Best intervention combination by savings-to-cost ratio (sorting demo). */
export function rankInterventions<T extends { id: string; savingRate: number; cost: number }>(
  interventions: T[],
): T[] {
  return interventions
    .slice()
    .sort(
      (a, b) =>
        b.savingRate / Math.max(1e-9, b.cost) - a.savingRate / Math.max(1e-9, a.cost),
    );
}