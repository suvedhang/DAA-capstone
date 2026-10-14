import * as React from "react";
import maplibregl, { type GeoJSONSource, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useDataset } from "@/hooks/useDataset";
import { useAppStore, type SelectionInfo } from "@/app/store";
import { prepareLayer } from "./mapData";
import {
  BASE_MAP_STYLE,
  CHENNAI_CENTER,
  CHENNAI_ZOOM,
  LAYER_VISUAL,
  ROUTE_COLOR,
  ROUTE_NODE_COLOR,
  SELECTED_COLOR,
} from "./mapConfig";
import { edgeLineCoordinates } from "@/services/data/graphBuilder";
import type { GeoFeature, LayerKey } from "@/types";
import { ErrorState, LoadingState } from "@/components/common/states";

export interface NetworkMapHandle {
  resetView: () => void;
  fitToBounds: (bbox: [number, number, number, number], padding?: number) => void;
}

const SOURCE_ID = (k: LayerKey) => `src-${k}`;
const LINE_ID = (k: LayerKey) => `lyr-${k}-line`;
const FILL_ID = (k: LayerKey) => `lyr-${k}-fill`;
const POINT_ID = (k: LayerKey) => `lyr-${k}-point`;
const HOVER_ID = (k: LayerKey) => `lyr-${k}-hover`;

const ROUTE_SRC = "src-route";
const ROUTE_LINE = "lyr-route-line";
const ROUTE_NODE_SRC = "src-route-nodes";
const ROUTE_NODE = "lyr-route-node";
const SELECTED_SRC = "src-selected";
const SELECTED_LINE = "lyr-selected-line";
const SELECTED_FILL = "lyr-selected-fill";
const SELECTED_POINT = "lyr-selected-point";

interface NetworkMapProps {
  className?: string;
  /** Extra bottom/right padding used when fitting bounds near panels. */
  fitPadding?: number;
  /** Optional attribute filters applied to the transmission layer. */
  filters?: { transmissionMinSizeMm?: number | null };
}

