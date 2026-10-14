import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Check, Droplets, Search, TrendingDown } from "lucide-react";
import { CONSERVATION_SERIES, CONSERVATION_INTERVENTIONS } from "@/app/fixtures";
import {
  linearTrend,
  movingAverage,
  projectDemand,
  findBreakevenSupply,
  rankInterventions,
} from "@/algorithms/forecasting/forecast";
import { SectionHeader } from "@/components/common/section-header";
import { DataBadge } from "@/components/common/section-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { CHART_COLORS, ChartTooltip, AXIS_PROPS } from "@/components/charts/chart-theme";
import { cn } from "@/lib/utils";

const HORIZON = 24;

export default function ConservationPage() {
  const [growth, setGrowth] = React.useState(0.02);
  const [supply, setSupply] = React.useState(850);
  const [adopted, setAdopted] = React.useState<Set<string>>(new Set(["leak", "meter"]));

  const ys = React.useMemo(() => CONSERVATION_SERIES.map((r) => r.demand), []);
  const xs = React.useMemo(() => ys.map((_, i) => i), [ys]);

  const trend = React.useMemo(() => linearTrend(xs, ys), [xs, ys]);
  const ma = React.useMemo(() => movingAverage(ys, 5), [ys]);

  // Seasonal factor from history: mean demand for each calendar month ÷ grand mean.
  const seasonal = React.useMemo(() => {
    const grand = ys.reduce((s, v) => s + v, 0) / ys.length;
    const buckets = Array.from({ length: 12 }, (): number[] => []);
    CONSERVATION_SERIES.forEach((r) => {
      const m = Number(r.month.slice(5)) - 1;
      buckets[m].push(r.demand);
    });
    return buckets.map((b) =>
      b.length ? b.reduce((s, v) => s + v, 0) / b.length / grand : 1,
    );
  }, [ys]);

  const projection = React.useMemo(
    () => projectDemand(HORIZON, trend, growth, xs.length - 1, seasonal),
    [trend, growth, xs],
  );

  const adoptedList = React.useMemo(
    () => CONSERVATION_INTERVENTIONS.filter((i) => adopted.has(i.id)),
    [adopted],
  );
  const factor = React.useMemo(
    () => adoptedList.reduce((acc, i) => acc * (1 - i.savingRate), 1),
    [adoptedList],
  );
  const conservedProjection = React.useMemo(
    () => projection.map((d) => d * factor),
    [projection, factor],
  );

  const shortageForecast = React.useMemo(() => {
    const perMonth = conservedProjection.map((d) => Math.max(0, d - supply));
    return { perMonth, total: perMonth.reduce((s, v) => s + v, 0), totalDemand: conservedProjection.reduce((s, v) => s + v, 0) };
  }, [conservedProjection, supply]);

  const breakeven = React.useMemo(() => findBreakevenSupply(projection, 0.02), [projection]);

  const sensitivity = React.useMemo(() => {
    return [0, 0.005, 0.01, 0.015, 0.02, 0.03, 0.04].map((g) => {
      const proj = projectDemand(HORIZON, trend, g, xs.length - 1, seasonal).map((d) => d * factor);
      const total = proj.reduce((s, v) => s + Math.max(0, v - supply), 0);
      const totalDemand = proj.reduce((s, v) => s + v, 0);
      return {
        growth: `${(g * 100).toFixed(1)}%`,
        shortage: Math.round(total),
        "shortage % of demand": totalDemand > 0 ? Number(((total / totalDemand) * 100).toFixed(1)) : 0,
      };
    });
  }, [trend, xs, seasonal, supply, factor]);

  const ranked = React.useMemo(() => rankInterventions(CONSERVATION_INTERVENTIONS), []);

  const chartData = React.useMemo(() => {
    const lastMonth = CONSERVATION_SERIES.at(-1)!.month;
    const [ly, lm] = lastMonth.split("-").map(Number);
    const next = (i: number) => {
      const m = (lm + i - 1) % 12 + 1;
      const y = ly + Math.floor((lm + i - 1) / 12);
      return `${y}-${String(m).padStart(2, "0")}`;
    };
    const out: Record<string, number | string | null>[] = [];
    ys.forEach((v, i) => {
      out.push({ month: CONSERVATION_SERIES[i].month, demand: v, "MA-5": ma[i] ? Number(ma[i].toFixed(1)) : null, projection: null, "after conservation": null });
    });
    projection.forEach((v, i) => {
      out.push({
        month: next(i + 1),
        demand: null,
        "MA-5": null,
        projection: Number(v.toFixed(1)),
        "after conservation": Number(conservedProjection[i].toFixed(1)),
      });
    });
    return out;
  }, [ys, ma, projection, conservedProjection]);

  const projectedAnnualSaving = React.useMemo(() => {
    const base = projection.reduce((s, v) => s + v, 0);
    const cons = conservedProjection.reduce((s, v) => s + v, 0);
    return base - cons;
  }, [projection, conservedProjection]);

  const toggle = (id: string) => {
    setAdopted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 thin-scroll">
      <div className="mx-auto max-w-6xl space-y-4">
        <SectionHeader
          icon={TrendingDown}
          title="Water conservation & demand forecasting"
          description="A transparent moving-average / linear-trend baseline over illustrative demand history, shortage projections, sensitivity analysis, and conservation interventions. Not an official Chennai forecast."
        />

        <div className="flex flex-wrap gap-3">
          <div className="min-w-56 flex-1">
            <p className="mb-1 text-xs text-ink-faint">
              Demand growth (annualised) <span className="font-mono text-ink">{(growth * 100).toFixed(1)}%</span>
            </p>
            <Slider value={[growth]} min={0} max={0.05} step={0.0025} onValueChange={(v) => setGrowth(v[0])} aria-label="Demand growth" />
          </div>
          <div className="min-w-56 flex-1">
            <p className="mb-1 text-xs text-ink-faint">
              Available supply <span className="font-mono text-ink">{supply.toFixed(0)} MLD</span>
            </p>
            <Slider value={[supply]} min={600} max={1200} step={5} onValueChange={(v) => setSupply(v[0])} aria-label="Available supply" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-brand" /> Demand history &amp; projection
              </CardTitle>
              <DataBadge kind="simulated" />
            </div>
            <CardDescription>
              History (2021–2023) + {HORIZON}-month projection. Linear trend fit:{" "}
              {trend.slope > 0 ? "+" : ""}
              {trend.slope.toFixed(2)} MLD/month, R² {trend.r2.toFixed(3)}. Projection = trend × (1+growth)^k ×
              seasonal factor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" {...AXIS_PROPS} interval={11} tick={{ fontSize: 10 }} />
                  <YAxis {...AXIS_PROPS} unit=" MLD" domain={[600, 1150]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="demand" stroke={CHART_COLORS.cyan} fill={CHART_COLORS.cyan} fillOpacity={0.12} name="History" dot={false} />
                  <Line type="monotone" dataKey="MA-5" stroke={CHART_COLORS.slate} dot={false} strokeWidth={1.5} name="5-month mov. avg" connectNulls />
                  <Line type="monotone" dataKey="projection" stroke={CHART_COLORS.coral} strokeDasharray="5 4" dot={false} name="Projection (base)" />
                  <Line type="monotone" dataKey="after conservation" stroke={CHART_COLORS.aqua} strokeDasharray="2 3" dot={false} name="After conservation" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="forecast">
          <TabsList>
            <TabsTrigger value="forecast">
              <AlertTriangle className="h-3.5 w-3.5" /> Shortage projection
            </TabsTrigger>
            <TabsTrigger value="sensitivity">
              <Search className="h-3.5 w-3.5" /> Sensitivity &amp; breakeven
            </TabsTrigger>
            <TabsTrigger value="interventions">
              <Check className="h-3.5 w-3.5" /> Conservation interventions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast">
            <div className="grid gap-3 md:grid-cols-3">
              <MetricBox label="Shortage over horizon" value={`${shortageForecast.total.toFixed(0)} MLD`} tone={shortageForecast.total > 300 ? "bad" : shortageForecast.total > 100 ? "warn" : "good"} hint="Cumulative unmet demand over the 24-month projection." />
              <MetricBox label="Breakeven supply (≤2% shortage)" value={`${breakeven.supply.toFixed(1)} MLD`} tone="cyan" hint={`Found by binary search in ${breakeven.iterations} iterations.`} />
              <MetricBox label="Projected annual saving" value={`${projectedAnnualSaving.toFixed(0)} MLD`} tone="good" hint={`From ${adoptedList.length} adopted intervention(s).`} />
            </div>
            <div className="mt-3 rounded-md border border-white/10 bg-abyss-100/40 p-3 text-2xs leading-relaxed text-ink-faint">
              <p>
                Monthly shortage shown below is <ShortageFormula /> per month and assumes supply is constant and delivery
                is perfectly reliable — both optimistic simplifications. With supply at {supply.toFixed(0)} MLD against a
                forecast that reaches ~{Math.round(conservedProjection.at(-1)!)} MLD/month by the end of the horizon,
                the cumulative shortfall over the projection is{" "}
                <strong className="text-ink-muted">{shortageForecast.total.toFixed(0)} MLD</strong>
                {factor < 1 ? ` — reduced from ~${(shortageForecast.totalDemand + (projectedAnnualSaving * (HORIZON / 12))).toFixed(0)} MLD without the adopted interventions` : ""}.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="sensitivity">
            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Shortage vs demand growth</CardTitle>
                  <CardDescription>Holding supply at the configured level, how growth changes cumulative shortage.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sensitivity} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                        <XAxis dataKey="growth" {...AXIS_PROPS} />
                        <YAxis {...AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="shortage" stroke={CHART_COLORS.coral} strokeWidth={2} dot={{ r: 3 }} name="Cumulative shortage (MLD)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Intervention ranking</CardTitle>
                  <CardDescription>
                    Sorted by savings-per-unit-cost using a documented ratio. Search-ahead: interventions are ranked
                    rather than analysed in arbitrary input order.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1.5">
                    {ranked.map((i, idx) => (
                      <li key={i.id} className="flex items-center justify-between gap-3 rounded border border-white/8 bg-white/[0.02] px-2.5 py-2 text-2xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="font-mono text-ink-faint">{idx + 1}</span>
                          <span className="truncate text-ink">{i.name}</span>
                          <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-ink-faint">ratio {(i.savingRate / Math.max(1e-9, i.cost) * 100).toFixed(1)}</span>
                        </span>
                        <span className="shrink-0 font-mono text-ink-muted">−{(i.savingRate * 100).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 text-2xs leading-relaxed text-ink-faint">
                    <span className="text-ink-muted">Binary search demo:</span> the breakeven supply above is found by
                    binary search over a monotone feasibility predicate, using {breakeven.iterations} evaluations — not by
                    scanning every MLD.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="interventions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-aqua-soft" /> Adoption portfolio
                </CardTitle>
                <CardDescription>
                  Assumption: adopted interventions are independent, so combined demand multiplier = ∏(1 − savingRate).
                  Savings are relative to the projected scenario demand.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {CONSERVATION_INTERVENTIONS.map((i) => {
                    const on = adopted.has(i.id);
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => toggle(i.id)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                            on
                              ? "border-aqua/35 bg-aqua/[0.07]"
                              : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]",
                          )}
                          aria-pressed={on}
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-xs font-medium text-ink">
                              <span
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded border",
                                  on ? "border-aqua bg-aqua text-abyss" : "border-white/25",
                                )}
                              >
                                {on ? <Check className="h-3 w-3" /> : null}
                              </span>
                              {i.name}
                            </span>
                            <span className="mt-0.5 block text-2xs text-ink-faint">{i.description}</span>
                          </span>
                          <span className="shrink-0 font-mono text-2xs text-ink-muted">
                            −{(i.savingRate * 100).toFixed(0)}% · cost {i.cost}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MetricBox label="Adopted" value={String(adoptedList.length)} tone="cyan" />
                  <MetricBox label="Combined demand reduction" value={`${((1 - factor) * 100).toFixed(1)}%`} tone="good" />
                  <MetricBox label="Saving (horizon)" value={`${projectedAnnualSaving.toFixed(0)} MLD`} tone="good" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2 pb-2 text-2xs text-ink-faint">
          <Badge variant="muted">Forecasting method: moving average + least-squares trend</Badge>
          <Badge variant="warning">Illustrative — no official Chennai statistics</Badge>
        </div>
      </div>
    </div>
  );
}

function ShortageFormula() {
  return <span style={{ fontStyle: "italic" }}>max(0, demand − supply)</span>;
}

function MetricBox({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad" | "cyan";
}) {
  const toneClass = {
    default: "text-ink",
    cyan: "text-cyan-soft",
    good: "text-aqua-soft",
    warn: "text-amber-brand",
    bad: "text-coral-soft",
  }[tone];
  return (
    <div className="panel rounded-lg p-3">
      <p className="text-2xs font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <p className={cn("mt-1.5 font-mono text-xl font-medium", toneClass)}>{value}</p>
      {hint ? <p className="mt-1.5 text-2xs leading-snug text-ink-faint">{hint}</p> : null}
    </div>
  );
}