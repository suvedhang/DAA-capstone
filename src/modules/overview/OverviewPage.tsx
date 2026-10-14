import * as React from "react";
import { Database, Droplets, Gauge, Layers, Route as RouteIcon, Waves } from "lucide-react";
import { NetworkMap } from "@/components/map/NetworkMap";
import { MapLegend } from "@/components/map/MapLegend";
import { FeatureInspector } from "@/modules/network/FeatureInspector";
import { useDataset } from "@/hooks/useDataset";
import { useAppStore } from "@/app/store";
import { MetricCard } from "@/components/common/metric-card";
import { SectionHeader } from "@/components/common/section-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { greedyAllocation } from "@/algorithms/optimization/greedyAllocation";
import { DEFAULT_SUPPLY_MLD, DEMAND_ZONES } from "@/app/fixtures";
import { ErrorState } from "@/components/common/states";

export default function OverviewPage() {
  const { manifest, manifestError, graphStats, graphWarnings, loading } = useDataset();
  const route = useAppStore((s) => s.route);

  const allocation = React.useMemo(() => {
    return greedyAllocation({ zones: DEMAND_ZONES, supply: DEFAULT_SUPPLY_MLD });
  }, []);

  const totalFeatures = manifest?.layers.reduce((s, l) => s + l.featureCount, 0) ?? 0;
  const avgSatisfaction = allocation.satisfaction * 100;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-b border-white/8 bg-abyss/40 p-3 thin-scroll lg:w-[25rem] lg:border-b-0 lg:border-r">
        <SectionHeader
          icon={Droplets}
          title="Sustainable water network overview"
          description="A decision-support view of Chennai's mapped water infrastructure and an illustrative demand scenario. Real geography, simulated demand."
        />

        {manifestError ? (
          <ErrorState
            title="Dataset unavailable"
            description={`${manifestError} The interface remains navigable but network views are empty until the dataset is generated.`}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Mapped features"
            value={loading ? "…" : totalFeatures.toLocaleString()}
            icon={Database}
            hint="Converted from the supplied KML layers"
          />
          <MetricCard
            label="Graph nodes"
            value={graphStats ? graphStats.nodeCount.toLocaleString() : "…"}
            icon={Layers}
            hint="Derived from recorded + snapped connectivity"
            tone="cyan"
          />
          <MetricCard
            label="Graph edges"
            value={graphStats ? graphStats.edgeCount.toLocaleString() : "…"}
            icon={RouteIcon}
            hint={`${graphStats?.recordedConnections.toLocaleString() ?? "—"} recorded · ${graphStats?.geometryConnections.toLocaleString() ?? "—"} snapped`}
          />
          <MetricCard
            label="Connectivity"
            value={graphStats ? `${graphStats.componentCount}` : "…"}
            unit="components"
            icon={Gauge}
            hint={`Largest component: ${graphStats?.largestComponentSize.toLocaleString() ?? "—"} nodes`}
          />
        </div>

        <div className="panel rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <Waves className="h-3.5 w-3.5 text-cyan-brand" /> Illustrative allocation scenario
            </p>
            <Badge variant="warning">Simulated</Badge>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-2xs">
            <div>
              <p className="text-ink-faint">Supply</p>
              <p className="font-mono text-sm text-ink">{DEFAULT_SUPPLY_MLD} MLD</p>
            </div>
            <div>
              <p className="text-ink-faint">Demand</p>
              <p className="font-mono text-sm text-ink">{allocation.totalDemand} MLD</p>
            </div>
            <div>
              <p className="text-ink-faint">Unmet</p>
              <p className="font-mono text-sm text-amber-brand">{allocation.totalUnmet} MLD</p>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="mb-1 flex justify-between text-2xs text-ink-faint">
              <span>Demand satisfaction (greedy priority rule)</span>
              <span className="font-mono text-ink-muted">{avgSatisfaction.toFixed(1)}%</span>
            </div>
            <Progress value={avgSatisfaction} indicatorClassName="bg-gradient-to-r from-cyan-brand to-aqua" />
          </div>
          <p className="mt-2 text-2xs leading-snug text-ink-faint">
            Demand zones are illustrative because the dataset contains infrastructure geometry, not consumption data.
          </p>
        </div>

        <div className="panel rounded-lg p-3">
          <p className="text-xs font-medium text-ink">Routing snapshot</p>
          {route ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-2xs">
              <div className="rounded border border-white/8 bg-white/[0.02] px-2 py-1.5">
                <p className="text-ink-faint">Route cost</p>
                <p className="font-mono text-sm text-ink">{route.totalCost.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
              </div>
              <div className="rounded border border-white/8 bg-white/[0.02] px-2 py-1.5">
                <p className="text-ink-faint">Metric</p>
                <p className="font-mono text-sm text-ink">{route.metric}</p>
              </div>
              <div className="col-span-2 text-ink-faint">
                {route.path.length} nodes · {route.edgeIds.length} edges — computed in the Water Network module.
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-2xs text-ink-faint">
              No route selected. Open <span className="text-ink-muted">Water Network → Route</span> to compute a
              shortest path and highlight it here.
            </p>
          )}
        </div>

        <div className="panel rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink">Dataset provenance</p>
            <Badge variant="success">Mapped data</Badge>
          </div>
          {manifest ? (
            <>
              <p className="mt-1.5 text-2xs leading-relaxed text-ink-faint">{manifest.provenance}</p>
              <p className="mt-1.5 text-2xs text-ink-faint">
                Spatial reference: {manifest.spatialReference}
              </p>
              <p className="mt-1 text-2xs text-ink-faint">
                Converted {new Date(manifest.generatedAt).toLocaleString()} using {manifest.converter}.
              </p>
              <Separator className="my-2.5" />
              <ul className="space-y-1">
                {manifest.layers.map((l) => (
                  <li key={l.key} className="flex items-center justify-between gap-2 text-2xs">
                    <span className="truncate text-ink-muted">{l.label}</span>
                    <span className="shrink-0 font-mono text-ink-faint">
                      {l.available ? l.featureCount.toLocaleString() : "unavailable"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1.5 text-2xs text-ink-faint">Manifest not loaded.</p>
          )}
        </div>

        <div className="panel rounded-lg p-3">
          <p className="text-xs font-medium text-ink">Caveats &amp; assumptions</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-2xs leading-relaxed text-ink-faint">
            {(manifest?.caveats ?? []).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
            {graphWarnings.map((w, i) => (
              <li key={`g${i}`}>{w}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-1.5 pb-2">
          <Badge variant="success">SDG 6 · Clean water</Badge>
          <Badge variant="muted">SDG 11 · Cities</Badge>
          <Badge variant="muted">SDG 12 · Responsible consumption</Badge>
          <Badge variant="muted">SDG 13 · Climate action</Badge>
        </div>
      </aside>

      <div className="relative min-h-[52vh] flex-1 lg:min-h-0">
        <NetworkMap className="absolute inset-0" />
        <div className="absolute bottom-3 right-3 z-10 hidden max-h-[55%] overflow-y-auto sm:block thin-scroll">
          <MapLegend />
        </div>
        <div className="absolute bottom-3 left-3 z-10 w-[min(92%,20rem)]">
          <FeatureInspector />
        </div>
      </div>
    </div>
  );
}
