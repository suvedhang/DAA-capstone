import { describe, it, expect } from "vitest";
import {
  buildWeightedGraph,
  bfsSubgraph,
  countComponents,
  largestComponent,
  DisjointSet,
  type AlgorithmEdge,
} from "@/algorithms/graph/graph";

const TRIANGLE: AlgorithmEdge[] = [
  { id: "a-b", from: "A", to: "B", weight: 1 },
  { id: "b-c", from: "B", to: "C", weight: 2 },
  { id: "c-a", from: "C", to: "A", weight: 3 },
];

describe("buildWeightedGraph", () => {
  it("creates undirected adjacency by mirroring every edge", () => {
    const g = buildWeightedGraph(["A", "B", "C"], TRIANGLE, false);
    expect(g.nodes).toHaveLength(3);
    expect(g.edges).toHaveLength(3);
    expect(g.adjacency.get("A")?.map((e) => e.to).sort()).toEqual(["B", "C"]);
    expect(g.adjacency.get("C")?.map((e) => e.to).sort()).toEqual(["A", "B"]);
  });

  it("keeps one direction for directed graphs", () => {
    const g = buildWeightedGraph([], TRIANGLE, true); // A→B, B→C, C→A
    expect(g.adjacency.get("A")?.map((e) => e.to)).toEqual(["B"]);
    expect(g.adjacency.get("C")?.map((e) => e.to)).toEqual(["A"]); // no A→C link
  });

  it("adds implicit nodes found only in edges", () => {
    const g = buildWeightedGraph([], [{ id: "x", from: "X", to: "Y", weight: 1 }], false);
    expect(g.nodes).toContain("X");
    expect(g.nodes).toContain("Y");
  });

  it("rejects negative and non-finite weights", () => {
    expect(() =>
      buildWeightedGraph([], [{ id: "e", from: "A", to: "B", weight: -1 }], false),
    ).toThrow(/non-negative/);
    expect(() =>
      buildWeightedGraph([], [{ id: "e", from: "A", to: "B", weight: Infinity }], false),
    ).toThrow(/finite/);
  });
});

describe("DisjointSet", () => {
  it("unions components and reports whether a union changed anything", () => {
    const ds = new DisjointSet(["A", "B", "C"]);
    expect(ds.union("A", "B")).toBe(true);
    expect(ds.union("A", "B")).toBe(false);
    expect(ds.union("B", "C")).toBe(true);
    expect(ds.find("A")).toBe(ds.find("C"));
  });

  it("compresses paths so find is stable", () => {
    const ds = new DisjointSet(["A", "B", "C"]);
    ds.union("A", "B");
    ds.union("B", "C");
    const root = ds.find("C");
    for (const n of ["A", "B", "C"]) expect(ds.find(n)).toBe(root);
  });

  it("auto-registers nodes seen for the first time", () => {
    const ds = new DisjointSet(["A", "B", "C"]);
    const ra = ds.find("A");
    expect(ds.find("x")).not.toBe(ra);
    expect(ds.find("x")).toBe(ds.find("x"));
  });
});

describe("component helpers", () => {
  it("counts connected components", () => {
    const g = buildWeightedGraph(
      ["A", "B", "C", "D"],
      [
        { id: "ab", from: "A", to: "B", weight: 1 },
        { id: "cd", from: "C", to: "D", weight: 1 },
      ],
      false,
    );
    expect(countComponents(g)).toBe(2);
    expect(largestComponent(g).size).toBe(2);
  });

  it("reports a single component for a connected graph", () => {
    const g = buildWeightedGraph(["A", "B", "C"], TRIANGLE, false);
    expect(countComponents(g)).toBe(1);
    expect(largestComponent(g).size).toBe(3);
  });
});

describe("bfsSubgraph", () => {
  const NET: AlgorithmEdge[] = [
    { id: "ab", from: "A", to: "B", weight: 1 },
    { id: "bc", from: "B", to: "C", weight: 1 },
    { id: "cd", from: "C", to: "D", weight: 1 },
  ];

  it("returns a connected neighbourhood of at most maxNodes", () => {
    const g = buildWeightedGraph([], NET, false);
    const sub = bfsSubgraph(g, "B", 3);
    expect(sub.nodes.length).toBeLessThanOrEqual(3);
    expect(sub.nodes).toContain("B");
    expect(sub.nodes).toContain("A");
    expect(countComponents(sub)).toBe(1);
  });

  it("throws for a missing seed", () => {
    const g = buildWeightedGraph([], NET, false);
    expect(() => bfsSubgraph(g, "X", 3)).toThrow(/not found/);
  });
});