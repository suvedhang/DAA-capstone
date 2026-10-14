/**
 * Shared domain types for AquaMind.
 *
 * The `GeoJSON` types below are intentionally minimal (structural) so the app
 * does not depend on a geo typing package being installed. They mirror the
 * GeoJSON spec (RFC 7946).
 */

export type Position = [number, number] | [number, number, number] | number[];

export interface PointGeometry {
  type: "Point";
  coordinates: Position;
}
export interface MultiPointGeometry {
  type: "MultiPoint";
  coordinates: Position[];
}
export interface LineStringGeometry {
  type: "LineString";
  coordinates: Position[];
}
export interface MultiLineStringGeometry {
  type: "MultiLineString";
  coordinates: Position[][];
}
export interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}
export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: Position[][][];
}
export interface GeometryCollectionGeometry {
  type: "GeometryCollection";
  geometries: Geometry[];
}

export type Geometry =
  | PointGeometry
  | MultiPointGeometry
  | LineStringGeometry
  | MultiLineStringGeometry
  | PolygonGeometry
  | MultiPolygonGeometry
  | GeometryCollectionGeometry;

export interface GeoFeature<P = GeoProperties> {
  type: "Feature";
  id?: string | number;
  geometry: Geometry | null;
  properties: P;
}

export interface FeatureCollection<P = GeoProperties> {
  type: "FeatureCollection";
  features: GeoFeature<P>[];
}

/** Properties as converted from KML: arbitrary source attributes plus meta. */
export type GeoProperties = Record<string, unknown> & {
  __layer?: string;
  __source?: string;
};

/** Dataset layers produced by the conversion pipeline. */
export type LayerKey =
  | "transmission"
  | "interconnection"
  | "chambers"
  | "overhead"
  | "underground"
  | "meters";

export type LayerCategory = "network" | "pipe" | "chamber" | "tank" | "meter";

export interface ManifestLayer {
  key: LayerKey;
  label: string;
  category: LayerCategory;
  sourceFile: string;
  outputFile: string;
  available: boolean;
  featureCount: number;
  geometryTypes: Record<string, number>;
  bbox: [number, number, number, number] | null;
  sourceBytes?: number;
  sourceModified?: string;
  note: string;
  error?: string;
}

export interface DatasetManifest {
  name: string;
  generatedAt: string;
  converter: string;
  spatialReference: string;
  provenance: string;
  caveats: string[];
  layers: ManifestLayer[];
}

/* -------------------------------------------------------------------------- */
/* Graph model                                                                */
/* -------------------------------------------------------------------------- */

export interface GraphNode {
  id: string;
  /** lon,lat of the node (derived from an edge endpoint or identifier). */
  coord: [number, number] | null;
  /** Identifiers this node is associated with (tapping/inclusion/connecting IDs). */
  sourceIds: string[];
  label?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  /** Non-negative cost metric used by shortest-path algorithms. */
  weight: number;
  /** Length in metres if known from source attributes or geometry. */
  lengthM: number | null;
  /** Pipe diameter in mm if recorded in the source attributes. */
  sizeMm: number | null;
  /** Link back to the originating geographic feature index. */
  featureIndex: number | null;
  /** Provenance of the connection. */
  connectionType: "recorded" | "geometry";
  /** Source layer the edge came from. */
  layer: LayerKey;
  /** Original source attributes preserved for inspection. */
  properties: GeoProperties;
}

export interface NetworkGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  /** Adjacency list: nodeId -> incident edges. */
  adjacency: Map<string, GraphEdge[]>;
  directed: boolean;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  componentCount: number;
  largestComponentSize: number;
  recordedConnections: number;
  geometryConnections: number;
  totalLengthM: number;
}

export type EdgeCostMetric = "length" | "uniform" | "size";

/* -------------------------------------------------------------------------- */
/* Algorithm result types                                                     */
/* -------------------------------------------------------------------------- */

export interface PathResult {
  found: boolean;
  path: string[];
  edgeIds: string[];
  totalCost: number;
  edgesTraversed: number;
  visitedCount: number;
  executionMs: number;
  reason?: string;
}

export interface AllPairsResult {
  found: boolean;
  reason?: string;
  nodeIds: string[];
  /** dist[i][j] using nodeIds index mapping; Infinity when unreachable. */
  dist: number[][];
  next: string[][];
  executionMs: number;
  pairCount: number;
  reachablePairs: number;
  /** Pedagogical trace of selected pairs' distances after each k iteration. */
  pairTrace?: { k: number; dists: { i: number; j: number; d: number }[] }[];
}

export interface MstEdge {
  edgeId: string;
  from: string;
  to: string;
  weight: number;
}
export interface MstTraceStep {
  order: number;
  from: string;
  to: string;
  weight: number;
  /** For Kruskal: whether the edge joined two components or was skipped. */
  action: "join" | "skip" | "add";
}
export interface MstResult {
  edges: MstEdge[];
  totalWeight: number;
  componentCount: number;
  connected: boolean;
  executionMs: number;
  algorithm: "kruskal" | "prim";
  nodeCount: number;
  /** Optional pedagogical trace of decisions (built only when requested). */
  trace?: MstTraceStep[];
}
