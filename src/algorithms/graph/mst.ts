/**
 * Minimum Spanning Tree — Kruskal's and Prim's algorithms.
 *
 * Both operate on undirected weighted graphs and return the same total weight
 * for a connected graph (though the chosen edge set may differ when weights tie).
 *
 *  - Kruskal: O(E log E)  (sorting dominated), O(V + E) space.
 *  - Prim:    O(E log V) with a binary heap, O(V + E) space.
 *
 * On a disconnected graph the result is a minimum spanning *forest*; the
 * component count is reported so callers can explain the result honestly.
 */
import { DisjointSet, countComponents, type WeightedGraph } from "./graph";
import type { MstResult, MstTraceStep } from "../../types";

export interface MstOptions {
  /** Build a pedagogical decision trace (only practical on small graphs). */
  trace?: boolean;
}

function resultFor(
  graph: WeightedGraph,
  edges: MstResult["edges"],
  algorithm: "kruskal" | "prim",
  startMs: number,
  trace?: MstTraceStep[],
): MstResult {
  const totalWeight = edges.reduce((s, e) => s + e.weight, 0);
  const components = countComponents(graph);
  const endMs =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    edges,
    totalWeight,
    componentCount: components,
    connected: components === 1,
    executionMs: endMs - startMs,
    algorithm,
    nodeCount: graph.nodes.length,
    trace,
  };
}

export function kruskal(graph: WeightedGraph, options: MstOptions = {}): MstResult {
  const startMs =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const sorted = graph.edges.slice().sort((a, b) => a.weight - b.weight);
  const ds = new DisjointSet(graph.nodes);
  const chosen: MstResult["edges"] = [];
  const trace: MstTraceStep[] | undefined = options.trace ? [] : undefined;

  for (const e of sorted) {
    const joined = ds.union(e.from, e.to);
    if (joined) {
      chosen.push({ edgeId: e.id, from: e.from, to: e.to, weight: e.weight });
    }
    trace?.push({
      order: trace.length,
      from: e.from,
      to: e.to,
      weight: e.weight,
      action: joined ? "join" : "skip",
    });
    if (!joined) continue;
    if (chosen.length === graph.nodes.length - 1) break;
  }

  return resultFor(graph, chosen, "kruskal", startMs, trace);
}

export function prim(graph: WeightedGraph, options: MstOptions = {}): MstResult {
  const startMs =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  if (graph.nodes.length === 0) {
    return resultFor(graph, [], "prim", startMs, options.trace ? [] : undefined);
  }

  const inTree = new Set<string>();
  const chosen: MstResult["edges"] = [];
  const trace: MstTraceStep[] | undefined = options.trace ? [] : undefined;

  // Simple binary heap over frontier edges.
  type Frontier = { weight: number; from: string; to: string; edgeId: string };
  const heap: Frontier[] = [];
  const push = (item: Frontier) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].weight <= heap[i].weight) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): Frontier | undefined => {
    if (heap.length === 0) return undefined;
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let s = i;
        if (l < heap.length && heap[l].weight < heap[s].weight) s = l;
        if (r < heap.length && heap[r].weight < heap[s].weight) s = r;
        if (s === i) break;
        [heap[s], heap[i]] = [heap[i], heap[s]];
        i = s;
      }
    }
    return top;
  };

  const pushEdges = (node: string) => {
    for (const entry of graph.adjacency.get(node) ?? []) {
      if (!inTree.has(entry.to)) {
        push({
          weight: entry.weight,
          from: node,
          to: entry.to,
          edgeId: entry.edgeId,
        });
      }
    }
  };

  // Start from a deterministic node so results are reproducible in tests.
  const start = graph.nodes[0];
  inTree.add(start);
  pushEdges(start);

  while (heap.length > 0 && inTree.size < graph.nodes.length) {
    const edge = pop()!;
    if (inTree.has(edge.to)) continue;
    inTree.add(edge.to);
    chosen.push({
      edgeId: edge.edgeId,
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
    });
    trace?.push({
      order: trace.length,
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      action: "add",
    });
    pushEdges(edge.to);
  }

  return resultFor(graph, chosen, "prim", startMs, trace);
}
