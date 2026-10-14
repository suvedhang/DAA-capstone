import * as React from "react";
import { FlaskConical } from "lucide-react";
import { SAMPLE_GRAPH_EDGES, DEMAND_ZONES, DEFAULT_SUPPLY_MLD, REPAIR_CANDIDATES } from "@/app/fixtures";
import { buildGraphFromEdges } from "@/algorithms/graph/dijkstra";
import { dijkstra, shortestPath } from "@/algorithms/graph/dijkstra";
import { floydWarshall, reconstructAllPairsPath } from "@/algorithms/graph/floydWarshall";
import { kruskal, prim } from "@/algorithms/graph/mst";
import { greedyAllocation } from "@/algorithms/optimization/greedyAllocation";
import { knapsackAllocation } from "@/algorithms/optimization/knapsack";
import { dpAllocation } from "@/algorithms/optimization/dpAllocation";
import { selectRepairs } from "@/algorithms/backtracking/backtracking";
import type { DemandZone } from "@/algorithms/optimization/types";
import { SectionHeader } from "@/components/common/section-header";
import { DataBadge } from "@/components/common/section-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Table, Th, Td } from "@/components/ui/skeleton-table";
import { cn } from "@/lib/utils";

const SAMPLE_GRAPH = buildGraphFromEdges(SAMPLE_GRAPH_EDGES, false);

const ALGOS = [
  { id: "dijkstra", label: "Dijkstra", group: "Shortest paths" },
  { id: "floyd", label: "Floyd–Warshall", group: "Shortest paths" },
  { id: "kruskal", label: "Kruskal", group: "Spanning trees" },
  { id: "prim", label: "Prim", group: "Spanning trees" },
  { id: "greedy", label: "Greedy allocation", group: "Allocation" },
  { id: "knapsack", label: "Knapsack", group: "Allocation" },
  { id: "dp", label: "DP allocation", group: "Allocation" },
  { id: "backtracking", label: "Backtracking", group: "Search" },
] as const;

type AlgoId = (typeof ALGOS)[number]["id"];

const SMALL_ZONES: DemandZone[] = [
  { id: "a", name: "Zone A (essential)", type: "essential", demand: 3, priority: 1, simulated: true },
  { id: "b", name: "Zone B (residential)", type: "residential", demand: 2, priority: 2, simulated: true },
  { id: "c", name: "Zone C (residential)", type: "residential", demand: 4, priority: 2, simulated: true },
  { id: "d", name: "Zone D (agricultural)", type: "agricultural", demand: 2, priority: 5, simulated: true },
];

