/**
 * Lightweight, dependency-free weighted graph primitives used by every
 * algorithm in AquaMind. Kept separate from the map/GeoJSON layers so the
 * algorithms are pure and independently testable.
 */

export interface AlgorithmEdge {
  id: string;
  from: string;
  to: string;
  /** Non-negative cost. Algorithms assume weights >= 0. */
  weight: number;
}

export interface AdjacentEntry {
  to: string;
  weight: number;
  edgeId: string;
}

export interface WeightedGraph {
  nodes: string[];
  edges: AlgorithmEdge[];
  /** nodeId -> outgoing entries (undirected graphs add both directions). */
  adjacency: Map<string, AdjacentEntry[]>;
  directed: boolean;
}

export function buildWeightedGraph(
  nodes: Iterable<string>,
  edges: Iterable<AlgorithmEdge>,
  directed = false,
): WeightedGraph {
  const nodeList = Array.from(new Set(nodes));
  const nodeSet = new Set(nodeList);
  const edgeList: AlgorithmEdge[] = [];
  const adjacency = new Map<string, AdjacentEntry[]>();

  const ensure = (id: string) => {
    if (!adjacency.has(id)) adjacency.set(id, []);
    if (!nodeSet.has(id)) {
      nodeSet.add(id);
      nodeList.push(id);
    }
  };

  for (const n of nodeList) ensure(n);

  for (const e of edges) {
    if (!Number.isFinite(e.weight) || e.weight < 0) {
      throw new Error(
        `Edge ${e.id} has invalid weight: ${e.weight}. Weights must be finite and non-negative.`,
      );
    }
    ensure(e.from);
    ensure(e.to);
    edgeList.push(e);
    adjacency.get(e.from)!.push({ to: e.to, weight: e.weight, edgeId: e.id });
    if (!directed) {
      adjacency.get(e.to)!.push({ to: e.from, weight: e.weight, edgeId: e.id });
    }
  }

  return { nodes: nodeList, edges: edgeList, adjacency, directed };
}

/** Union-Find with path compression + union by rank. */
export class DisjointSet {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  constructor(nodes: Iterable<string>) {
    for (const n of nodes) {
      this.parent.set(n, n);
      this.rank.set(n, 0);
    }
  }

  find(x: string): string {
    const root = this.parent.get(x);
    if (root === undefined) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }
    const path: string[] = [];
    let current = root;
    while (this.parent.get(current) !== current) {
      const next = this.parent.get(current);
      if (next === undefined || next === current) break;
      path.push(current);
      current = next;
    }
    for (const n of path) this.parent.set(n, current);
    return current;
  }

  union(a: string, b: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
    return true;
  }
}

/** Count connected components over an undirected graph. O(V + E). */
export function countComponents(graph: WeightedGraph): number {
  const ds = new DisjointSet(graph.nodes);
  for (const e of graph.edges) ds.union(e.from, e.to);
  const roots = new Set<string>();
  for (const n of graph.nodes) roots.add(ds.find(n));
  return roots.size;
}

/** Returns the set of node ids in the largest connected component. */
export function largestComponent(graph: WeightedGraph): Set<string> {
  const ds = new DisjointSet(graph.nodes);
  for (const e of graph.edges) ds.union(e.from, e.to);
  const groups = new Map<string, string[]>();
  for (const n of graph.nodes) {
    const r = ds.find(n);
    const arr = groups.get(r) ?? [];
    arr.push(n);
    groups.set(r, arr);
  }
  let best: string[] = [];
  for (const arr of groups.values()) if (arr.length > best.length) best = arr;
  return new Set(best);
}

/**
 * Extract a connected subgraph around `seed` via breadth-first traversal,
 * capped at `maxNodes`. Useful for running O(V^3) algorithms on a tractable
 * neighbourhood of a very large graph.
 */
export function bfsSubgraph(graph: WeightedGraph, seed: string, maxNodes: number): WeightedGraph {
  if (!graph.adjacency.has(seed)) throw new Error(`Seed node "${seed}" not found.`);
  const visited = new Set<string>([seed]);
  const queue: string[] = [seed];
  while (queue.length > 0 && visited.size < maxNodes) {
    const node = queue.shift()!;
    for (const entry of graph.adjacency.get(node) ?? []) {
      if (!visited.has(entry.to) && visited.size < maxNodes) {
        visited.add(entry.to);
        queue.push(entry.to);
      }
    }
  }
  const edges = graph.edges.filter((e) => visited.has(e.from) && visited.has(e.to));
  return buildWeightedGraph(visited, edges, graph.directed);
}

