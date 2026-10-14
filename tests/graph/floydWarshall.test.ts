import { describe, it, expect } from "vitest";
import { floydWarshall, reconstructAllPairsPath } from "@/algorithms/graph/floydWarshall";
import { buildGraphFromEdges } from "@/algorithms/graph/dijkstra";
import { SAMPLE_GRAPH_EDGES } from "@/app/fixtures";

const sample = buildGraphFromEdges(SAMPLE_GRAPH_EDGES, false);

describe("floydWarshall", () => {
  it("computes shortest distances for every pair", () => {
    const r = floydWarshall(sample, { maxNodes: 20 });
    expect(r.found).toBe(true);
    const idx = Object.fromEntries(r.nodeIds.map((n, i) => [n, i]));
    expect(r.dist[idx["A"]][idx["F"]]).toBe(13); // A-C-B-D-E-F
    expect(r.dist[idx["A"]][idx["A"]]).toBe(0);
    expect(r.pairCount).toBe(r.nodeIds.length ** 2);
    expect(r.reachablePairs).toBe(r.nodeIds.length * (r.nodeIds.length - 1)); // fully connected
  });

  it("reconstructs the actual path via next pointers", () => {
    const r = floydWarshall(sample, { maxNodes: 20 });
    const path = reconstructAllPairsPath(r, "A", "F");
    expect(path).toEqual(["A", "C", "B", "D", "E", "F"]);
  });

  it("stays symmetric on undirected input", () => {
    const r = floydWarshall(sample, { maxNodes: 20 });
    for (let i = 0; i < r.nodeIds.length; i++) {
      for (let j = 0; j < r.nodeIds.length; j++) {
        expect(r.dist[i][j]).toBe(r.dist[j][i]);
      }
    }
  });

  it("guards against absurd V^3 computations", () => {
    const big: { id: string; from: string; to: string; weight: number }[] = [];
    const k = 700;
    for (let i = 0; i < k - 1; i++) {
      big.push({ id: `e${i}`, from: `N${i}`, to: `N${i + 1}`, weight: 1 });
    }
    const g = buildGraphFromEdges(big, false);
    const r = floydWarshall(g, { maxNodes: 600 });
    expect(r.found).toBe(false);
    expect(r.reason).toMatch(/exceed/);
  });

  it("records a per-k pair trace when requested", () => {
    const r = floydWarshall(sample, { maxNodes: 20, tracePairs: [[0, 5]] });
    expect(r.pairTrace?.length).toBe(r.nodeIds.length + 1); // init + each k
    const last = r.pairTrace?.at(-1);
    expect(last?.dists[0].d).toBe(13);
  });
});