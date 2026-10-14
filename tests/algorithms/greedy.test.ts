import { describe, it, expect } from "vitest";
import { greedyAllocation } from "@/algorithms/optimization/greedyAllocation";
import type { DemandZone } from "@/algorithms/optimization/types";

const ZONES: DemandZone[] = [
  { id: "a", name: "A", type: "residential", demand: 5, priority: 3, simulated: true },
  { id: "b", name: "B", type: "essential", demand: 2, priority: 1, simulated: true },
  { id: "c", name: "C", type: "commercial", demand: 4, priority: 2, simulated: true },
];

describe("greedyAllocation", () => {
  it("fills strict priority order first", () => {
    const r = greedyAllocation({ zones: ZONES, supply: 6 });
    const byId = new Map(r.allocations.map((a) => [a.zoneId, a.allocated]));
    expect(byId.get("b")).toBe(2); // priority 1 — fully covered
    expect(byId.get("c")).toBe(4); // priority 2 — fully covered
    expect(byId.get("a")).toBe(0); // nothing left for priority 3
    expect(r.totalAllocated).toBe(6);
  });

  it("spills residual supply within a zone to the next zone", () => {
    const r = greedyAllocation({ zones: ZONES, supply: 7 });
    const byId = new Map(r.allocations.map((a) => [a.zoneId, a.allocated]));
    expect(byId.get("b")).toBe(2);
    expect(byId.get("c")).toBe(4);
    expect(byId.get("a")).toBe(1); // leftover 1 MLD
  });

  it("ties priority by largest demand, then id", () => {
    const tied: DemandZone[] = [
      { id: "x", name: "X", type: "residential", demand: 3, priority: 2, simulated: true },
      { id: "y", name: "Y", type: "residential", demand: 8, priority: 2, simulated: true },
    ];
    const r = greedyAllocation({ zones: tied, supply: 4 });
    const byId = new Map(r.allocations.map((a) => [a.zoneId, a.allocated]));
    expect(byId.get("y")).toBe(4);
    expect(byId.get("x")).toBe(0);
  });

  it("never allocates beyond the requested supply", () => {
    const r = greedyAllocation({ zones: ZONES, supply: 100 });
    expect(r.totalAllocated).toBeLessThanOrEqual(r.totalDemand);
    expect(r.satisfaction).toBeCloseTo(1, 5);
  });

  it("is deterministic across runs", () => {
    const a = greedyAllocation({ zones: ZONES, supply: 6 });
    const b = greedyAllocation({ zones: ZONES, supply: 6 });
    expect(a.allocations).toEqual(b.allocations);
    expect(a.totalAllocated).toBe(b.totalAllocated);
  });
});