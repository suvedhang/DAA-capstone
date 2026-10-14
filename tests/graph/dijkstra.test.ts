import { describe, it, expect } from "vitest";
import { buildGraphFromEdges, dijkstra, shortestPath } from "@/algorithms/graph/dijkstra";
import { SAMPLE_GRAPH_EDGES } from "@/app/fixtures";

const sample = buildGraphFromEdges(SAMPLE_GRAPH_EDGES, false);

describe("dijkstra shortestPath", () => {
  it("finds the correct shortest path A → F (cost 13 via C, B, D, E)", () => {
    const r = shortestPath(sample, "A", "F");
    expect(r.found).toBe(true);
    expect(r.totalCost).toBe(13);
    expect(r.path).toEqual(["A", "C", "B", "D", "E", "F"]);
    expect(r.edgesTraversed).toBe(5);
  });

  it("settles nodes in non-decreasing distance order", () => {
    const trace = dijkstra(sample, "A");
    const distances = trace.settleOrder.map((n) => trace.dist.get(n)!);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
    }
  });

  it("never settles the target's successors when stopping early", () => {
    const trace = dijkstra(sample, "A", { target: "E" });
    expect(trace.settleOrder.at(-1)).toBe("E");
    expect(trace.settleOrder).not.toContain("F");
    expect(trace.visitedCount).toBe(trace.settleOrder.length);
  });

  it("reports unreachable nodes honestly", () => {
    const isolated = buildGraphFromEdges(
      [
        { id: "x", from: "X", to: "Y", weight: 1 },
        { id: "z", from: "Z", to: "W", weight: 1 },
      ],
      false,
    );
    const r = shortestPath(isolated, "X", "Z");
    expect(r.found).toBe(false);
    expect(r.reason).toMatch(/No path/);
  });

  it("throws for a source outside the graph", () => {
    expect(() => dijkstra(sample, "Q")).toThrow(/not part/);
  });

  it("matches the distance table used by Floyd–Warshall for every pair", () => {
    const fromFloyd = {
      "A,B": 3, // A-C-B (2 + 1)
      "A,C": 2,
      "B,C": 1,
      "A,F": 13, // A-C-B-D-E-F
    };
    for (const [pair, want] of Object.entries(fromFloyd)) {
      const [s, t] = pair.split(",");
      const r = shortestPath(sample, s, t);
      expect(r.totalCost).toBe(want);
    }
  });
});