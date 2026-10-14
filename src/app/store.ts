/**
 * Application state (Zustand).
 *
 * Keeps UI/dataset/selection state separate from algorithm results (which are
 * computed on demand and are not persisted). Scenario persistence is delegated
 * to a `ScenarioService` so it can be backed by local storage now and a real
 * database later.
 */
import { create } from "zustand";
import type {
  DatasetManifest,
  EdgeCostMetric,
  GeoProperties,
  Geometry,
  LayerKey,
} from "../types";

export interface SelectionInfo {
  kind: "edge" | "feature" | "node";
  id: string;
  layer: LayerKey | null;
  label: string;
  properties: GeoProperties;
  /** Original geometry for highlighting the selection on the map. */
  geometry?: Geometry | null;
  /** True when the selection belongs to the simulated graph, not mapped data. */
  simulated?: boolean;
}

export interface RouteHighlight {
  edgeIds: string[];
  path: string[];
  metric: EdgeCostMetric;
  totalCost: number;
  nodes: string[];
}

interface AppState {
  // Dataset
  manifest: DatasetManifest | null;
  manifestLoading: boolean;
  manifestError: string | null;
  setManifest: (m: DatasetManifest | null) => void;
  setManifestLoading: (v: boolean) => void;
  setManifestError: (v: string | null) => void;

  // Layer visibility
  visibleLayers: Record<LayerKey, boolean>;
  toggleLayer: (key: LayerKey) => void;
  setLayerVisible: (key: LayerKey, visible: boolean) => void;

  // Selection
  selection: SelectionInfo | null;
  setSelection: (sel: SelectionInfo | null) => void;

  // Map route highlight
  route: RouteHighlight | null;
  setRoute: (r: RouteHighlight | null) => void;
  routeNonce: number;
  bumpRouteNonce: () => void;

  // Sidebar (responsive)
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  // Workspace scenario label
  scenarioName: string;
  setScenarioName: (v: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  manifest: null,
  manifestLoading: false,
  manifestError: null,
  setManifest: (manifest) => set({ manifest }),
  setManifestLoading: (manifestLoading) => set({ manifestLoading }),
  setManifestError: (manifestError) => set({ manifestError }),

  visibleLayers: {
    transmission: true,
    interconnection: true,
    chambers: false,
    overhead: true,
    underground: true,
    meters: true,
  },
  toggleLayer: (key) =>
    set((s) => ({ visibleLayers: { ...s.visibleLayers, [key]: !s.visibleLayers[key] } })),
  setLayerVisible: (key, visible) =>
    set((s) => ({ visibleLayers: { ...s.visibleLayers, [key]: visible } })),

  selection: null,
  setSelection: (selection) => set({ selection }),

  route: null,
  setRoute: (route) => set({ route }),
  routeNonce: 0,
  bumpRouteNonce: () => set((s) => ({ routeNonce: s.routeNonce + 1 })),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  scenarioName: "Chennai Baseline",
  setScenarioName: (scenarioName) => set({ scenarioName }),
}));
