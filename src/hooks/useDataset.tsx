import * as React from "react";
import { loadLayer, loadManifest } from "@/services/data/loader";
import { buildNetworkGraph, type GraphBuildResult } from "@/services/data/graphBuilder";
import type {
  DatasetManifest,
  FeatureCollection,
  GraphStats,
  LayerKey,
  NetworkGraph,
} from "@/types";

interface DatasetContextValue {
  manifest: DatasetManifest | null;
  manifestError: string | null;
  loading: boolean;
  layers: Partial<Record<LayerKey, FeatureCollection>>;
  layerErrors: Partial<Record<LayerKey, string>>;
  graph: NetworkGraph | null;
  graphStats: GraphStats | null;
  graphWarnings: string[];
  graphLoading: boolean;
  reload: () => void;
}

const DatasetContext = React.createContext<DatasetContextValue | null>(null);

const ALL_LAYERS: LayerKey[] = [
  "transmission",
  "interconnection",
  "chambers",
  "overhead",
  "underground",
  "meters",
];

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = React.useState<DatasetManifest | null>(null);
  const [manifestError, setManifestError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [layers, setLayers] = React.useState<Partial<Record<LayerKey, FeatureCollection>>>({});
  const [layerErrors, setLayerErrors] = React.useState<Partial<Record<LayerKey, string>>>({});
  const [graphResult, setGraphResult] = React.useState<GraphBuildResult | null>(null);
  const [graphLoading, setGraphLoading] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setManifestError(null);
    setLayers({});
    setLayerErrors({});

    (async () => {
      const m = await loadManifest();
      if (cancelled) return;
      setManifest(m.data);
      setManifestError(m.error);
      setLoading(false);

      // Load every layer in parallel; record per-layer errors.
      const results = await Promise.all(
        ALL_LAYERS.map(async (key) => [key, await loadLayer(key)] as const),
      );
      if (cancelled) return;
      const nextLayers: Partial<Record<LayerKey, FeatureCollection>> = {};
      const nextErrors: Partial<Record<LayerKey, string>> = {};
      for (const [key, res] of results) {
        if (res.data) nextLayers[key] = res.data;
        else if (res.error) nextErrors[key] = res.error;
      }
      setLayers(nextLayers);
      setLayerErrors(nextErrors);
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  // Build the graph once the two pipe layers are available.
  React.useEffect(() => {
    const transmission = layers.transmission;
    const interconnection = layers.interconnection;
    if (!transmission && !interconnection) return;

    setGraphLoading(true);
    // Defer to a macrotask so the UI can paint the map before the heavy build.
    const handle = window.setTimeout(() => {
      const input: { key: LayerKey; data: FeatureCollection }[] = [];
      if (transmission) input.push({ key: "transmission", data: transmission });
      if (interconnection) input.push({ key: "interconnection", data: interconnection });
      try {
        setGraphResult(buildNetworkGraph(input));
      } catch (err) {
        console.error("Graph construction failed", err);
        setGraphResult(null);
      } finally {
        setGraphLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(handle);
  }, [layers.transmission, layers.interconnection]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);

  const value: DatasetContextValue = {
    manifest,
    manifestError,
    loading,
    layers,
    layerErrors,
    graph: graphResult?.graph ?? null,
    graphStats: graphResult?.stats ?? null,
    graphWarnings: graphResult?.warnings ?? [],
    graphLoading,
    reload,
  };

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  const ctx = React.useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used inside <DatasetProvider>");
  return ctx;
}
