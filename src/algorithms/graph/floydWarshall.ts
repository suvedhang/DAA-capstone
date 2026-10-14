/**
 * Floyd–Warshall all-pairs shortest paths.
 *
 * Time complexity:  O(V^3)
 * Space complexity: O(V^2)
 *
 * Because the all-pairs table is V^2, this is only practical on small graphs.
 * `buildAllPairs` refuses to run above `maxNodes` (default 600) and returns a
 * clear reason instead of exhausting memory.
 */
import type { AllPairsResult } from "../../types";
import type { WeightedGraph } from "./graph";

export interface FloydWarshallOptions {
  maxNodes?: number;
  /** Pairs (by index) to trace across k iterations, for the Algorithm Lab. */
  tracePairs?: [number, number][];
}

export function floydWarshall(
  graph: WeightedGraph,
  options: FloydWarshallOptions = {},
): AllPairsResult {
  const maxNodes = options.maxNodes ?? 600;
  const nodeIds = graph.nodes.slice();
  const n = nodeIds.length;

  if (n > maxNodes) {
    return {
      found: false,
      reason: `Graph has ${n} nodes, exceeding the ${maxNodes}-node limit for a naive O(V^3) all-pairs computation. Use Dijkstra for individual routes, or run Floyd–Warshall on a smaller fixture.`,
      nodeIds,
      dist: [],
      next: [],
      executionMs: 0,
      pairCount: 0,
      reachablePairs: 0,
    };
  }

  const index = new Map<string, number>();
  nodeIds.forEach((id, i) => index.set(id, i));

  const dist: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(Infinity),
  );
  const next: string[][] = Array.from({ length: n }, () =>
    new Array<string>(n).fill(""),
  );

  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    next[i][i] = nodeIds[i];
  }

  for (const e of graph.edges) {
    const a = index.get(e.from);
    const b = index.get(e.to);
    if (a === undefined || b === undefined) continue;
    if (e.weight < dist[a][b]) {
      dist[a][b] = e.weight;
      next[a][b] = nodeIds[b];
    }
    if (!graph.directed && e.weight < dist[b][a]) {
      dist[b][a] = e.weight;
      next[b][a] = nodeIds[a];
    }
  }

  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const pairTrace: { k: number; dists: { i: number; j: number; d: number }[] }[] = [];
  const snapshot = () => {
    if (!options.tracePairs?.length) return;
    const dists = options.tracePairs.map(([i, j]) => ({
      i,
      j,
      d: dist[i][j],
    }));
    pairTrace.push({ k: pairTrace.length, dists });
  };

  snapshot();
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      const dik = dist[i][k];
      if (dik === Infinity) continue;
      const rowI = dist[i];
      const nextI = next[i];
      const rowK = dist[k];
      for (let j = 0; j < n; j++) {
        const through = dik + rowK[j];
        if (through < rowI[j]) {
          rowI[j] = through;
          // First hop from i toward j passing through k is the first hop from
          // i toward k (kept fresh in the same k-iteration, which is stable
          // because dist[i][k] cannot improve via k itself).
          nextI[j] = nextI[k];
        }
      }
    }
    snapshot();
  }

  const ended =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  let reachablePairs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && dist[i][j] !== Infinity) reachablePairs++;
    }
  }

  return {
    found: true,
    nodeIds,
    dist,
    next,
    executionMs: ended - started,
    pairCount: n * n,
    reachablePairs,
    pairTrace: pairTrace.length > 0 ? pairTrace : undefined,
  };
}

/** Reconstruct the path between two node ids from a Floyd–Warshall result. */
export function reconstructAllPairsPath(
  result: AllPairsResult,
  source: string,
  target: string,
): string[] {
  if (!result.found) return [];
  const index = new Map<string, number>();
  result.nodeIds.forEach((id, i) => index.set(id, i));
  const i = index.get(source);
  const j = index.get(target);
  if (i === undefined || j === undefined) return [];
  if (result.next[i][j] === "") return [];

  const path: string[] = [source];
  let current = source;
  const guard = result.nodeIds.length + 1;
  let steps = 0;
  while (current !== target && steps <= guard) {
    const ci = index.get(current)!;
    current = result.next[ci][j];
    if (!current) return [];
    path.push(current);
    steps++;
  }
  return path;
}
