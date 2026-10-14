import * as React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Calculator, Gauge, Info, Timer, Waves } from "lucide-react";
import { DEMAND_ZONES, DEFAULT_SUPPLY_MLD } from "@/app/fixtures";
import {
  greedyAllocation,
  knapsackAllocation,
  dpAllocation,
  type AllocationResult,
  type DemandZone,
} from "@/algorithms/optimization";
import { SectionHeader } from "@/components/common/section-header";
import { DataBadge } from "@/components/common/section-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td } from "@/components/ui/skeleton-table";
import { CHART_COLORS, ChartTooltip, AXIS_PROPS } from "@/components/charts/chart-theme";
import { cn } from "@/lib/utils";

const ALGO_META: Record<AllocationResult["algorithm"], { label: string; color: string; complexity: string }> = {
  greedy: { label: "Greedy", color: CHART_COLORS.cyan, complexity: "O(Z log Z)" },
  knapsack: { label: "Knapsack 0/1", color: CHART_COLORS.violet, complexity: "O(Z·W)" },
  dp: { label: "DP allocation", color: CHART_COLORS.aqua, complexity: "O(Z·W·K)" },
};

export default function AllocationPage() {
  const [supply, setSupply] = React.useState(DEFAULT_SUPPLY_MLD);
  const [quantum, setQuantum] = React.useState(0.5);
  const [zones, setZones] = React.useState<DemandZone[]>(() =>
    DEMAND_ZONES.map((z) => ({ ...z })),
  );

  const input = React.useMemo(() => ({ zones, supply }), [zones, supply]);

  const results = React.useMemo(() => {
    const greedy = greedyAllocation(input);
    const knap = knapsackAllocation(input, { quantum, maxCapacityCells: 500_000 });
    const dp = dpAllocation(input, { quantum, maxStateCells: 400_000 });
    return { greedy, knapsack: knap, dp };
  }, [input, quantum]);

  const chartData = React.useMemo(() => {
    return zones.map((z) => {
      const row: Record<string, number | string> = { zone: z.name.replace(/Chennai|Peri-urban /g, "") };
      (Object.keys(results) as (keyof typeof results)[]).forEach((key) => {
        row[ALGO_META[key].label] = Number(
          results[key].allocations.find((a) => a.zoneId === z.id)?.allocated.toFixed(1) ?? 0,
        );
      });
      return row;
    });
  }, [zones, results]);

  const updateZone = (id: string, patch: Partial<DemandZone>) => {
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  };

  return (
    <div className="h-full overflow-y-auto p-4 thin-scroll">
      <div className="mx-auto max-w-6xl space-y-4">
        <SectionHeader
          icon={Waves}
          title="Water resource allocation laboratory"
          description="Compare priority-rule greedy, 0/1 knapsack, and bounded dynamic-programming allocation of a finite water budget across demand zones. All zone data is simulated."
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-cyan-brand" /> Scenario configuration
              </CardTitle>
              <DataBadge kind="simulated" />
            </div>
            <CardDescription>
              Total available water in MLD and the DP/knapsack discretisation quantum.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p>
                  <span className="text-xs text-ink-faint">Total available water</span>{" "}
                  <span className="font-mono text-sm text-ink">{supply.toFixed(0)} MLD</span>
                </p>
                <Slider
                  value={[supply]}
                  min={100}
                  max={1400}
                  step={10}
                  onValueChange={(v) => setSupply(v[0])}
                  aria-label="Total water supply"
                />
              </div>
              <div>
                <p>
                  <span className="text-xs text-ink-faint">Discretisation quantum</span>{" "}
                  <span className="font-mono text-sm text-ink">{quantum.toFixed(1)} MLD / cell</span>
                </p>
                <Slider
                  value={[quantum]}
                  min={0.25}
                  max={2}
                  step={0.25}
                  onValueChange={(v) => setQuantum(v[0])}
                  aria-label="Discretisation quantum"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-brand" /> Demand zones
            </CardTitle>
            <CardDescription>
              Edit simulated demand and priority (1 = highest). Allocation limits equal demand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="thin-scroll overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Zone</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Demand (MLD)</Th>
                    <Th className="text-right">Priority</Th>
                    <Th className="text-right">Weight</Th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.id} className="border-t border-white/5">
                      <Td className="max-w-[11rem] truncate text-ink">{z.name}</Td>
                      <Td className="text-ink-faint">{z.type}</Td>
                      <Td>
                        <input
                          type="number"
                          min={0}
                          value={z.demand}
                          onChange={(e) => updateZone(z.id, { demand: Math.max(0, Number(e.target.value)) })}
                          className="h-7 w-20 rounded border border-white/10 bg-abyss-100/70 px-2 text-right font-mono text-xs text-ink focus:border-cyan-brand/60 focus:outline-none"
                        />
                      </Td>
                      <Td>
                        <input
                          type="number"
                          min={1}
                          max={9}
                          value={z.priority}
                          onChange={(e) => updateZone(z.id, { priority: Math.max(1, Math.min(9, Number(e.target.value))) })}
                          className="h-7 w-14 rounded border border-white/10 bg-abyss-100/70 px-2 text-right font-mono text-xs text-ink focus:border-cyan-brand/60 focus:outline-none"
                        />
                      </Td>
                      <Td className="text-right font-mono text-ink-muted">
                        {(1 / Math.pow(z.priority, 0.6)).toFixed(3)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-cyan-brand" /> Allocation comparison
            </CardTitle>
            <CardDescription>
              All values computed live from the scenario above. DP maximises a concave utility; knapsack serves whole
              zones; greedy fills by priority.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ["greedy", results.greedy],
                ["knapsack", results.knapsack],
                ["dp", results.dp],
              ] as const).map(([key, res]) => {
                const meta = ALGO_META[key];
                const satisfied = res.satisfaction * 100;
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-white/10 bg-abyss-100/40 p-3"
                    style={{ boxShadow: `inset 0 2px 0 ${meta.color}` }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                        {meta.label}
                      </p>
                      <Badge variant="muted">{meta.complexity}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                      <MiniStat label="Demand sat." value={`${satisfied.toFixed(1)}%`} tone={satisfied > 85 ? "text-aqua-soft" : satisfied > 60 ? "text-amber-brand" : "text-coral-soft"} />
                      <MiniStat label="Unmet" value={`${res.totalUnmet.toFixed(1)} MLD`} />
                      <MiniStat label="Obj. value" value={res.objectiveValue.toFixed(1)} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-2xs text-ink-faint">
                      <span>Allocated: {res.totalAllocated.toFixed(1)} MLD</span>
                      <span className="text-right">
                        {res.executionMs < 1 ? "<1" : res.executionMs.toFixed(0)} ms
                      </span>
                    </div>
                    {res.algorithmObjective ? (
                      <p className="mt-1 text-2xs text-ink-faint">
                        {res.algorithmObjective.label}: {res.algorithmObjective.value.toFixed(1)}
                      </p>
                    ) : null}
                    {res.stateCount !== undefined ? (
                      <p className="text-2xs text-ink-faint">States: {res.stateCount.toLocaleString()}</p>
                    ) : null}
                    {res.notes?.startsWith("Skipped") ? (
                      <p className="mt-1 text-2xs text-amber-brand">{res.notes}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="zone" {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 10 }} interval={0} angle={-14} height={52} textAnchor="end" />
                  <YAxis {...AXIS_PROPS} unit=" MLD" />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: CHART_COLORS.axis }} />
                  <Bar dataKey="Greedy" fill={ALGO_META.greedy.color} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Knapsack 0/1" fill={ALGO_META.knapsack.color} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="DP allocation" fill={ALGO_META.dp.color} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-ink">Per-zone allocation</p>
              <div className="thin-scroll overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Zone</Th>
                      <Th>Demand</Th>
                      <Th className="text-right">Greedy</Th>
                      <Th className="text-right">Knapsack</Th>
                      <Th className="text-right">DP</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((z) => {
                      const g = results.greedy.allocations.find((a) => a.zoneId === z.id);
                      const k = results.knapsack.allocations.find((a) => a.zoneId === z.id);
                      const d = results.dp.allocations.find((a) => a.zoneId === z.id);
                      return (
                        <tr key={z.id} className="border-t border-white/5">
                          <Td className="truncate text-ink">{z.name}</Td>
                          <Td className="font-mono">{z.demand.toFixed(0)}</Td>
                          <Td className="text-right font-mono text-ink">{g?.allocated.toFixed(1)}</Td>
                          <Td className="text-right font-mono text-ink-muted">{k?.allocated.toFixed(1)}</Td>
                          <Td className="text-right font-mono text-aqua-soft">{d?.allocated.toFixed(1)}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>

            <div className={cn("rounded-md border p-3 text-2xs leading-relaxed")} style={{ borderColor: "rgba(148,178,194,0.15)" }}>
              <p className="font-medium text-ink">Formulation notes</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-ink-faint">
                <li>
                  <strong className="text-ink-muted">Greedy:</strong> sort by priority (tie → largest demand), fill up
                  to each zone's limit until supply runs out. O(Z log Z). Not globally optimal for the concave objective.
                </li>
                <li>
                  <strong className="text-ink-muted">Knapsack 0/1:</strong> serve whole zones only; value =
                  priorityWeight × demand, weight = demand, capacity = supply. Solved with a classic O(Z·W) DP over{" "}
                  {quantum.toFixed(1)} MLD cells.
                </li>
                <li>
                  <strong className="text-ink-muted">DP allocation:</strong> bounded integer allocation, each zone
                  receives 0…demand cells, state (zone, budget), transition adds concave utility
                  priorityWeight×units<sup>0.85</sup>. Globally optimal for the stated objective but the objective itself
                  is a modelling choice.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 pb-2 text-2xs text-ink-faint">
          <Timer className="h-3 w-3" />
          Timings measured with the browser Performance API on the current device; they are indicative, not benchmarks.
          All scenario quantities are in million litres per day (MLD).
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border border-white/8 bg-white/[0.02] px-1 py-1.5">
      <p className="text-2xs text-ink-faint">{label}</p>
      <p className={cn("mt-0.5 font-mono text-xs", tone)}>{value}</p>
    </div>
  );
}