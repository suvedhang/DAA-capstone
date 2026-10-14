/**
 * Graph construction layer — converts geographic pipe features into a
 * connected network graph, kept strictly separate from map rendering.
 *
 * Two sources of connectivity are used, in priority order:
 *
 *   1. RECORDED connectivity — when the source attributes contain explicit
 *      from/to identifiers (e.g. `from_id_tapping_point` /
 *      `to_id_inclusion_point`, or `connecting_from_id` / `connecting_to_id`).
 *      These are treated as confirmed physical connections.
 *
 *   2. GEOMETRY connectivity — features without identifiers fall back to
 *      snapping their endpoints to nearby endpoints within `snapToleranceM`.
 *      These are marked as INFERRED, not confirmed. We never treat a visual
 *      crossing as a junction.
 *
 * Nothing here invents capacity, pressure, flow or valve state.
 */
import type {
  FeatureCollection,
  GeoFeature,
  GraphEdge,
  GraphNode,
  GraphStats,
  LayerKey,
  NetworkGraph,
  EdgeCostMetric,
  GeoProperties,
} from "../../types";
import {
  buildWeightedGraph,
  countComponents,
  largestComponent,
  type WeightedGraph,
} from "../../algorithms/graph/graph";
import { toLines, lineLengthM, type Line } from "../../utils/geo";

export const DEFAULT_SNAP_TOLERANCE_M = 5;

export interface BuildGraphOptions {
  /** Endpoint snapping tolerance for identifier-less features, in metres. */
  snapToleranceM?: number;
  /** Safety cap on how many identifier-less features are snapped. */
  maxGeometryEdges?: number;
}

export interface GraphBuildResult {
  graph: NetworkGraph;
  stats: GraphStats;
  warnings: string[];
}

const TRANSMISSION_FROM = "from_id_tapping_point";
const TRANSMISSION_TO = "to_id_inclusion_point";
const INTERCONNECT_FROM = "connecting_from_id";
const INTERCONNECT_TO = "connecting_to_id";

function str(props: GeoProperties, key: string): string | null {
  const v = props[key];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "" || s === "NA" || s === "<Null>") return null;
  return s;
}

function num(props: GeoProperties, key: string): number | null {
  const v = props[key];
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asLines(geometry: GeoFeature["geometry"]): Line[] {
  return toLines(geometry);
}

function geometricLengthM(line: [number, number][]): number | null {
  return lineLengthM(line);
}

interface Accumulator {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  warnings: string[];
  recorded: number;
  geometry: number;
}

function findOrCreateSnappedNode(
  acc: Accumulator,
  coord: [number, number],
  toleranceDeg: number,
): string {
  const gx = Math.round(coord[0] / toleranceDeg);
  const gy = Math.round(coord[1] / toleranceDeg);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `geo:${gx + dx}:${gy + dy}`;
      const existing = acc.nodes.get(key);
      if (existing) return key;
    }
  }
  const key = `geo:${gx}:${gy}`;
  acc.nodes.set(key, { id: key, coord, sourceIds: [] });
  return key;
}

function ensureRecordedNode(acc: Accumulator, id: string, coord: [number, number] | null): void {
  const existing = acc.nodes.get(id);
  if (existing) {
    if (!existing.coord && coord) existing.coord = coord;
    return;
  }
  acc.nodes.set(id, { id, coord, sourceIds: [id] });
}

