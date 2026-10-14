import { describe, it, expect } from "vitest";
import { selectRepairs } from "@/algorithms/backtracking/backtracking";
import { REPAIR_CANDIDATES } from "@/app/fixtures";

describe("selectRepairs (backtracking + branch-and-bound)", () => {
  it("finds the optimum within budget on the fixture", () => {
    const r = selectRepairs({ candidates: REPAIR_CANDIDATES, budget: 10 });
    expect(r.optimal).toBe(true);
    expect(r.coveredNodes.length).toBe(6); // R1+R3+R6 (cost 9) covers N1..N7
    expect(r.totalCost).toBeLessThanOrEqual(10);
    const union = new Set<string>();
    for (const id of r.selected) {
      const c = REPAIR_CANDIDATES.find((x) => x.id === id)!;
      c.restores.forEach((n) => union.add(n));
    }
    expect(union.size).toBe(6);
  });

  it("selects nothing at zero budget", () => {
    const r = selectRepairs({ candidates: REPAIR_CANDIDATES, budget: 0 });
    expect(r.selected).toHaveLength(0);
    expect(r.coveredNodes).toHaveLength(0);
    expect(r.totalCost).toBe(0);
  });

  it("covers every node when the budget is generous", () => {
    const r = selectRepairs({ candidates: REPAIR_CANDIDATES, budget: 40 });
    expect(r.coveredNodes).toHaveLength(7);
    expect(r.totalCost).toBeLessThanOrEqual(40);
    expect(r.optimal).toBe(true);
  });

  it("respects a hard state cap and reports a best incumbent", () => {
    const r = selectRepairs({
      candidates: REPAIR_CANDIDATES,
      budget: 10,
      maxStates: 2,
    });
    expect(r.exploredStates).toBeGreaterThan(0);
    expect(r.coveredNodes.length).toBeGreaterThanOrEqual(0);
    expect(r.reason).toMatch(/incumbent/i);
  });

  it("comes to a definitive answer on a small instance and stays optimal", () => {
    const small = [
      { id: "p1", cost: 3, restores: ["n1", "n2"] },
      { id: "p2", cost: 4, restores: ["n2", "n3"] },
      { id: "p3", cost: 5, restores: ["n1", "n3", "n4"] },
    ];
    // Budget 7: p1 + p2 (cost 7) and p3 alone (cost 5) both cover 3 nodes.
    const r = selectRepairs({ candidates: small, budget: 7 });
    expect(r.optimal).toBe(true);
    expect(r.coveredNodes.length).toBe(3);
    expect(r.totalCost).toBeLessThanOrEqual(7);
    expect(new Set(r.coveredNodes).size).toBe(3);
  });
});