export default function AlgorithmLabPage() {
  const [algo, setAlgo] = React.useState<AlgoId>("dijkstra");
  return (
    <div className="h-full overflow-y-auto p-4 thin-scroll">
      <div className="mx-auto max-w-6xl space-y-4">
        <SectionHeader
          icon={FlaskConical}
          title="Algorithm laboratory"
          description="Reproducible, hand-checkable runs of every algorithm used across AquaMind — purpose, complexity, intermediate states, output, and measured runtime. Every fixture below is labelled real-mapped or synthetic."
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select an algorithm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(["Shortest paths", "Spanning trees", "Allocation", "Search"] as const).map((group) => (
                <div key={group} className="flex flex-wrap items-center gap-1.5">
                  <span className="px-1 text-2xs font-medium uppercase tracking-wider text-ink-faint">{group}</span>
                  {ALGOS.filter((a) => a.group === group).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAlgo(a.id)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        algo === a.id
                          ? "border-cyan-brand/50 bg-cyan-brand/12 text-cyan-soft"
                          : "border-white/12 text-ink-muted hover:border-white/25 hover:text-ink",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {algo === "dijkstra" ? <DijkstraDemo /> : null}
        {algo === "floyd" ? <FloydDemo /> : null}
        {algo === "kruskal" ? <KruskalDemo /> : null}
        {algo === "prim" ? <PrimDemo /> : null}
        {algo === "greedy" ? <GreedyDemo /> : null}
        {algo === "knapsack" ? <KnapsackDemo /> : null}
        {algo === "dp" ? <DpDemo /> : null}
        {algo === "backtracking" ? <BacktrackingDemo /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DemoShell({
  title,
  purpose,
  inputKind,
  complexity,
  space,
  children,
}: {
  title: string;
  purpose: string;
  inputKind: "real" | "simulated";
  complexity: string;
  space: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <DataBadge kind={inputKind} />
        </div>
        <CardDescription>{purpose}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge>Time: {complexity}</Badge>
          <Badge variant="muted">Space: {space}</Badge>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function StepList({ steps }: { steps: { idx: string; note: string }[] }) {
  return (
    <ol className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-white/8 bg-abyss-100/40 p-2 thin-scroll">
      {steps.map((s) => (
        <li key={s.idx} className="flex items-start gap-2 text-2xs">
          <span className="mt-0.5 shrink-0 rounded bg-white/[0.06] px-1.5 font-mono text-ink-faint">{s.idx}</span>
          <span className="text-ink-muted">{s.note}</span>
        </li>
      ))}
    </ol>
  );
}

function DijkstraDemo() {
  const [source, setSource] = React.useState("A");
  const [target, setTarget] = React.useState("F");
  const trace = React.useMemo(() => dijkstra(SAMPLE_GRAPH, source, { target }), [source, target]);
  const result = React.useMemo(() => shortestPath(SAMPLE_GRAPH, source, target), [source, target]);

  const steps = React.useMemo(() => {
    return trace.settleOrder.map((node) => ({
      idx: String(trace.settleOrder.indexOf(node) + 1),
      note: `Settle ${node} · dist ${formatNum(trace.dist.get(node))}${node === target ? " (destination reached — stop early)" : ""}`,
    }));
  }, [trace, target]);

  return (
    <DemoShell
      title="Dijkstra — shortest path on the sample graph"
      purpose="Settles nodes in order of increasing distance using a binary heap. Stop-early optimisation: finishes as soon as the destination is settled."
      inputKind="simulated"
      complexity="O((V + E) log V)"
      space="O(V + E)"
    >
      <div className="flex flex-wrap items-end gap-3">
        <NodePick label="Source" nodes={SAMPLE_GRAPH.nodes} value={source} onChange={setSource} />
        <NodePick label="Destination" nodes={SAMPLE_GRAPH.nodes} value={target} onChange={setTarget} />
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink">Execution trace</p>
          <StepList steps={steps} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink">Result</p>
          <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
            {result.found ? (
              <>
                <p className="text-ink">Path: <span className="font-mono text-cyan-soft">{result.path.join(" → ")}</span></p>
                <p className="mt-1 text-ink-faint">Total cost: <span className="font-mono text-ink">{formatNum(result.totalCost)}</span></p>
                <p className="text-ink-faint">Edges: {result.edgesTraversed} · settled: {result.visitedCount}</p>
              </>
            ) : (
              <p className="text-coral-soft">{result.reason}</p>
            )}
            <p className="mt-2 border-t border-white/8 pt-2 text-ink-faint">Runtime: {result.executionMs.toFixed(2)} ms (Performance API)</p>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}

const FLOYD_TRACE_PAIRS: [number, number][] = [
  [0, 5], // A->F
  [1, 4], // B->E
];

function FloydDemo() {
  const result = React.useMemo(
    () => floydWarshall(SAMPLE_GRAPH, { maxNodes: 20, tracePairs: FLOYD_TRACE_PAIRS }),
    [],
  );
  const path = result.found ? reconstructAllPairsPath(result, "A", "F") : [];

  return (
    <DemoShell
      title="Floyd–Warshall — all-pairs shortest paths"
      purpose="Dynamic programming over intermediate nodes k: dist[i][j] = min(dist[i][j], dist[i][k]+dist[k][j]). Produces the full O(V²) distance and next-hop tables."
      inputKind="simulated"
      complexity="O(V³)"
      space="O(V²)"
    >
      {result.found ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Distance matrix (worst-case bounded)</p>
            <div className="overflow-x-auto thin-scroll rounded-md border border-white/8">
              <Table>
                <thead>
                  <tr>
                    <Th />
                    {result.nodeIds.map((n) => (
                      <Th key={n} className="text-center">{n}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.nodeIds.map((n, i) => (
                    <tr key={n}>
                      <Td className="font-semibold text-ink">{n}</Td>
                      {result.nodeIds.map((m, j) => (
                        <Td key={m} className="text-center font-mono">
                          {Number.isFinite(result.dist[i][j]) ? result.dist[i][j] : "∞"}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <p className="mt-2 text-2xs text-ink-faint">
              Reachable ordered pairs: {result.reachablePairs} of {result.nodeIds.length * (result.nodeIds.length - 1)} ·
              runtime {result.executionMs.toFixed(2)} ms
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Path reconstruction (A → F)</p>
            <p className="rounded-md border border-white/10 bg-abyss-100/50 px-3 py-2 font-mono text-xs text-cyan-soft">
              {path.length >= 2 ? path.join(" → ") : "no path"}
            </p>
            <p className="mb-1.5 mt-3 text-xs font-medium text-ink">Distance evolution for traced pairs per k</p>
            <div className="thin-scroll overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>k</Th>
                    {FLOYD_TRACE_PAIRS.map(([i, j]) => (
                      <Th key={`${i}-${j}`} className="text-center">
                        {result.nodeIds[i]}→{result.nodeIds[j]}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.pairTrace?.map((snap) => (
                    <tr key={snap.k}>
                      <Td className="font-mono text-ink-faint">{snap.k === 0 ? "init" : snap.k}</Td>
                      {snap.dists.map((d, idx) => (
                        <Td key={idx} className="text-center font-mono">
                          {Number.isFinite(d.d) ? d.d : "∞"}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-brand">{result.reason}</p>
      )}
    </DemoShell>
  );
}

function KruskalDemo() {
  const result = React.useMemo(() => kruskal(SAMPLE_GRAPH, { trace: true }), []);
  return (
    <DemoShell
      title="Kruskal — minimum spanning tree"
      purpose="Sorts edges by weight and adds an edge only if it joins two different components (union–find). Skips edges that would form a cycle."
      inputKind="simulated"
      complexity="O(E log E)"
      space="O(V + E)"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink">Decision trace (sorted order)</p>
          <StepList
            steps={(result.trace ?? []).map((s, i) => ({
              idx: String(i + 1),
              note: `${s.from}–${s.to} (w=${s.weight}) — ${s.action === "join" ? "JOIN components" : "SKIP (would form a cycle)"}`,
            }))}
          />
        </div>
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
          <p className="text-ink">Chosen edges <span className="text-aqua-soft">(MST)</span>:</p>
          <p className="mt-1 font-mono text-ink-muted">
            {result.edges.map((e) => `${e.from}–${e.to}(${e.weight})`).join("  ")}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/8 pt-2">
            <Dt label="Total weight" value={String(result.totalWeight)} />
            <Dt label="Edges" value={String(result.edges.length)} />
            <Dt label="Components" value={String(result.componentCount)} />
            <Dt label="Connected" value={result.connected ? "yes" : "no"} />
          </dl>
          <p className="mt-2 text-ink-faint">Runtime: {result.executionMs.toFixed(2)} ms</p>
        </div>
      </div>
    </DemoShell>
  );
}

function PrimDemo() {
  const result = React.useMemo(() => prim(SAMPLE_GRAPH, { trace: true }), []);
  return (
    <DemoShell
      title="Prim — minimum spanning tree"
      purpose="Grows a single tree from a start node, always adding the cheapest frontier edge from the tree to an outside node."
      inputKind="simulated"
      complexity="O(E log V)"
      space="O(V + E)"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink">Growth trace (from node {SAMPLE_GRAPH.nodes[0]})</p>
          <StepList
            steps={(result.trace ?? []).map((s, i) => ({
              idx: String(i + 1),
              note: `Add ${s.from}–${s.to} (w=${s.weight}) — ${s.to} joins the tree`,
            }))}
          />
        </div>
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
          <p className="text-ink">Chosen edges <span className="text-aqua-soft">(MST)</span>:</p>
          <p className="mt-1 font-mono text-ink-muted">
            {result.edges.map((e) => `${e.from}–${e.to}(${e.weight})`).join("  ")}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/8 pt-2">
            <Dt label="Total weight" value={String(result.totalWeight)} />
            <Dt label="Edges" value={String(result.edges.length)} />
            <Dt label="Components" value={String(result.componentCount)} />
            <Dt label="Connected" value={result.connected ? "yes" : "no"} />
          </dl>
          <p className="mt-2 text-ink-faint">
            Same total weight as Kruskal on a connected graph (edge set may differ on ties). Runtime: {result.executionMs.toFixed(2)} ms
          </p>
        </div>
      </div>
    </DemoShell>
  );
}

function GreedyDemo() {
  const [supply, setSupply] = React.useState(DEFAULT_SUPPLY_MLD);
  const result = React.useMemo(() => greedyAllocation({ zones: DEMAND_ZONES, supply }), [supply]);
  const steps = React.useMemo(() => {
    const ordered = [...DEMAND_ZONES].sort((a, b) =>
      a.priority !== b.priority ? a.priority - b.priority : b.demand - a.demand,
    );
    const alloc = new Map(result.allocations.map((a) => [a.zoneId, a]));
    return ordered.map((z, i) => ({
      idx: String(i + 1),
      note: `${z.name} (p${z.priority}, demand ${z.demand}) → receives ${alloc.get(z.id)?.allocated.toFixed(1)} MLD; unmet ${alloc.get(z.id)?.unmet.toFixed(1)}`,
    }));
  }, [result]);

  return (
    <DemoShell
      title="Greedy water allocation"
      purpose="Priority-ordered fill (priority 1 first, ties by largest demand) up to each zone's limit until supply is exhausted. Deterministic; does not optimise the concave utility objective."
      inputKind="simulated"
      complexity="O(Z log Z)"
      space="O(Z)"
    >
      <div className="max-w-sm">
        <p className="mb-1 text-xs text-ink-faint">Supply: <span className="font-mono text-ink">{supply.toFixed(0)} MLD</span></p>
        <Slider value={[supply]} min={200} max={1400} step={10} onValueChange={(v) => setSupply(v[0])} aria-label="Supply" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <StepList steps={steps} />
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
          <dl className="grid grid-cols-2 gap-1.5">
            <Dt label="Demand" value={`${result.totalDemand.toFixed(0)} MLD`} />
            <Dt label="Allocated" value={`${result.totalAllocated.toFixed(1)} MLD`} />
            <Dt label="Unmet" value={`${result.totalUnmet.toFixed(1)} MLD`} />
            <Dt label="Satisfaction" value={`${(result.satisfaction * 100).toFixed(1)}%`} />
          </dl>
          <p className="mt-2 border-t border-white/8 pt-2 text-ink-faint">Runtime: {result.executionMs.toFixed(2)} ms</p>
        </div>
      </div>
    </DemoShell>
  );
}

// Small, hand-checkable case: budget 5, weights [3,2,4,2], values [6,4,8,2] (priority 1 weight 1.0)
const KNAPSACK_ZONES: DemandZone[] = [
  { id: "a", name: "A", type: "essential", demand: 3, priority: 1, simulated: true },
  { id: "b", name: "B", type: "residential", demand: 2, priority: 1, simulated: true },
  { id: "c", name: "C", type: "residential", demand: 4, priority: 3, simulated: true },
  { id: "d", name: "D", type: "agricultural", demand: 2, priority: 5, simulated: true },
];

function KnapsackDemo() {
  const result = React.useMemo(
    () => knapsackAllocation({ zones: KNAPSACK_ZONES, supply: 5 }, { quantum: 1, maxCapacityCells: 1000 }),
    [],
  );
  return (
    <DemoShell
      title="0/1 Knapsack allocation"
      purpose="Each zone is served fully (weight = demand, value = priority weight × demand) or not at all. Budget 5 MLD, discrete 1-MLD cells. Optimal: A + B = value 1.0×3 + 1.0×2 = 5 for weight 5, serving A and B."
      inputKind="simulated"
      complexity="O(Z·W)"
      space="O(Z·W)"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="thin-scroll overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Zone</Th>
                <Th className="text-right">Demand (w)</Th>
                <Th className="text-right">Value (v)</Th>
                <Th className="text-center">Chosen</Th>
              </tr>
            </thead>
            <tbody>
              {KNAPSACK_ZONES.map((z) => {
                const a = result.allocations.find((x) => x.zoneId === z.id);
                const v = (1 / Math.pow(z.priority, 0.6) * z.demand);
                return (
                  <tr key={z.id}>
                    <Td className="text-ink">{z.name}</Td>
                    <Td className="text-right font-mono">{z.demand}</Td>
                    <Td className="text-right font-mono">{v.toFixed(2)}</Td>
                    <Td className="text-center">{a && a.allocated > 0 ? <span className="text-aqua-soft">✓</span> : <span className="text-ink-faint">—</span>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
          <dl className="grid grid-cols-2 gap-1.5">
            <Dt label="Allocated" value={`${result.totalAllocated.toFixed(0)} MLD`} />
            <Dt label="Knapsack value" value={result.algorithmObjective?.value.toFixed(2) ?? "—"} />
            <Dt label="Satisfaction" value={`${(result.satisfaction * 100).toFixed(1)}%`} />
            <Dt label="States" value={result.stateCount?.toLocaleString() ?? "—"} />
          </dl>
          <p className="mt-2 border-t border-white/8 pt-2 text-ink-faint">Runtime: {result.executionMs.toFixed(2)} ms</p>
        </div>
      </div>
    </DemoShell>
  );
}

function DpDemo() {
  const [supply, setSupply] = React.useState(6);
  const result = React.useMemo(
    () => dpAllocation({ zones: SMALL_ZONES, supply }, { quantum: 1, maxStateCells: 100_000 }),
    [supply],
  );
  const steps = React.useMemo(
    () =>
      SMALL_ZONES.map((z, i) => {
        const a = result.allocations.find((x) => x.zoneId === z.id);
        return {
          idx: `dp[${i + 1}]`,
          note: `${z.name} (p${z.priority}) ← ${a?.allocated.toFixed(0)} units → util ${result.objectiveValue.toFixed(2)} total`,
        };
      }),
    [result],
  );
  return (
    <DemoShell
      title="DP allocation — bounded integer budgets"
      purpose="State (zone, budget); transition over k = 0…demand units with concave utility priorityWeight·units^0.85. The last budget column is scanned to reconstruct the allocation."
      inputKind="simulated"
      complexity="O(Z·W·K)"
      space="O(Z·W)"
    >
      <div className="max-w-sm">
        <p className="mb-1 text-xs text-ink-faint">Budget: <span className="font-mono text-ink">{supply} MLD</span></p>
        <Slider value={[supply]} min={0} max={11} step={1} onValueChange={(v) => setSupply(v[0])} aria-label="DP budget" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <StepList steps={steps} />
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
          <p className="text-ink">Allocations:</p>
          <div className="mt-1.5 grid gap-1">
            {result.allocations.map((a) => (
              <div key={a.zoneId} className="flex items-center justify-between font-mono">
                <span className="text-ink-muted">{a.zoneId}</span>
                <span className="text-aqua-soft">{a.allocated.toFixed(0)} MLD</span>
              </div>
            ))}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-1.5 border-t border-white/8 pt-2">
            <Dt label="Objective" value={result.objectiveValue.toFixed(2)} />
            <Dt label="States" value={result.stateCount?.toLocaleString() ?? "—"} />
            <Dt label="Satisfaction" value={`${(result.satisfaction * 100).toFixed(1)}%`} />
            <Dt label="Runtime" value={`${result.executionMs.toFixed(2)} ms`} />
          </dl>
        </div>
      </div>
    </DemoShell>
  );
}

function BacktrackingDemo() {
  const [budget, setBudget] = React.useState(10);
  const result = React.useMemo(() => selectRepairs({ candidates: REPAIR_CANDIDATES, budget }), [budget]);
  return (
    <DemoShell
      title="Backtracking repair selection (branch & bound)"
      purpose="Include/exclude each repair candidate, respecting the budget, to maximise restored nodes. Subtrees that cannot beat the incumbent are pruned; explored and pruned state counts are reported."
      inputKind="simulated"
      complexity="O(2^N) worst-case"
      space="O(N)"
    >
      <div className="max-w-sm">
        <p className="mb-1 text-xs text-ink-faint">Repair budget: <span className="font-mono text-ink">{budget}</span></p>
        <Slider value={[budget]} min={0} max={20} step={1} onValueChange={(v) => setBudget(v[0])} aria-label="Repair budget" />
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
          <p className="font-medium text-ink">Candidates</p>
          <ul className="mt-1.5 space-y-1">
            {REPAIR_CANDIDATES.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span className="font-mono text-ink-muted">{c.id} (cost {c.cost})</span>
                <span className={result.selected.includes(c.id) ? "text-aqua-soft" : "text-ink-faint"}>
                  {result.selected.includes(c.id) ? "selected" : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-white/10 bg-abyss-100/50 p-3 text-2xs">
          <dl className="grid grid-cols-2 gap-1.5">
            <Dt label="Explored states" value={result.exploredStates.toLocaleString()} />
            <Dt label="Pruned states" value={result.prunedStates.toLocaleString()} />
            <Dt label="Restored nodes" value={String(result.coveredNodes.length)} />
            <Dt label={`Optimal (${result.optimal ? "proven" : "incumbent"})`} value={`${result.totalCost} cost`} />
          </dl>
          <p className="mt-2 border-t border-white/8 pt-2 text-ink-faint">Runtime: {result.executionMs.toFixed(2)} ms</p>
          {result.reason ? <p className="mt-2 text-amber-brand">{result.reason}</p> : null}
        </div>
      </div>
    </DemoShell>
  );
}

/* ------------------------------------------------------------------ */

function NodePick({ label, nodes, value, onChange }: { label: string; nodes: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-ink-muted">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded border border-white/12 bg-abyss-100/70 px-2 font-mono text-xs text-ink focus:border-cyan-brand/60 focus:outline-none">
        {nodes.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/8 bg-white/[0.02] px-2 py-1.5">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </div>
  );
}

function formatNum(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "∞";
  return Number.isFinite(n) ? String(n) : "∞";
}