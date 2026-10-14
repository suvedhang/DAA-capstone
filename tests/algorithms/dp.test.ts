import { describe, it, expect } from "vitest";
import { dpAllocation } from "@/algorithms/optimization/dpAllocation";
import type { DemandZone } from "@/algorithms/optimization/types";

const ZONES: DemandZone[] = [
  { id: "a", name: "A", type: "essential", demand: 3, priority: 1, simulated: true },
  { id: "b", name: "B", type: "residential", demand: 2, priority: 2, simulated: true },
  { id: "c", name: "C", type: "residential", demand: 4, priority: 2, simulated: true },
  { id: "d", name: "D", type: "agricultural", demand: 2, priority: 5, simulated: true },
];

describe("dpAllocation", () => {
  it("spends the whole budget when demand exceeds supply (concave utility is positive)", () => {
    const r = dpAllocation({ zones: ZONES, supply: 6 }, { quantum: 1, maxStateCells: 100_000 });
    expect(r.totalAllocated).toBe(6);
    expect(r.totalDemand).toBe(11);
  });

  it("never exceeds a zone's demand", () => {
    const r = dpAllocation({ zones: ZONES, supply: 100 }, { quantum: 1, maxStateCells: 100_000 });
    for (const a of r.allocations) {
      expect(a.allocated).toBeLessThanOrEqual(a.demand);
    }
    expect(r.totalAllocated).toBe(r.totalDemand);
  });

  it("allocates zero to every zone at zero budget", () => {
    const r = dpAllocation({ zones: ZONES, supply: 0 }, { quantum: 1 });
    expect(r.totalAllocated).toBe(0);
    expect(r.objectiveValue).toBe(0);
  });

  it("spreads water because the utility is concave (p1 zone does not take everything)", () => {
    const r = dpAllocation({ zones: ZONES, supply: 6 }, { quantum: 1, maxStateCells: 100_000 });
    const a = r.allocations.find((x) => x.zoneId === "a")!;
    expect(a.allocated).toBeGreaterThan(0);
    expect(a.allocated).toBeLessThan(6); // would be 6 under marginal-value dumping
    expect(r.allocations.filter((x) => x.allocated > 0).length).toBeGreaterThan(1);
  });

  it("returns a bounded number of state cells and reports it", () => {
    const r = dpAllocation({ zones: ZONES, supply: 6 }, { quantum: 1, maxStateCells: 100_000 });
    expect(r.stateCount).toBe((ZONES.length + 1) * (6 + 1));
  });
});