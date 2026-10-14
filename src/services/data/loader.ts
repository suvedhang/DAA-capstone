/**
 * Local data adapter — loads the converted GeoJSON + provenance manifest that
 * the KML pipeline writes into `public/data/`.
 *
 * This is intentionally behind the `WaterNetworkService` interface so a real
 * Node/Express + Supabase backend can replace it later without touching UI code.
 */
import type { DatasetManifest, FeatureCollection, LayerKey, ManifestLayer } from "../../types";

const BASE = import.meta.env.BASE_URL || "/";
const DATA_ROOT = `${BASE}data`;

export const LAYER_FILE: Record<LayerKey, string> = {
  transmission: "chennai-water-network.geojson",
  interconnection: "chennai-interconnection-pipes.geojson",
  chambers: "chennai-distribution-chambers.geojson",
  overhead: "chennai-overhead-tanks.geojson",
  underground: "chennai-underground-tanks.geojson",
  meters: "chennai-flow-meters.geojson",
};

export interface DataResult<T> {
  data: T | null;
  error: string | null;
}

async function fetchJson<T>(path: string): Promise<DataResult<T>> {
  try {
    const res = await fetch(path, { cache: "force-cache" });
    if (!res.ok) {
      return {
        data: null,
        error: `HTTP ${res.status} loading ${path}. Run \`npm run convert\` to generate the dataset.`,
      };
    }
    const data = (await res.json()) as T;
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : `Failed to load ${path}`,
    };
  }
}

export function loadManifest(): Promise<DataResult<DatasetManifest>> {
  return fetchJson<DatasetManifest>(`${DATA_ROOT}/manifest.json`);
}

export function loadLayer(key: LayerKey): Promise<DataResult<FeatureCollection>> {
  return fetchJson<FeatureCollection>(`${DATA_ROOT}/${LAYER_FILE[key]}`);
}

export function manifestLayer(
  manifest: DatasetManifest | null,
  key: LayerKey,
): ManifestLayer | undefined {
  return manifest?.layers.find((l) => l.key === key);
}
