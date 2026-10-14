import * as React from "react";
import { Activity, GitBranch, Hammer, Network as NetworkIcon, TreePine } from "lucide-react";
import { useDataset } from "@/hooks/useDataset";
import { SAMPLE_GRAPH_EDGES, REPAIR_CANDIDATES } from "@/app/fixtures";
import { buildGraphFromEdges } from "@/algorithms/graph/dijkstra";
import { kruskal, prim } from "@/algorithms/graph/mst";
import { dijkstra, shortestPath } from "@/algorithms/graph/dijkstra";
import { bfsSubgraph, type WeightedGraph } from "@/algorithms/graph/graph";
import { selectRepairs } from "@/algorithms/backtracking/backtracking";
import { toWeightedGraph } from "@/services/data/graphBuilder";
import type { MstResult } from "@/types";
import { SectionHeader } from "@/components/common/section-header";
import { DataBadge } from "@/components/common/section-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, Label } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ActiveEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
}

export default function RecoveryPage() {
  const { graph: networkGraph } = useDataset();
  const [fixture, setFixture] = React.useState<"sample" | "real">("sample");
  const [failedEdgeId, setFailedEdgeId] = React.useState<string>("");
  const [targetNode, setTargetNode] = React.useState<string>("");
  const [repairBudget, setRepairBudget] = React.useState(10);

  const hub = React.useMemo(() => {
    if (!networkGraph) return null;
    let best: string | null = null;
    let bestDeg = -1;
    for (const [id, edges] of networkGraph.adjacency) {
      if (edges.length > bestDeg) {
        best = id;
        bestDeg = edges.length;
      }
    }
    return best;
  }, [networkGraph]);

  const activeGraph = React.useMemo<WeightedGraph>(() => {
    if (fixture === "sample") return buildGraphFromEdges(SAMPLE_GRAPH_EDGES, false);
    if (networkGraph && hub) {
      const wg = toWeightedGraph(networkGraph, "length");
      return bfsSubgraph(wg, hub, 60);
    }
    return buildGraphFromEdges([], false);
  }, [fixture, networkGraph, hub]);

  const edges: ActiveEdge[] = React.useMemo(
    () => activeGraph.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, weight: e.weight })),
    [activeGraph],
  );

  const failed = failedEdgeId ? activeGraph.edges.find((e) => e.id === failedEdgeId) ?? null : null;
  const baselineEdges = activeGraph.edges.filter((e) => e.id !== failedEdgeId);
  const baseline = React.useMemo(
    () => buildGraphFromEdges(baselineEdges, activeGraph.directed),
    [activeGraph, failedEdgeId],
  );

  const baseDijk = React.useMemo(
    () =>
      targetNode
        ? shortestPath(baseline, baseline.nodes[0], targetNode)
        : null,
    [baseline, targetNode],
  );

  const [mstK, mstP] = React.useMemo(() => [kruskal(baseline), prim(baseline)], [baseline]);

  const reachableBefore = React.useMemo(() => {
    const from = baseline.nodes[0];
    const trace = dijkstra(baseline, from);
    return new Set(Array.from(baseline.nodes).filter((n) => Number.isFinite(trace.dist.get(n) ?? Infinity)));
  }, [baseline]);

  const reachableAfter = React.useMemo(() => {
    if (!failed) return reachableBefore;
    const trace = dijkstra(baseline, baseline.nodes[0]);
    return new Set(
      Array.from(baseline.nodes).filter((n) => Number.isFinite(trace.dist.get(n) ?? Infinity)),
    );
  }, [baseline, failed, reachableBefore]);

  const newlyUnreachable = React.useMemo(() => {
    const out: string[] = [];
    for (const n of reachableBefore) {
      if (!reachableAfter.has(n)) out.push(n);
    }
    return out;
  }, [reachableBefore, reachableAfter]);

  const repair = React.useMemo(() => selectRepairs({ candidates: REPAIR_CANDIDATES, budget: repairBudget }), [repairBudget]);

  React.useEffect(() => {
    if (edges.length > 0 && !edges.some((e) => e.id === failedEdgeId)) {
      setFailedEdgeId(edges[0].id);
    }
  }, [edges, failedEdgeId]);

  React.useEffect(() => {
    if (!targetNode && activeGraph.nodes.length > 0) {
      setTargetNode(activeGraph.nodes[activeGraph.nodes.length - 1]);
    }
  }, [activeGraph, targetNode]);

  const edgeLabel = (e: ActiveEdge) => `${e.id} — ${e.from} ⇄ ${e.to} (${e.weight.toLocaleString(undefined, { maximumFractionDigits: 0 })}${fixture === "real" ? " m" : ""})`;

  return (
    <div className="h-full overflow-y-auto p-4 thin-scroll">
      <div className="mx-auto max-w-7xl space-y-4">
        <SectionHeader
          icon={Activity}
          title="Distribution network & failure recovery"
          description="Spanning trees, edge-failure simulation and constrained repair search. Failure simulation disables an edge in the demonstration graph only — it never claims a real pipe is broken."
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <NetworkIcon className="h-4 w-4 text-cyan-brand" /> Demonstration graph
              </CardTitle>
              <DataBadge kind={fixture === "sample" ? "simulated" : "inferred"} />
            </div>
            <CardDescription>
              {fixture === "sample"
                ? "A hand-check sample fixture — ideal for verifying MST and failure behaviour by eye."
                : "A 60-node connected subgraph drawn from the real network around its highest-degree node."}
              A failed edge produces a minimum spanning <em>forest</em>, exercising disconnected-graph handling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-48 space-y-1">
                <Label htmlFor="fixture">Graph source</Label>
                <Select id="fixture" value={fixture} onChange={(e) => setFixture(e.target.value as "sample" | "real")}>
                  <option value="sample">Sample mini-graph</option>
                  <option value="real">Real subgraph (60 nodes)</option>
                </Select>
              </div>
              <div className="w-72 space-y-1">
                <Label htmlFor="failed">Failed (disabled) edge — simulation</Label>
                <Select id="failed" value={failedEdgeId} onChange={(e) => setFailedEdgeId(e.target.value)}>
                  {edges.map((e) => (
                    <option key={e.id} value={e.id}>
                      {edgeLabel(e)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-56 space-y-1">
                <Label htmlFor="target">Destination for route check</Label>
                <Select id="target" value={targetNode} onChange={(e) => setTargetNode(e.target.value)}>
                  {activeGraph.nodes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                onClick={() => setFailedEdgeId("")}
                className="h-8 rounded border border-white/12 px-3 text-xs text-ink-muted hover:text-ink hover:border-white/25"
              >
                Clear failure
              </button>
            </div>

            <GraphView
              graph={activeGraph}
              mstEdgeIds={mstK.edges.map((e) => e.edgeId)}
              failedEdgeId={failedEdgeId}
              routeNodes={baseDijk?.path ?? []}
              useLengths={fixture === "real"}
            />

            <div className="grid gap-3 md:grid-cols-3">
              <StatusPanel
                title="After failure"
                tone="warn"
                items={[
                  { label: "Disabled edge", value: failed ? `${failed.from} ⇄ ${failed.to}` : "none" },
                  { label: "Newly unreachable from root", value: newlyUnreachable.length > 0 ? newlyUnreachable.join(", ") : "none" },
                ]}
              />
              <StatusPanel
                title="Route to destination"
                tone="default"
                items={[
                  {
                    label: "Before failure",
                    value: baseDijk ? (baseDijk.found ? baseDijk.totalCost.toFixed(1) : "unreachable") : "—",
                  },
                  {
                    label: "After failure",
                    value:
                      failedEdgeId && targetNode
                        ? (() => {
                            const trace = dijkstra(baseline, baseline.nodes[0], { target: targetNode });
                            const d = trace.dist.get(targetNode);
                            return Number.isFinite(d) ? `${d!.toFixed(1)}` : "no alternative path";
                          })()
                        : "no failure active",
                  },
                ]}
              />
              <StatusPanel
                title="Graph integrity"
                tone="good"
                items={[
                  { label: "Components", value: String(mstK.componentCount) },
                  { label: "Connected", value: mstK.connected ? "yes" : "no (forest)" },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-4 w-4 text-aqua-soft" /> Minimum spanning tree — Kruskal vs Prim
            </CardTitle>
            <CardDescription>
              An MST minimises the total weight of edges spanning a connected graph. It is <strong>not</strong> a
              hydraulic design (meshed networks give resilience); the component count is reported so disconnected graphs
              are handled honestly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <MstPanel title="Kruskal" result={mstK} />
              <MstPanel title="Prim" result={mstP} />
            </div>
            {fixture === "real" && networkGraph ? (
              <div className="mt-3">
                <NetworkWideMst networkGraph={networkGraph} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-cyan-brand" /> Repair search — backtracking with branch &amp; bound
            </CardTitle>
            <CardDescription>
              Choose which candidate repairs to perform within a budget to maximise restored nodes. Decisions branch
              include/exclude; subtrees that can't beat the incumbent are pruned.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-ink-faint">
                Repair budget: <span className="text-ink">{repairBudget}</span>
              </p>
              <Slider
                value={[repairBudget]}
                min={0}
                max={20}
                step={1}
                onValueChange={(v) => setRepairBudget(v[0])}
                aria-label="Repair budget"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusPanel
                title="Selected repairs"
                tone="default"
                items={[
                  { label: "Count", value: String(repair.selected.length) },
                  { label: "Total cost", value: String(repair.totalCost) },
                  { label: "Ids", value: repair.selected.join(", ") || "—" },
                ]}
              />
              <StatusPanel
                title="Search"
                tone="good"
                items={[
                  { label: "Explored states", value: repair.exploredStates.toLocaleString() },
                  { label: "Pruned states", value: repair.prunedStates.toLocaleString() },
                  { label: "Time", value: `${repair.executionMs.toFixed(2)} ms` },
                ]}
              />
              <StatusPanel
                title="Coverage"
                tone="cyan"
                items={[
                  { label: "Restored nodes", value: String(repair.coveredNodes.length) },
                  { label: "Optimal", value: repair.optimal ? "proven" : "best incumbent" },
                ]}
              />
            </div>
            {repair.reason ? <p className="text-2xs text-amber-brand">{repair.reason}</p> : null}
            <p className="text-2xs leading-relaxed text-ink-faint">
              Worst-case time is O(2<sup>N</sup>); branch-and-bound keeps the demo instant. Repair candidates and the
              node ids they restore are a synthetic fixture for exercising the algorithm.
            </p>
          </CardContent>
        </Card>

        <Separator />
        <div className="flex flex-wrap gap-1.5 pb-2">
          <Badge variant="muted">Kruskal: O(E log E)</Badge>
          <Badge variant="muted">Prim: O(E log V)</Badge>
          <Badge variant="muted">Backtracking: O(2^N) worst case</Badge>
        </div>
      </div>
    </div>
  );
}

function MstPanel({ title, result }: { title: string; result: MstResult }) {
  return (
    <div className="rounded-lg border border-white/10 bg-abyss-100/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">{title}</p>
        <Badge variant={result.connected ? "success" : "warning"}>
          {result.connected ? "connected" : `${result.componentCount} components`}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-2xs">
        <Row label="Total weight" value={result.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
        <Row label="Edges chosen" value={String(result.edges.length)} />
        <Row label="Time" value={`${result.executionMs.toFixed(2)} ms`} />
        <Row label="Nodes" value={String(result.nodeCount)} />
      </div>
      <p className="mt-2 max-h-16 overflow-y-auto text-2xs leading-relaxed text-ink-faint">
        {result.edges
          .slice(0, 20)
          .map((e) => `${e.from}-${e.to}`)
          .join(", ")}
        {result.edges.length > 20 ? ` … +${result.edges.length - 20} more` : ""}
      </p>
      {!result.connected ? (
        <p className="mt-2 text-2xs text-amber-brand">
          The graph is disconnected, so the result is a spanning forest across all components.
        </p>
      ) : null}
    </div>
  );
}

function NetworkWideMst({ networkGraph }: { networkGraph: NonNullable<ReturnType<typeof useDataset>["graph"]> }) {
  const result = React.useMemo(() => {
    const wg = toWeightedGraph(networkGraph, "length");
    return kruskal(wg);
  }, [networkGraph]);
  return (
    <div className="rounded-lg border border-white/10 bg-abyss-100/40 p-3 text-2xs">
      <div className="flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-aqua-soft" />
        <p className="font-medium text-ink">Kruskal on the full real network</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Row label="Edges chosen" value={result.edges.length.toLocaleString()} />
        <Row
          label="Total weight"
          value={`${result.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })} m`}
        />
        <Row label="Components" value={result.componentCount.toLocaleString()} />
        <Row label="Connected network" value={result.connected ? "yes" : "no"} />
      </div>
      <p className="mt-2 leading-relaxed text-ink-faint">
        This reflects recorded/inferred topology only — not current pipe condition. In a networked system the MST is
        still just a lower-bound skeleton for trunk sizing, not an operational design.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-white/8 bg-white/[0.02] px-2 py-1.5">
      <span className="text-ink-faint">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  );
}

function StatusPanel({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "default" | "good" | "warn" | "cyan";
  items: { label: string; value: string }[];
}) {
  const toneClass = {
    default: "text-ink-faint",
    good: "text-aqua-soft",
    warn: "text-amber-brand",
    cyan: "text-cyan-soft",
  }[tone];
  return (
    <div className="rounded-lg border border-white/10 bg-abyss-100/40 p-3">
      <p className="text-xs font-semibold text-ink">{title}</p>
      <dl className="mt-2 space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="text-2xs">
            <dt className="text-ink-faint">{item.label}</dt>
            <dd className={toneClass}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function GraphView({
  graph,
  mstEdgeIds,
  failedEdgeId,
  routeNodes,
  useLengths,
}: {
  graph: WeightedGraph;
  mstEdgeIds: string[];
  failedEdgeId: string;
  routeNodes: string[];
  useLengths: boolean;
}) {
  const W = 720;
  const H = 340;
  const nodes = graph.nodes;

  if (nodes.length > 120 || nodes.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-white/10 text-2xs text-ink-faint">
        {nodes.length === 0 ? "Graph contains no nodes." : "Graph too large to draw as a fixture; use the map for the full network."}
      </div>
    );
  }

  const cx = W / 2;
  const cy = H / 2;
  const rx = W / 2 - 60;
  const ry = H / 2 - 45;
  const pos = new Map<string, [number, number]>();
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos.set(n, [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  });

  const scale = (n: number) => (useLengths && n > 100 ? Math.sqrt(n / 10) : n);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-white/8 bg-abyss-100/30" role="img" aria-label="Network graph visualization">
      {graph.edges.map((e) => {
        const [x1, y1] = pos.get(e.from)!;
        const [x2, y2] = pos.get(e.to)!;
        const isMst = mstEdgeIds.includes(e.id);
        const isFailed = e.id === failedEdgeId;
        const onRoute = routeNodes.includes(e.from) && routeNodes.includes(e.to);
        const stroke = isFailed ? "#FF5C6C" : isMst ? "#2DD4A7" : onRoute ? "#00C8E8" : "rgba(148,178,194,0.28)";
        const width = isFailed ? 2.5 : isMst ? 2.2 : onRoute ? 2.2 : 1;
        return (
          <g key={e.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} strokeDasharray={isFailed ? "5 4" : undefined} />
            <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize={9} fill="#5C7484" fontFamily="monospace">
              {scale(e.weight) >= 10 ? Math.round(e.weight) : e.weight}
            </text>
          </g>
        );
      })}
      {nodes.map((n) => {
        const [x, y] = pos.get(n)!;
        const isRoute = routeNodes.includes(n);
        return (
          <g key={n}>
            <circle cx={x} cy={y} r={isRoute ? 7 : 5} fill={isRoute ? "#00C8E8" : "#14384B"} stroke={isRoute ? "#E6F1F7" : "#4D8BA6"} strokeWidth={1.5} />
            <text x={x} y={y - 10} textAnchor="middle" fontSize={10} fill={isRoute ? "#E6F1F7" : "#93AAB8"} fontFamily="monospace">
              {n.length > 11 ? `${n.slice(0, 10)}…` : n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}