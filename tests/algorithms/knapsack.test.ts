import { describe, it, expect } from "vitest";
import { knapsackAllocation } from "@/algorithms/optimization/knapsack";
import type { DemandZone } from "@/algorithms/optimization/types";

const ZONES: DemandZone[] = [
  { id: "a", name: "A", type: "essential", demand: 3, priority: 1, simulated: true },
  { id: "b", name: "B", type: "residential", demand: 2, priority: 1, simulated: true },
  { id: "c", name: "C", type: "residential", demand: 4, priority: 3, simulated: true },
  { id: "d", name: "D", type: "agricultural", demand: 2, priority: 5, simulated: true },
];

describe("knapsackAllocation", () => {
  it("serves the best-value subset within the capacity (A + B instead of less valuable combos)", () => {
    const r = knapsackAllocation({ zones: ZONES, supply: 5 }, { quantum: 1, maxCapacityCells: 1000 });
    const active = r.allocations.filter((a) => a.allocated > 0);
    expect(active.map((a) => a.zoneId).sort()).toEqual(["a", "b"]);
    expect(r.totalAllocated).toBe(5);
    expect(r.totalUnmet).toBe(6);
  });

  it("serves a zone fully or not at all", () => {
    const r = knapsackAllocation({ zones: ZONES, supply: 4 }, { quantum: 1, maxCapacityCells: 1000 });
    for (const a of r.allocations) {
      expect([0, a.demand]).toContain(a.allocated);
    }
  });

  it("reports the knapsack objective value", () => {
    const r = knapsackAllocation({ zones: ZONES, supply: 5 }, { quantum: 1, maxCapacityCells: 1000 });
    expect(r.algorithmObjective?.label).toContain("Knapsack");
    // A + B value = priorityWeight(1) * (3 + 2) = 5
    expect(r.algorithmObjective?.value).toBeCloseTo(5, 4);
  });

  it("respects the state-cell safety cap", () => {
    const demandy = ZONES.map((z) => ({ ...z, demand: 5000 }));
    const r = knapsackAllocation({ zones: demandy, supply: 5000 }, { quantum: 0.5, maxCapacityCells: 100 });
    expect(r.allocations.every((a) => a.allocated === 0)).toBe(true);
    expect(r.notes).toMatch(/Skipped/);
  });

  it("handles a zero budget", () => {
    const r = knapsackAllocation({ zones: ZONES, supply: 0 }, { quantum: 1 });
    expect(r.totalAllocated).toBe(0);
  });
});