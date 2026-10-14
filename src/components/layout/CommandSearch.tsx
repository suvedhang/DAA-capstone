import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDataset } from "@/hooks/useDataset";
import { useAppStore, type SelectionInfo } from "@/app/store";
import type { GeoFeature, GeoProperties, LayerKey } from "@/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/states";

const SEARCH_LAYERS: LayerKey[] = [
  "transmission",
  "interconnection",
  "meters",
  "overhead",
  "underground",
  "chambers",
];

interface Hit {
  layer: LayerKey;
  index: number;
  id: string;
  title: string;
  subtitle: string;
  feature: GeoFeature;
}

const SEARCH_FIELDS = [
  "objectid",
  "wmt_id",
  "ipw_id",
  "wds_id",
  "wtp_id",
  "road_name",
  "name_of_the_location",
  "name_of_the_chamber",
  "from_id_tapping_point",
  "to_id_inclusion_point",
  "connecting_from_id",
  "connecting_to_id",
  "se_territory",
];

function haystack(props: GeoProperties): string {
  const parts: string[] = [];
  for (const f of SEARCH_FIELDS) {
    const v = props[f];
    if (v !== undefined && v !== null && v !== "") parts.push(String(v));
  }
  return parts.join(" ").toLowerCase();
}

function titleOf(layer: LayerKey, index: number, props: GeoProperties): string {
  const obj = props.objectid ? `#${props.objectid}` : `#${index}`;
  switch (layer) {
    case "transmission":
      return `Transmission main ${obj}`;
    case "interconnection":
      return `Interconnection pipe ${obj}`;
    case "meters":
      return `Flow meter ${obj}`;
    case "overhead":
      return `Overhead tank ${obj}`;
    case "underground":
      return `Underground tank ${obj}`;
    case "chambers":
      return `Chamber ${obj}`;
  }
}

function subtitleOf(props: GeoProperties): string {
  const bits = [props.road_name, props.wmt_id ?? props.ipw_id ?? props.wds_id]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map(String);
  return bits.join(" · ") || "No descriptive attributes";
}

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { layers } = useDataset();
  const setSelection = useAppStore((s) => s.setSelection);
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = React.useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Hit[] = [];
    for (const layer of SEARCH_LAYERS) {
      const fc = layers[layer];
      if (!fc) continue;
      for (let i = 0; i < fc.features.length; i++) {
        const feature = fc.features[i];
        const props = feature.properties ?? {};
        if (haystack(props).includes(q)) {
          out.push({
            layer,
            index: i,
            id: `${layer}-${i}`,
            title: titleOf(layer, i, props),
            subtitle: subtitleOf(props),
            feature,
          });
          if (out.length >= 40) break;
        }
      }
      if (out.length >= 40) break;
    }
    return out;
  }, [query, layers]);

  const choose = (hit: Hit) => {
    const info: SelectionInfo = {
      kind: "feature",
      id: hit.id,
      layer: hit.layer,
      label: hit.title,
      properties: hit.feature.properties,
      geometry: hit.feature.geometry,
      simulated: false,
    };
    setSelection(info);
    setOpen(false);
    setQuery("");
    navigate("/network");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border border-white/10 bg-abyss-100/60 px-3 text-xs text-ink-faint transition-colors hover:border-white/20 hover:text-ink-muted"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search mapped features…</span>
          <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-2xs sm:inline">
            ⌘K
          </kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-abyss/80 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12%] z-50 w-[min(92vw,34rem)] -translate-x-1/2 rounded-xl border border-white/12 bg-abyss-200 shadow-2xl animate-fade-in"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Search mapped features</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
            <Search className="h-4 w-4 text-ink-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by object id, road, WMT/WDS id…"
              className="h-7 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
          <div className="max-h-[52vh] overflow-y-auto p-2 thin-scroll">
            {query.trim().length < 2 ? (
              <p className="px-2 py-6 text-center text-xs text-ink-faint">
                Type at least two characters. Searches object ids, road names, WMT/WDS/IPW ids and territory
                codes across the mapped layers.
              </p>
            ) : hits.length === 0 ? (
              <EmptyState title="No matching features" description="Try an object id, road name, or asset id." />
            ) : (
              <ul className="space-y-0.5">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => choose(hit)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[0.05]",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{hit.title}</span>
                        <span className="block truncate text-2xs text-ink-faint">{hit.subtitle}</span>
                      </span>
                      <span className="shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-2xs text-ink-faint">
                        {hit.layer}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
