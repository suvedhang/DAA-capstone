/**
 * Dijkstra's single-source shortest path.
 *
 * Time complexity:  O((V + E) log V) with a binary heap.
 * Space complexity: O(V + E).
 *
 * Assumes non-negative edge weights (validated when the graph is built).
 */
import { buildWeightedGraph, type AlgorithmEdge, type WeightedGraph } from "./graph";
import type { PathResult } from "../../types";

interface HeapItem {
  node: string;
  dist: number;
}

/** Minimal binary min-heap keyed by `dist`. */
class MinHeap {
  private items: HeapItem[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: HeapItem): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): HeapItem | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    const items = this.items;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].dist <= items[i].dist) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  private bubbleDown(i: number): void {
    const items = this.items;
    const n = items.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && items[left].dist < items[smallest].dist) smallest = left;
      if (right < n && items[right].dist < items[smallest].dist) smallest = right;
      if (smallest === i) break;
      [items[smallest], items[i]] = [items[i], items[smallest]];
      i = smallest;
    }
  }
}

export interface DijkstraTrace {
  dist: Map<string, number>;
  prev: Map<string, string | null>;
  prevEdge: Map<string, string | null>;
  /** Order in which nodes were settled — used by the Algorithm Lab. */
  settleOrder: string[];
  visitedCount: number;
}

export interface DijkstraOptions {
  /** Stop early once the destination is settled (perf optimisation). */
  target?: string;
}

/** Core routine returning the full single-source shortest-path trace. */
export function dijkstra(
  graph: WeightedGraph,
  source: string,
  options: DijkstraOptions = {},
): DijkstraTrace {
  if (!graph.adjacency.has(source)) {
    throw new Error(`Source node "${source}" is not part of the graph.`);
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const prevEdge = new Map<string, string | null>();
  const settled = new Set<string>();
  const settleOrder: string[] = [];

  for (const n of graph.nodes) {
    dist.set(n, Infinity);
    prev.set(n, null);
    prevEdge.set(n, null);
  }
  dist.set(source, 0);

  const heap = new MinHeap();
  heap.push({ node: source, dist: 0 });

  while (heap.size > 0) {
    const current = heap.pop()!;
    if (settled.has(current.node)) continue;
    if (current.dist > (dist.get(current.node) ?? Infinity)) continue;

    settled.add(current.node);
    settleOrder.push(current.node);

    if (options.target && current.node === options.target) break;

    for (const entry of graph.adjacency.get(current.node) ?? []) {
      const candidate = current.dist + entry.weight;
      if (candidate < (dist.get(entry.to) ?? Infinity)) {
        dist.set(entry.to, candidate);
        prev.set(entry.to, current.node);
        prevEdge.set(entry.to, entry.edgeId);
        heap.push({ node: entry.to, dist: candidate });
      }
    }
  }

  return { dist, prev, prevEdge, settleOrder, visitedCount: settled.size };
}

function reconstruct(
  trace: DijkstraTrace,
  source: string,
  target: string,
): { path: string[]; edgeIds: string[] } {
  const path: string[] = [];
  const edgeIds: string[] = [];
  let current: string | null = target;
  const guard = trace.prev.size + 1;
  let steps = 0;
  while (current !== null && steps <= guard) {
    path.push(current);
    const e = trace.prevEdge.get(current);
    if (e) edgeIds.push(e);
    if (current === source) break;
    current = trace.prev.get(current) ?? null;
    steps++;
  }
  path.reverse();
  edgeIds.reverse();
  return { path, edgeIds };
}

/** Convenience wrapper returning the AquaMind PathResult shape + timing. */
export function shortestPath(
  graph: WeightedGraph,
  source: string,
  target: string,
): PathResult {
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  let trace: DijkstraTrace;
  try {
    trace = dijkstra(graph, source, { target });
  } catch (err) {
    return {
      found: false,
      path: [],
      edgeIds: [],
      totalCost: 0,
      edgesTraversed: 0,
      visitedCount: 0,
      executionMs: 0,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  const ended =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const executionMs = ended - started;

  const targetDist = trace.dist.get(target);
  if (targetDist === undefined || !Number.isFinite(targetDist)) {
    return {
      found: false,
      path: [],
      edgeIds: [],
      totalCost: 0,
      edgesTraversed: 0,
      visitedCount: trace.visitedCount,
      executionMs,
      reason: `No path exists between ${source} and ${target}.`,
    };
  }

  const { path, edgeIds } = reconstruct(trace, source, target);

  return {
    found: true,
    path,
    edgeIds,
    totalCost: targetDist,
    edgesTraversed: Math.max(0, path.length - 1),
    visitedCount: trace.visitedCount,
    executionMs,
  };
}

/** Build a graph directly from raw edge tuples (test convenience). */
export function buildGraphFromEdges(
  edges: AlgorithmEdge[],
  directed = false,
): WeightedGraph {
  const nodes = new Set<string>();
  for (const e of edges) {
    nodes.add(e.from);
    nodes.add(e.to);
  }
  return buildWeightedGraph(nodes, edges, directed);
}
