import * as React from "react";
import { ChevronDown, Layers } from "lucide-react";
import { useAppStore } from "@/app/store";
import { useDataset } from "@/hooks/useDataset";
import { LAYER_VISUAL, ROUTE_COLOR, SELECTED_COLOR } from "./mapConfig";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { LayerKey } from "@/types";

const ORDER: LayerKey[] = [
  "transmission",
  "interconnection",
  "overhead",
  "underground",
  "chambers",
  "meters",
];

export function MapLegend() {
  const [open, setOpen] = React.useState(true);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const { manifest, layers } = useDataset();

  const countFor = (key: LayerKey): number => {
    const fromManifest = manifest?.layers.find((l) => l.key === key)?.featureCount;
    if (typeof fromManifest === "number") return fromManifest;
    return layers[key]?.features.length ?? 0;
  };

  return (
    <div className="panel w-60 rounded-lg text-xs shadow-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium text-ink">
          <Layers className="h-3.5 w-3.5 text-cyan-brand" /> Layers &amp; legend
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-white/8 px-3 py-2.5">
          {ORDER.map((key) => {
            const visual = LAYER_VISUAL[key];
            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-4 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: visual.kind === "line" ? visual.color : "transparent",
                      border: `1.5px solid ${visual.color}`,
                    }}
                  />
                  <span className="truncate text-ink-muted">{layerLabel(key)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-2xs text-ink-faint">{countFor(key).toLocaleString()}</span>
                  <Switch
                    checked={visibleLayers[key]}
                    onCheckedChange={() => toggleLayer(key)}
                    aria-label={`Toggle ${layerLabel(key)}`}
                  />
                </span>
              </div>
            );
          })}

          <div className="!mt-3 space-y-1.5 border-t border-white/8 pt-2.5">
            <LegendRow color={ROUTE_COLOR} label="Computed route (simulated)" dashed />
            <LegendRow color={SELECTED_COLOR} label="Selected mapped feature" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LegendRow({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-0 w-4 border-t-2"
        style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }}
      />
      <span className="text-ink-muted">{label}</span>
    </div>
  );
}

function layerLabel(key: LayerKey): string {
  switch (key) {
    case "transmission":
      return "Transmission mains";
    case "interconnection":
      return "Interconnection pipes";
    case "chambers":
      return "Distribution chambers";
    case "overhead":
      return "Overhead tanks";
    case "underground":
      return "Underground tanks";
    case "meters":
      return "Flow meters";
  }
}
