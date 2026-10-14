import * as React from "react";
import { ArrowRightLeft, Play, Route as RouteIcon, Timer, Waypoints, X } from "lucide-react";
import { useAppStore, type RouteHighlight } from "@/app/store";
import { useDataset } from "@/hooks/useDataset";
import { EDGE_COST_METRICS, toWeightedGraph } from "@/services/data/graphBuilder";
import { shortestPath } from "@/algorithms/graph/dijkstra";
import { floydWarshall, reconstructAllPairsPath } from "@/algorithms/graph/floydWarshall";
import { bfsSubgraph } from "@/algorithms/graph/graph";
import type { AllPairsResult, EdgeCostMetric, NetworkGraph, PathResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, Input, Label } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DataBadge } from "@/components/common/section-header";
import { ErrorState } from "@/components/common/states";
import { cn } from "@/lib/utils";

function NodeSelect({
  label,
  value,
  onChange,
  nodeIds,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  nodeIds: string[];
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodeIds.slice(0, 30);
    const out: string[] = [];
    for (const id of nodeIds) {
      if (id.toLowerCase().includes(q)) {
        out.push(id);
        if (out.length >= 30) break;
      }
    }
    return out;
  }, [query, nodeIds]);

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search a node id…"
          spellCheck={false}
        />
        {open && matches.length > 0 && value !== matches[0] ? (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-white/12 bg-abyss-200 py-1 shadow-xl thin-scroll">
            {matches.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="w-full truncate px-3 py-1.5 text-left font-mono text-2xs text-ink-muted hover:bg-white/[0.05] hover:text-ink"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(id);
                    setQuery(id);
                    setOpen(false);
                  }}
                >
                  {id}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function findEdgeBetween(graph: NetworkGraph, a: string, b: string): string | null {
  let best: { id: string; w: number } | null = null;
  for (const e of graph.adjacency.get(a) ?? []) {
    if (e.to === b || e.from === b) {
      const w = e.lengthM ?? e.weight ?? 0;
      if (!best || w < best.w) best = { id: e.id, w };
    }
  }
  return best?.id ?? null;
}

export function RoutePlanner() {
  const { graph } = useDataset();
  const setRouteStore = useAppStore((s) => s.setRoute);

  const nodeIds = React.useMemo(
    () => (graph ? Array.from(graph.nodes.keys()).sort() : []),
    [graph],
  );

  const [source, setSource] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [metric, setMetric] = React.useState<EdgeCostMetric>("length");
  const [dijkstraResult, setDijkstraResult] = React.useState<PathResult | null>(null);
  const [apResult, setApResult] = React.useState<AllPairsResult | null>(null);
  const [apSubgraphSize, setApSubgraphSize] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // Seed defaults once the graph is available.
  React.useEffect(() => {
    if (!graph || nodeIds.length === 0) return;
    if (!source) setSource(nodeIds[0]);
    if (!target) setTarget(nodeIds[Math.min(nodeIds.length - 1, Math.floor(nodeIds.length / 2))]);
  }, [graph, nodeIds, source, target]);

  const highlight = React.useCallback(
    (path: string[], edgeIds: string[], totalCost: number, metricValue: EdgeCostMetric) => {
      const hl: RouteHighlight = { path, edgeIds, metric: metricValue, totalCost, nodes: path };
      setRouteStore(hl);
    },
    [setRouteStore],
  );

  const runDijkstra = () => {
    setError(null);
    setApResult(null);
    if (!graph) return;
    if (!graph.nodes.has(source) || !graph.nodes.has(target)) {
      setError("Select valid source and destination nodes that exist in the graph.");
      setDijkstraResult(null);
      return;
    }
    if (source === target) {
      setError("Source and destination are the same node.");
      setDijkstraResult(null);
      return;
    }
    const wg = toWeightedGraph(graph, metric);
    const result = shortestPath(wg, source, target);
    setDijkstraResult(result);
    if (result.found) {
      highlight(result.path, result.edgeIds, result.totalCost, metric);
    } else {
      setRouteStore(null);
    }
  };

  const runFloydWarshall = () => {
    setError(null);
    if (!graph) return;
    if (!graph.nodes.has(source) || !graph.nodes.has(target)) {
      setError("Select valid source and destination nodes.");
      return;
    }
    const wg = toWeightedGraph(graph, metric);
    const maxNodes = 300;
    let sub = wg;
    try {
      sub = bfsSubgraph(wg, source, maxNodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build a subgraph.");
      return;
    }
    setApSubgraphSize(sub.nodes.length);
    const result = floydWarshall(sub, { maxNodes: 1000 });
    setApResult(result);
    if (result.found) {
      const nodePath = reconstructAllPairsPath(result, source, target);
      if (nodePath.length >= 2) {
        const edgeIds: string[] = [];
        for (let i = 0; i < nodePath.length - 1; i++) {
          const eid = findEdgeBetween(graph, nodePath[i], nodePath[i + 1]);
          if (eid) edgeIds.push(eid);
        }
        const dist = result.dist[result.nodeIds.indexOf(source)][result.nodeIds.indexOf(target)];
        highlight(nodePath, edgeIds, dist, metric);
      }
    }
  };

  const clear = () => {
    setRouteStore(null);
    setDijkstraResult(null);
    setApResult(null);
    setError(null);
  };

  if (!graph) {
    return (
      <div className="panel rounded-lg p-4 text-xs text-ink-muted">
        The network graph is still being constructed from the mapped pipe features.
      </div>
    );
  }

  const comparison =
    dijkstraResult?.found && apResult?.found
      ? (() => {
          const idx = apResult.nodeIds.indexOf(target);
          const sidx = apResult.nodeIds.indexOf(source);
          if (idx < 0 || sidx < 0) return null;
          const fw = apResult.dist[sidx][idx];
          if (!Number.isFinite(fw)) return null;
          return { dijkstra: dijkstraResult.totalCost, fw, match: Math.abs(fw - dijkstraResult.totalCost) < 1e-6 };
        })()
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
          <RouteIcon className="h-3.5 w-3.5 text-cyan-brand" /> Route planner
        </p>
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <NodeSelect label="Source node" value={source} onChange={setSource} nodeIds={nodeIds} />
        <Button
          variant="outline"
          size="icon"
          className="mb-0.5"
          onClick={() => {
            setSource(target);
            setTarget(source);
          }}
          aria-label="Swap source and destination"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </Button>
        <NodeSelect label="Destination node" value={target} onChange={setTarget} nodeIds={nodeIds} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="metric">Edge-cost metric</Label>
        <Select id="metric" value={metric} onChange={(e) => setMetric(e.target.value as EdgeCostMetric)}>
          {EDGE_COST_METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <p className="text-2xs leading-snug text-ink-faint">
          {EDGE_COST_METRICS.find((m) => m.value === metric)?.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={runDijkstra} className="flex-1">
          <Play className="h-3.5 w-3.5" /> Run Dijkstra
        </Button>
        <Button size="sm" variant="secondary" onClick={runFloydWarshall} className="flex-1">
          <Waypoints className="h-3.5 w-3.5" /> Run Floyd–Warshall
        </Button>
      </div>

      {error ? <ErrorState title="Cannot compute route" description={error} /> : null}

      {dijkstraResult ? (
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-cyan-brand" /> Dijkstra result
            </p>
            <DataBadge kind="simulated" />
          </div>
          {dijkstraResult.found ? (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Stat label="Total cost" value={dijkstraResult.totalCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
              <Stat label="Edges" value={dijkstraResult.edgesTraversed.toString()} />
              <Stat label="Visited" value={dijkstraResult.visitedCount.toLocaleString()} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-coral-soft">{dijkstraResult.reason}</p>
          )}
          <p className="mt-2 text-2xs text-ink-faint">
            Execution time: {dijkstraResult.executionMs.toFixed(2)} ms · metric:{" "}
            {EDGE_COST_METRICS.find((m) => m.value === metric)?.label}
          </p>
        </div>
      ) : null}

      {apResult ? (
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink">Floyd–Warshall result</p>
            <DataBadge kind="simulated" />
          </div>
          {apResult.found ? (
            <>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Stat label="Nodes" value={apResult.nodeIds.length.toLocaleString()} />
                <Stat label="Reachable pairs" value={apResult.reachablePairs.toLocaleString()} />
                <Stat label="Time" value={`${apResult.executionMs.toFixed(0)} ms`} />
              </div>
              <p className="mt-2 text-2xs text-ink-faint">
                Ran on a BFS subgraph of {apSubgraphSize} nodes around the source (O(V³) is infeasible on the full
                network). Complexity: O(V³) time, O(V²) memory.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-amber-brand">{apResult.reason}</p>
          )}
        </div>
      ) : null}

      {comparison ? (
        <div className="rounded-md border border-cyan-brand/25 bg-cyan-brand/[0.06] p-3 text-2xs">
          <p className="font-medium text-cyan-soft">Cross-check on the subgraph</p>
          <div className="mt-1.5 flex items-center justify-between font-mono text-ink-muted">
            <span>Dijkstra: {comparison.dijkstra.toFixed(2)}</span>
            <span>Floyd–Warshall: {comparison.fw.toFixed(2)}</span>
            <span className={comparison.match ? "text-aqua-soft" : "text-amber-brand"}>
              {comparison.match ? "match" : "differs"}
            </span>
          </div>
        </div>
      ) : null}

      <Separator />
      <p className="text-2xs leading-relaxed text-ink-faint">
        Shortest-path cost is a <strong>graph distance</strong> (recorded pipe length, hop count, or an inverse-diameter
        heuristic). It is <strong>not</strong> a hydraulic head-loss, pressure, or water-quality model, and a shortest
        path is not necessarily the safest or most hydraulically valid route.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded border border-white/8 bg-white/[0.02] px-2 py-1.5")}>
      <p className="text-2xs text-ink-faint">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-ink">{value}</p>
    </div>
  );
}
