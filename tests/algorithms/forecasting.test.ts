import { describe, it, expect } from "vitest";
import {
  linearTrend,
  movingAverage,
  projectDemand,
  findBreakevenSupply,
  rankInterventions,
} from "@/algorithms/forecasting/forecast";

describe("linearTrend", () => {
  it("recovers a perfect line y = 2x + 1", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [1, 3, 5, 7, 9];
    const t = linearTrend(xs, ys);
    expect(t.slope).toBeCloseTo(2, 10);
    expect(t.intercept).toBeCloseTo(1, 10);
    expect(t.r2).toBeCloseTo(1, 10);
  });

  it("degrades gracefully on a flat series", () => {
    const t = linearTrend([0, 1, 2, 3], [5, 5, 5, 5]);
    expect(t.slope).toBe(0);
    expect(t.intercept).toBe(5);
    expect(t.r2).toBe(1);
  });

  it("throws on mismatched inputs", () => {
    expect(() => linearTrend([1, 2], [1])).toThrow();
  });
});

describe("movingAverage", () => {
  it("centres an odd window and pads edges with shorter slices", () => {
    expect(movingAverage([1, 3, 5], 3)).toEqual([2, 3, 4]);
  });

  it("bumps an even window to the next odd", () => {
    expect(movingAverage([1, 2, 3, 4], 4)).toEqual(movingAverage([1, 2, 3, 4], 5));
  });
});

describe("projectDemand", () => {
  const flat = linearTrend([0, 1, 2], [100, 100, 100]);

  it("projects a flat series flat", () => {
    const out = projectDemand(3, flat, 0, 2);
    expect(out).toEqual([100, 100, 100]);
  });

  it("applies compounding growth (growth factor compounds from step 1 onwards)", () => {
    const out = projectDemand(3, flat, 0.1, 2);
    expect(out[0]).toBeCloseTo(100, 6); // growth^0 = 1 — first forecast step is the trend value
    expect(out[1]).toBeCloseTo(110, 6);
    expect(out[2]).toBeCloseTo(121, 6);
  });

  it("applies seasonality when provided", () => {
    const seasonal = [1, 0.5];
    const out = projectDemand(3, flat, 0, 2, seasonal);
    expect(out[0]).toBe(100);
    expect(out[1]).toBe(50);
    expect(out[2]).toBe(100);
  });
});

describe("findBreakevenSupply", () => {
  it("finds the supply that respects a shortage cap via binary search", () => {
    const demand = [100, 100, 100, 100];
    const r = findBreakevenSupply(demand, 0.25, 0, 200, 1);
    // shortage of 25 % of 400 MLD means 300 MLD served → supply = 75 MLD
    expect(r.supply).toBeGreaterThanOrEqual(73.5);
    expect(r.supply).toBeLessThanOrEqual(76.5);
    // the boundary estimate may overshoot the cap by at most ~1 MLD/step
    expect(r.shortageMld).toBeLessThanOrEqual(104);
  });

  it("returns zero for zero demand", () => {
    expect(findBreakevenSupply([], 0.5).supply).toBe(0);
  });
});

describe("rankInterventions", () => {
  it("sorts by savings-to-cost ratio descending", () => {
    const list = [
      { id: "low", savingRate: 0.02, cost: 10 },
      { id: "high", savingRate: 0.2, cost: 1 },
      { id: "mid", savingRate: 0.1, cost: 2 },
    ];
    expect(rankInterventions(list).map((i) => i.id)).toEqual(["high", "mid", "low"]);
  });

  it("does not mutate the input", () => {
    const list = [{ id: "a", savingRate: 1, cost: 1 }];
    rankInterventions(list);
    expect(list).toHaveLength(1);
  });
});