export function buildNetworkGraph(
  layers: { key: LayerKey; data: FeatureCollection }[],
  options: BuildGraphOptions = {},
): GraphBuildResult {
  const snapToleranceM = options.snapToleranceM ?? DEFAULT_SNAP_TOLERANCE_M;
  const maxGeometryEdges = options.maxGeometryEdges ?? 60_000;
  const toleranceDeg = snapToleranceM / 111_320;

  const acc: Accumulator = {
    nodes: new Map(),
    edges: [],
    warnings: [],
    recorded: 0,
    geometry: 0,
  };

  let edgeSeq = 0;

  const consider = (layerKey: LayerKey, data: FeatureCollection, fromKey: string | null, toKey: string | null) => {
    data.features.forEach((feature, index) => {
      const lines = asLines(feature.geometry);
      if (lines.length === 0) return;
      const props = feature.properties ?? {};
      const line = lines[0];
      const start: [number, number] = line[0];
      const end: [number, number] = line[line.length - 1];

      const lengthM =
        num(props, "length_of_main_m") ??
        num(props, "length_m") ??
        num(props, "st_length_shape_") ??
        geometricLengthM(line);
      const sizeMm =
        num(props, "size_of_pipe_mm") ?? num(props, "size_mm") ?? null;

      let fromId: string | null = null;
      let toId: string | null = null;
      if (fromKey) fromId = str(props, fromKey);
      if (toKey) toId = str(props, toKey);

      if (fromId && toId && fromId !== toId) {
        ensureRecordedNode(acc, fromId, start);
        ensureRecordedNode(acc, toId, end);
        acc.edges.push({
          id: `e${edgeSeq++}`,
          from: fromId,
          to: toId,
          weight: lengthM ?? 1,
          lengthM,
          sizeMm,
          featureIndex: index,
          connectionType: "recorded",
          layer: layerKey,
          properties: props,
        });
        acc.recorded++;
        return;
      }

      // Geometry fallback — only if under the cap.
      if (acc.geometry >= maxGeometryEdges) return;
      const a = findOrCreateSnappedNode(acc, start, toleranceDeg);
      const b = findOrCreateSnappedNode(acc, end, toleranceDeg);
      if (a === b) return;
      acc.edges.push({
        id: `e${edgeSeq++}`,
        from: a,
        to: b,
        weight: lengthM ?? 1,
        lengthM,
        sizeMm,
        featureIndex: index,
        connectionType: "geometry",
        layer: layerKey,
        properties: props,
      });
      acc.geometry++;
    });
  };

  for (const layer of layers) {
    if (layer.key === "transmission") {
      consider(layer.key, layer.data, TRANSMISSION_FROM, TRANSMISSION_TO);
    } else if (layer.key === "interconnection") {
      consider(layer.key, layer.data, INTERCONNECT_FROM, INTERCONNECT_TO);
    }
  }

  if (acc.geometry > 0) {
    acc.warnings.push(
      `${acc.geometry.toLocaleString()} pipe features had no recorded from/to identifiers and were connected by endpoint snapping at ${snapToleranceM} m. These are inferred connections, not confirmed physical junctions.`,
    );
  }
  if (acc.recorded === 0 && acc.geometry === 0) {
    acc.warnings.push("No line features were available to construct a graph.");
  }

  const adjacency = new Map<string, GraphEdge[]>();
  for (const id of acc.nodes.keys()) adjacency.set(id, []);
  for (const e of acc.edges) {
    (adjacency.get(e.from) ?? adjacency.set(e.from, []).get(e.from)!).push(e);
    (adjacency.get(e.to) ?? adjacency.set(e.to, []).get(e.to)!).push(e);
  }

  const graph: NetworkGraph = {
    nodes: acc.nodes,
    edges: acc.edges,
    adjacency,
    directed: false,
  };

  const weighted: WeightedGraph = buildWeightedGraph(
    acc.nodes.keys(),
    acc.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, weight: Math.max(e.weight, 0) })),
    false,
  );
  const componentCount = countComponents(weighted);
  const largest = largestComponent(weighted);
  const totalLengthM = acc.edges.reduce((s, e) => s + (e.lengthM ?? 0), 0);

  const stats: GraphStats = {
    nodeCount: acc.nodes.size,
    edgeCount: acc.edges.length,
    componentCount,
    largestComponentSize: largest.size,
    recordedConnections: acc.recorded,
    geometryConnections: acc.geometry,
    totalLengthM,
  };

  return { graph, stats, warnings: acc.warnings };
}

/** Convert a NetworkGraph into a WeightedGraph for a chosen cost metric. */
export function toWeightedGraph(
  graph: NetworkGraph,
  metric: EdgeCostMetric,
): WeightedGraph {
  const edges = graph.edges.map((e) => {
    let weight: number;
    switch (metric) {
      case "uniform":
        weight = 1;
        break;
      case "size": {
        const d = e.sizeMm && e.sizeMm > 0 ? e.sizeMm : 100;
        weight = 1000 / d;
        break;
      }
      case "length":
      default:
        weight = e.lengthM && e.lengthM > 0 ? e.lengthM : 1;
        break;
    }
    return { id: e.id, from: e.from, to: e.to, weight: Math.max(weight, 1e-6) };
  });
  return buildWeightedGraph(graph.nodes.keys(), edges, false);
}

/** Look up the original line coordinates for an edge so routes can be drawn on the map. */
export function edgeLineCoordinates(
  layers: Partial<Record<LayerKey, FeatureCollection>>,
  edge: GraphEdge,
): Line[] {
  const fc = layers[edge.layer];
  if (!fc || edge.featureIndex === null) return [];
  const feature = fc.features[edge.featureIndex];
  return toLines(feature?.geometry ?? null);
}

export const EDGE_COST_METRICS: { value: EdgeCostMetric; label: string; description: string }[] = [
  {
    value: "length",
    label: "Pipe length (m)",
    description: "Edge cost equals the recorded pipe length in metres.",
  },
  {
    value: "uniform",
    label: "Uniform (hops)",
    description: "Every edge costs 1; minimises the number of pipes traversed.",
  },
  {
    value: "size",
    label: "Inverse diameter",
    description: "Cost = 1000 / diameter(mm). Favours larger mains. Illustrative only — not a hydraulic head-loss model.",
  },
];
