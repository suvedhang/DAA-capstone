/**
 * MapLibre configuration.
 *
 * Basemap: CARTO "Dark Matter" raster tiles (OpenStreetMap data). We build the
 * style locally with a raster source so the app does not depend on a remote
 * style JSON at runtime, and attribution is enforced in the style.
 *
 * CARTO basemaps outside the CARTO platform require an API key (free tier).
 * Set it via the VITE_CARTO_API_KEY environment variable (.env, gitignored);
 * it is appended to every tile request as ?key=. Without it, tiles render with
 * CARTO's "API KEY REQUIRED" watermark.
 *
 * Attribution (required by OSM + CARTO):
 *   © OpenStreetMap contributors © CARTO
 */
import type { LayerKey } from "@/types";

export const CHENNAI_CENTER: [number, number] = [80.27, 13.0827];
export const CHENNAI_ZOOM = 10.4;

const CARTO_API_KEY = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();
const CARTO_QUERY = CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : "";

const CARTO_TILES = [
  `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
  `https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
  `https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
  `https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
];

export const BASE_MAP_STYLE = {
  version: 8 as const,
  sources: {
    basemap: {
      type: "raster" as const,
      tiles: CARTO_TILES,
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "basemap",
      type: "raster" as const,
      source: "basemap",
      paint: {
        "raster-opacity": 0.92,
        "raster-saturation": -0.25,
        "raster-brightness-min": 0.02,
        "raster-brightness-max": 0.75,
      },
    },
  ],
};

export interface LayerVisual {
  /** Primary stroke/fill colour. */
  color: string;
  /** Line width at zoom 11 (scaled by zoom interpolation). */
  width: number;
  minZoom?: number;
  opacity?: number;
}

/** Visual style per dataset layer. */
export const LAYER_VISUAL: Record<LayerKey, LayerVisual & { kind: "line" | "polygon" | "point" }> = {
  transmission: { kind: "line", color: "#00C8E8", width: 1.4, minZoom: 8 },
  interconnection: { kind: "line", color: "#4D8BA6", width: 0.9, minZoom: 11 },
  chambers: { kind: "polygon", color: "#F5A524", width: 1, minZoom: 12, opacity: 0.28 },
  overhead: { kind: "polygon", color: "#2DD4A7", width: 1, minZoom: 9, opacity: 0.42 },
  underground: { kind: "polygon", color: "#5EE6C0", width: 1, minZoom: 9, opacity: 0.32 },
  meters: { kind: "point", color: "#8FD8FF", width: 1, minZoom: 9 },
};

export const ROUTE_COLOR = "#F5D90A";
export const ROUTE_NODE_COLOR = "#FFE85C";
export const SELECTED_COLOR = "#FF7A45";
