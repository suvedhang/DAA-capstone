import { describe, it, expect } from "vitest";
import { kruskal, prim } from "@/algorithms/graph/mst";
import { buildGraphFromEdges } from "@/algorithms/graph/dijkstra";
import { buildWeightedGraph } from "@/algorithms/graph/graph";
import { SAMPLE_GRAPH_EDGES } from "@/app/fixtures";

const sample = buildGraphFromEdges(SAMPLE_GRAPH_EDGES, false);

describe("minimum spanning tree", () => {
  it("produces an MST with the expected total weight on the fixture", () => {
    const k = kruskal(sample);
    expect(k.connected).toBe(true);
    expect(k.componentCount).toBe(1);
    expect(k.edges).toHaveLength(sample.nodes.length - 1);
    expect(k.totalWeight).toBe(13); // bc1 + de2 + ac2 + ef3 + bd5
  });

  it("Kruskal and Prim agree on the total weight", () => {
    const k = kruskal(sample);
    const p = prim(sample);
    expect(p.totalWeight).toBe(k.totalWeight);
    expect(p.edges).toHaveLength(k.edges.length);
  });

  it("handles a disconnected graph as a spanning forest", () => {
    const forest = buildWeightedGraph(
      ["A", "B", "C", "D"],
      [
        { id: "ab", from: "A", to: "B", weight: 2 },
        { id: "cd", from: "C", to: "D", weight: 4 },
      ],
      false,
    );
    const k = kruskal(forest);
    expect(k.connected).toBe(false);
    expect(k.componentCount).toBe(2);
    expect(k.edges).toHaveLength(2);
    expect(k.totalWeight).toBe(6);
  });

  it("records a decision trace when requested (Kruskal)", () => {
    const k = kruskal(sample, { trace: true });
    expect(k.trace).toBeDefined();
    expect(k.trace!.length).toBeGreaterThanOrEqual(sample.nodes.length - 1);
    expect(k.trace!.length).toBeLessThanOrEqual(sample.edges.length);
    const joins = k.trace!.filter((s) => s.action === "join");
    expect(joins).toHaveLength(sample.nodes.length - 1);
  });

  it("records a growth trace when requested (Prim)", () => {
    const p = prim(sample, { trace: true });
    expect(p.trace).toBeDefined();
    expect(p.trace?.length).toBe(sample.nodes.length - 1);
    expect(p.trace?.[0].action).toBe("add");
  });

  it("is empty and safe for an empty graph", () => {
    const empty = buildGraphFromEdges([], false);
    expect(kruskal(empty).edges).toHaveLength(0);
    expect(prim(empty).edges).toHaveLength(0);
  });
});