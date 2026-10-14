import * as React from "react";
import { Crosshair, Filter, Network as NetworkIcon, RotateCcw, Route, Search as SearchIcon } from "lucide-react";
import { NetworkMap, type NetworkMapHandle } from "@/components/map/NetworkMap";
import { MapLegend } from "@/components/map/MapLegend";
import { FeatureInspector } from "./FeatureInspector";
import { RoutePlanner } from "./RoutePlanner";
import { useDataset } from "@/hooks/useDataset";
import { useAppStore } from "@/app/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { bboxOf } from "@/utils/geo";
import { DataBadge } from "@/components/common/section-header";

export default function NetworkPage() {
  const mapRef = React.useRef<NetworkMapHandle>(null);
  const { manifest, layers, graphStats, graphWarnings, graph } = useDataset();
  const selection = useAppStore((s) => s.selection);
  const [minSize, setMinSize] = React.useState(0);

  const transmission = layers.transmission;
  const sizeRange = React.useMemo(() => {
    if (!transmission) return { min: 0, max: 0 };
    let min = Infinity;
    let max = 0;
    for (const f of transmission.features) {
      const raw = f.properties?.size_of_pipe_mm;
      const n = raw === undefined || raw === "" ? NaN : Number(raw);
      if (Number.isFinite(n)) {
        min = Math.min(min, n);
        max = Math.max(max, n);
      }
    }
    return { min: Number.isFinite(min) ? min : 0, max };
  }, [transmission]);

  const matchingCount = React.useMemo(() => {
    if (!transmission) return 0;
    if (minSize <= 0) return transmission.features.length;
    let count = 0;
    for (const f of transmission.features) {
      const n = Number(f.properties?.size_of_pipe_mm);
      if (Number.isFinite(n) && n >= minSize) count++;
    }
    return count;
  }, [transmission, minSize]);

  const zoomToSelection = () => {
    if (selection?.geometry) {
      const bbox = bboxOf([selection.geometry]);
      if (bbox) mapRef.current?.fitToBounds(bbox, 120);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="relative min-h-[52vh] flex-1 lg:min-h-0">
        <NetworkMap
          ref={mapRef}
          className="absolute inset-0"
          filters={{ transmissionMinSizeMm: minSize > 0 ? minSize : null }}
        />

        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(92%,20rem)]">
          <div className="pointer-events-auto panel rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <NetworkIcon className="h-4 w-4 text-cyan-brand" />
              <p className="text-sm font-semibold text-ink">Chennai water network</p>
            </div>
            <p className="mt-1 text-2xs text-ink-faint">
              {manifest
                ? `${manifest.layers.reduce((s, l) => s + l.featureCount, 0).toLocaleString()} mapped features · ${graphStats ? `${graphStats.nodeCount.toLocaleString()} nodes / ${graphStats.edgeCount.toLocaleString()} edges` : "graph building…"}`
                : "Dataset unavailable"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={() => mapRef.current?.resetView()}>
                <RotateCcw className="h-3 w-3" /> Reset view
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomToSelection}
                disabled={!selection?.geometry}
              >
                <Crosshair className="h-3 w-3" /> Zoom to selection
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 right-3 z-10 hidden max-h-[60%] overflow-y-auto sm:block thin-scroll">
          <MapLegend />
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-white/8 bg-abyss/40 lg:w-[26rem] lg:border-l lg:border-t-0">
        <div className="border-b border-white/8 px-3 py-2.5">
          <p className="text-xs text-ink-muted">
            Inspect mapped features, plan routes, and review the derived graph.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 thin-scroll">
          <Tabs defaultValue="inspect">
            <TabsList className="w-full">
              <TabsTrigger value="inspect" className="flex-1">
                <SearchIcon className="h-3.5 w-3.5" /> Inspect
              </TabsTrigger>
              <TabsTrigger value="route" className="flex-1">
                <Route className="h-3.5 w-3.5" /> Route
              </TabsTrigger>
              <TabsTrigger value="graph" className="flex-1">
                <NetworkIcon className="h-3.5 w-3.5" /> Graph
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inspect" className="space-y-3">
              <FeatureInspector onZoom={zoomToSelection} />
              <div className="panel rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    <Filter className="h-3.5 w-3.5 text-cyan-brand" /> Filter transmission mains
                  </p>
                  {minSize > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => setMinSize(0)}>
                      Reset
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-2xs text-ink-faint">
                  Show mains with recorded diameter ≥{" "}
                  <span className="font-mono text-ink-muted">{minSize > 0 ? `${minSize} mm` : "all"}</span>
                </p>
                <div className="mt-2">
                  <Slider
                    value={[minSize]}
                    min={0}
                    max={Math.max(10, sizeRange.max)}
                    step={1}
                    onValueChange={(v) => setMinSize(v[0])}
                    aria-label="Minimum pipe diameter"
                  />
                </div>
                <p className="mt-1.5 text-2xs text-ink-faint">
                  {matchingCount.toLocaleString()} of {transmission?.features.length.toLocaleString() ?? 0} mains match.
                  Features with no recorded diameter are hidden while a filter is active.
                </p>
                <p className="mt-1 text-2xs text-ink-faint">
                  Recorded diameter range: {sizeRange.min}–{sizeRange.max} mm
                </p>
              </div>
            </TabsContent>

            <TabsContent value="route">
              <div className="panel rounded-lg p-3">
                <RoutePlanner />
              </div>
            </TabsContent>

            <TabsContent value="graph" className="space-y-3">
              <div className="panel rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink">Derived network graph</p>
                  <DataBadge kind="inferred" />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-2xs">
                  <Row label="Nodes" value={graphStats?.nodeCount.toLocaleString() ?? "—"} />
                  <Row label="Edges" value={graphStats?.edgeCount.toLocaleString() ?? "—"} />
                  <Row label="Recorded connections" value={graphStats?.recordedConnections.toLocaleString() ?? "—"} />
                  <Row label="Inferred (snapped)" value={graphStats?.geometryConnections.toLocaleString() ?? "—"} />
                  <Row label="Components" value={graphStats?.componentCount.toLocaleString() ?? "—"} />
                  <Row label="Largest component" value={graphStats?.largestComponentSize.toLocaleString() ?? "—"} />
                </div>
                <p className="mt-2 text-2xs text-ink-faint">
                  Total recorded pipe length in graph:{" "}
                  {graphStats ? `${Math.round(graphStats.totalLengthM).toLocaleString()} m` : "—"}
                </p>
              </div>

              {graphWarnings.length > 0 ? (
                <div className="rounded-md border border-amber-brand/25 bg-amber-brand/[0.06] p-3">
                  <p className="text-2xs font-medium text-amber-brand">Graph construction caveats</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-2xs leading-relaxed text-ink-muted">
                    {graphWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Separator />
              <div className="space-y-2 text-2xs leading-relaxed text-ink-faint">
                <p>
                  The graph is built in two ways: <strong>recorded connectivity</strong> from the source
                  <span className="font-mono"> from_id / to_id </span>
                  attributes, and <strong>inferred connectivity</strong> by snapping pipe endpoints within 5 m. A
                  visual crossing on the map is never treated as a junction.
                </p>
                <p>
                  {graph?.directed ? "Directed graph" : "Undirected graph"} · topology is kept separate from map
                  rendering and used by every algorithm module.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="muted">Dijkstra: O((V+E) log V)</Badge>
                <Badge variant="muted">Floyd–Warshall: O(V³)</Badge>
                <Badge variant="muted">Kruskal: O(E log E)</Badge>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </aside>
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
