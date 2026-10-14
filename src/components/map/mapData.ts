/**
 * Helpers that turn loaded source GeoJSON into MapLibre-ready FeatureCollections.
 * Numeric fields are normalised (source values are strings) so the map can size
 * and colour features without client-side parsing expression acrobatics.
 */
import type { FeatureCollection, GeoFeature, LayerKey } from "@/types";

export interface PreparedFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

function numeric(props: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = props[key];
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function prepareLayer(collection: FeatureCollection, key: LayerKey): PreparedFeatureCollection {
  const features: GeoFeature[] = [];
  collection.features.forEach((feature, index) => {
    if (!feature.geometry) return;
    const props = { ...(feature.properties ?? {}) } as Record<string, unknown> & {
      __layer?: string;
      __index?: number;
      __sizeMm?: number | null;
      __lengthM?: number | null;
      __real?: boolean;
    };
    props.__layer = key;
    props.__index = index;
    props.__sizeMm = numeric(props, "size_of_pipe_mm", "size_mm");
    props.__lengthM = numeric(props, "length_of_main_m", "length_m", "st_length_shape_");
    props.__real = true;
    features.push({
      type: "Feature",
      id: `${key}-${index}`,
      geometry: feature.geometry,
      properties: props,
    });
  });
  return { type: "FeatureCollection", features };
}