export const NetworkMap = React.forwardRef<NetworkMapHandle, NetworkMapProps>(
  ({ className, fitPadding = 80, filters }, ref) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const mapRef = React.useRef<maplibregl.Map | null>(null);
    const [loaded, setLoaded] = React.useState(false);
    const [mapError, setMapError] = React.useState<string | null>(null);

    const { layers, graph } = useDataset();
    const visibleLayers = useAppStore((s) => s.visibleLayers);
    const setSelection = useAppStore((s) => s.setSelection);
    const route = useAppStore((s) => s.route);
    const selection = useAppStore((s) => s.selection);

    const prepared = React.useMemo(() => {
      const out: Partial<Record<LayerKey, ReturnType<typeof prepareLayer>>> = {};
      (Object.keys(layers) as LayerKey[]).forEach((key) => {
        const fc = layers[key];
        if (fc) out[key] = prepareLayer(fc, key);
      });
      return out;
    }, [layers]);

    const edgeMap = React.useMemo(() => {
      const m = new Map<string, string>();
      graph?.edges.forEach((e) => m.set(e.id, e.id));
      return m;
    }, [graph]);

    /* ---------------------------------------------------------------- init */
    React.useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      try {
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: BASE_MAP_STYLE as unknown as maplibregl.StyleSpecification,
          center: CHENNAI_CENTER,
          zoom: CHENNAI_ZOOM,
          minZoom: 8,
          maxZoom: 18,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
        map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
        map.on("load", () => setLoaded(true));
        map.on("error", (e) => {
          const msg = (e as { error?: { message?: string } })?.error?.message;
          if (msg && /tile|glyph|source/i.test(msg)) {
            setMapError((prev) => prev ?? msg);
          }
        });
        mapRef.current = map;
      } catch (err) {
        setMapError(err instanceof Error ? err.message : "Map failed to initialise.");
      }
      return () => {
        mapRef.current?.remove();
        mapRef.current = null;
        setLoaded(false);
      };
    }, []);

    /* ------------------------------------------------- add/update sources */
    React.useEffect(() => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      (Object.keys(prepared) as LayerKey[]).forEach((key) => {
        const data = prepared[key]!;
        const visual = LAYER_VISUAL[key];
        const srcId = SOURCE_ID(key);

        const existing = map.getSource(srcId) as GeoJSONSource | undefined;
        if (existing && typeof existing.setData === "function") {
          existing.setData(data as unknown as GeoJSON.FeatureCollection);
        } else {
          map.addSource(srcId, { type: "geojson", data: data as unknown as GeoJSON.FeatureCollection });
        }

        const visible = visibleLayers[key];
        const visLayout = visible ? "visible" : "none";

        if (visual.kind === "line") {
          if (!map.getLayer(LINE_ID(key))) {
            map.addLayer({
              id: LINE_ID(key),
              type: "line",
              source: srcId,
              minzoom: visual.minZoom,
              layout: { "line-cap": "round", "line-join": "round", visibility: visLayout },
              paint: {
                "line-color": visual.color,
                "line-opacity": key === "transmission" ? 0.85 : 0.6,
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  9, visual.width * 0.5,
                  13, visual.width,
                  17, visual.width * 2.2,
                ],
              },
            });
          }
          if (!map.getLayer(HOVER_ID(key))) {
            map.addLayer({
              id: HOVER_ID(key),
              type: "line",
              source: srcId,
              minzoom: visual.minZoom,
              layout: { "line-cap": "round", "line-join": "round", visibility: visLayout },
              paint: {
                "line-color": "#FFFFFF",
                "line-opacity": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  0.85,
                  0,
                ],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  9, visual.width,
                  13, visual.width * 2.4,
                  17, visual.width * 4,
                ],
              },
            });
          }
          map.setLayoutProperty(LINE_ID(key), "visibility", visLayout);
          map.setLayoutProperty(HOVER_ID(key), "visibility", visLayout);

          if (key === "transmission") {
            const minSize = filters?.transmissionMinSizeMm;
            const filterExpr: maplibregl.FilterSpecification | null =
              minSize && minSize > 0
                ? [">=", ["to-number", ["get", "__sizeMm"]], minSize]
                : null;
            map.setFilter(LINE_ID(key), filterExpr);
            map.setFilter(HOVER_ID(key), filterExpr);
          }
        }

        if (visual.kind === "polygon") {
          if (!map.getLayer(FILL_ID(key))) {
            map.addLayer({
              id: FILL_ID(key),
              type: "fill",
              source: srcId,
              minzoom: visual.minZoom,
              layout: { visibility: visLayout },
              paint: {
                "fill-color": visual.color,
                "fill-opacity": visual.opacity ?? 0.3,
                "fill-outline-color": visual.color,
              },
            });
          }
          map.setLayoutProperty(FILL_ID(key), "visibility", visLayout);
        }

        if (visual.kind === "point") {
          if (!map.getLayer(POINT_ID(key))) {
            map.addLayer({
              id: POINT_ID(key),
              type: "circle",
              source: srcId,
              minzoom: visual.minZoom,
              layout: { visibility: visLayout },
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 14, 5, 18, 8],
                "circle-color": visual.color,
                "circle-opacity": 0.85,
                "circle-stroke-color": "#071521",
                "circle-stroke-width": 1,
              },
            });
          }
          map.setLayoutProperty(POINT_ID(key), "visibility", visLayout);
        }
      });
    }, [loaded, prepared, visibleLayers, filters?.transmissionMinSizeMm]);

    /* --------------------------------------------------------- interactions */
    React.useEffect(() => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      const interactiveLayers: string[] = [];
      (Object.keys(prepared) as LayerKey[]).forEach((key) => {
        const kind = LAYER_VISUAL[key].kind;
        if (kind === "line") interactiveLayers.push(HOVER_ID(key));
        else if (kind === "polygon") interactiveLayers.push(FILL_ID(key));
        else interactiveLayers.push(POINT_ID(key));
      });

      let hovered: { sourceId: string; id: string | number } | null = null;

      const clearHover = () => {
        if (hovered && map.getSource(hovered.sourceId)) {
          map.setFeatureState({ source: hovered.sourceId, id: hovered.id }, { hover: false });
        }
        hovered = null;
      };

      const onClick = (e: MapMouseEvent) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
        if (feats.length === 0) return;
        const f = feats[0];
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const layer = (props.__layer as LayerKey) ?? null;
        const feature = prepared[layer ?? ("" as LayerKey)]?.features.find(
          (x) => x.id === f.id,
        ) as GeoFeature | undefined;
        const info: SelectionInfo = {
          kind: "feature",
          id: String(f.id ?? ""),
          layer,
          label: layer ? layerLabel(layer) : "Feature",
          properties: props as SelectionInfo["properties"],
          geometry: feature?.geometry ?? (f.geometry as SelectionInfo["geometry"]) ?? null,
          simulated: false,
        };
        setSelection(info);
      };

      const onMove = (e: MapMouseEvent) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
        if (feats.length === 0) {
          map.getCanvas().style.cursor = "";
          clearHover();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const top = feats[0];
        if (hovered && (hovered.id !== top.id || hovered.sourceId !== top.source)) clearHover();
        if (top.id !== undefined && map.getSource(top.source)) {
          map.setFeatureState({ source: top.source, id: top.id }, { hover: true });
          hovered = { sourceId: top.source, id: top.id };
        }
      };

      const onLeave = () => {
        map.getCanvas().style.cursor = "";
        clearHover();
      };

      map.on("click", onClick);
      map.on("mousemove", onMove);
      map.on("mouseout", onLeave);
      return () => {
        map.off("click", onClick);
        map.off("mousemove", onMove);
        map.off("mouseout", onLeave);
      };
    }, [loaded, prepared, setSelection]);

    /* -------------------------------------------------------------- route */
    React.useEffect(() => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      const routeLines: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      const routeNodes: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

      if (route && graph) {
        const edgeById = new Map(graph.edges.map((e) => [e.id, e]));
        for (const edgeId of route.edgeIds) {
          const edge = edgeById.get(edgeId);
          if (!edge) continue;
          const lines = edgeLineCoordinates(layers, edge);
          for (const line of lines) {
            routeLines.features.push({
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: line },
            });
          }
        }
        for (const nodeId of route.path) {
          const node = graph.nodes.get(nodeId);
          if (node?.coord) {
            routeNodes.features.push({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: node.coord },
            });
          }
        }
      }

      const ensure = (
        id: string,
        data: GeoJSON.FeatureCollection,
        add: () => void,
      ) => {
        const src = map.getSource(id) as GeoJSONSource | undefined;
        if (src && typeof src.setData === "function") src.setData(data);
        else {
          map.addSource(id, { type: "geojson", data });
          add();
        }
      };

      ensure(ROUTE_SRC, routeLines, () => {
        map.addLayer({
          id: ROUTE_LINE,
          type: "line",
          source: ROUTE_SRC,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ROUTE_COLOR,
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 14, 5, 18, 8],
            "line-opacity": 0.95,
            "line-dasharray": [2, 1.4],
          },
        });
      });
      ensure(ROUTE_NODE_SRC, routeNodes, () => {
        map.addLayer({
          id: ROUTE_NODE,
          type: "circle",
          source: ROUTE_NODE_SRC,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 15, 7],
            "circle-color": ROUTE_NODE_COLOR,
            "circle-stroke-color": "#071521",
            "circle-stroke-width": 1.5,
          },
        });
      });

      if (route && route.edgeIds.length > 0) {
        const coords = routeNodes.features.map((f) => (f.geometry as GeoJSON.Point).coordinates);
        if (coords.length > 1) {
          const bounds = coords.reduce(
            (b, c) => b.extend(c as [number, number]),
            new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]),
          );
          map.fitBounds(bounds, { padding: fitPadding, maxZoom: 15, duration: 900 });
        }
      }
    }, [loaded, route, graph, layers, fitPadding]);

    /* ---------------------------------------------------------- selection */
    React.useEffect(() => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      const selectedFc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      if (selection?.geometry) {
        selectedFc.features.push({
          type: "Feature",
          properties: {},
          geometry: selection.geometry as unknown as GeoJSON.Geometry,
        });
      }

      const ensure = (
        id: string,
        data: GeoJSON.FeatureCollection,
        add: () => void,
      ) => {
        const src = map.getSource(id) as GeoJSONSource | undefined;
        if (src && typeof src.setData === "function") src.setData(data);
        else {
          map.addSource(id, { type: "geojson", data });
          add();
        }
      };

      ensure(SELECTED_SRC, selectedFc, () => {
        map.addLayer({
          id: SELECTED_FILL,
          type: "fill",
          source: SELECTED_SRC,
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: { "fill-color": SELECTED_COLOR, "fill-opacity": 0.28, "fill-outline-color": SELECTED_COLOR },
        });
        map.addLayer({
          id: SELECTED_LINE,
          type: "line",
          source: SELECTED_SRC,
          filter: ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": SELECTED_COLOR,
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 6, 18, 10],
            "line-opacity": 1,
          },
        });
        map.addLayer({
          id: SELECTED_POINT,
          type: "circle",
          source: SELECTED_SRC,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 7,
            "circle-color": SELECTED_COLOR,
            "circle-stroke-color": "#071521",
            "circle-stroke-width": 2,
          },
        });
      });
    }, [loaded, selection]);

    React.useImperativeHandle(
      ref,
      () => ({
        resetView: () => {
          mapRef.current?.flyTo({ center: CHENNAI_CENTER, zoom: CHENNAI_ZOOM, duration: 800 });
        },
        fitToBounds: (bbox, padding = fitPadding) => {
          mapRef.current?.fitBounds(
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[3]],
            ],
            { padding, duration: 800, maxZoom: 15 },
          );
        },
      }),
      [fitPadding],
    );

    return (
      <div className={className}>
        <div ref={containerRef} className="h-full w-full" />
        {!loaded ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-abyss/70 backdrop-blur-sm">
            <LoadingState label="Loading Chennai basemap…" />
          </div>
        ) : null}
        {mapError ? (
          <div className="absolute bottom-3 left-1/2 w-[min(92%,26rem)] -translate-x-1/2">
            <ErrorState
              title="Basemap tiles unavailable"
              description={`${mapError}. Network data overlays remain usable. Check connectivity or point the map at a licensed tile endpoint.`}
            />
          </div>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {edgeMap.size} network edges indexed
        </span>
      </div>
    );
  },
);
NetworkMap.displayName = "NetworkMap";

function layerLabel(layer: LayerKey): string {
  switch (layer) {
    case "transmission":
      return "Transmission main";
    case "interconnection":
      return "Interconnection pipe";
    case "chambers":
      return "Distribution chamber";
    case "overhead":
      return "Overhead tank";
    case "underground":
      return "Underground tank";
    case "meters":
      return "Flow meter";
    default:
      return "Feature";
  }
}
