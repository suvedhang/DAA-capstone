/**
 * AquaMind — KML -> GeoJSON conversion pipeline.
 *
 * Reads the supplied Chennai water-infrastructure KML files from `data/`,
 * converts them to GeoJSON with @tmcw/togeojson, preserves source attributes,
 * and writes both the per-layer GeoJSON files and a provenance manifest into
 * `public/data/`.
 *
 * Run with:  npm run convert
 *
 * NOTE: This script never fabricates geometry. If a source file is missing it
 * is skipped and reported in the manifest as unavailable.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { kml as kmlToGeoJson } from "@tmcw/togeojson";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "data");
const OUT_DIR = join(ROOT, "public", "data");

type Position = [number, number, ...number[]];
interface Geometry {
  type: string;
  coordinates?: unknown;
  geometries?: Geometry[];
}
interface Feature {
  type: "Feature";
  geometry: Geometry | null;
  properties: Record<string, unknown>;
}
interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

interface LayerSpec {
  key: string;
  sourceFile: string;
  outputFile: string;
  label: string;
  /** Which dataset categories this layer represents on the map. */
  category: "network" | "pipe" | "chamber" | "tank" | "meter";
  /** Extra provenance note shown in the UI. */
  note: string;
}

const LAYERS: LayerSpec[] = [
  {
    key: "transmission",
    sourceFile: "chennai-water-network.kml",
    outputFile: "chennai-water-network.geojson",
    label: "Water Main Transmission Network",
    category: "network",
    note: "Primary transmission mains with tapping/inclusion point IDs.",
  },
  {
    key: "interconnection",
    sourceFile: "Water Supply Interconnection Pipes.kml",
    outputFile: "chennai-interconnection-pipes.geojson",
    label: "Water Supply Interconnection Pipes",
    category: "pipe",
    note: "Interconnection pipes between water distribution stations.",
  },
  {
    key: "chambers",
    sourceFile: "Water Supply Distribution Chambers.kml",
    outputFile: "chennai-distribution-chambers.geojson",
    label: "Distribution Chambers",
    category: "chamber",
    note: "Distribution chamber footprints.",
  },
  {
    key: "overhead",
    sourceFile: "Water Supply Overhead Tanks.kml",
    outputFile: "chennai-overhead-tanks.geojson",
    label: "Overhead Tanks",
    category: "tank",
    note: "Overhead service reservoir footprints.",
  },
  {
    key: "underground",
    sourceFile: "Water Supply Underground Tanks.kml",
    outputFile: "chennai-underground-tanks.geojson",
    label: "Underground Tanks",
    category: "tank",
    note: "Underground service reservoir footprints.",
  },
  {
    key: "meters",
    sourceFile: "Water Supply Flow Meters.kml",
    outputFile: "chennai-flow-meters.geojson",
    label: "Flow Meters",
    category: "meter",
    note: "Metering locations (points).",
  },
];

function collectPositions(geom: Geometry | null, into: Position[]): void {
  if (!geom) return;
  if (geom.type === "GeometryCollection" && geom.geometries) {
    for (const g of geom.geometries) collectPositions(g, into);
    return;
  }
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === "number" &&
      typeof node[1] === "number"
    ) {
      into.push([node[0], node[1]]);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(geom.coordinates);
}

function geometryTypes(features: Feature[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of features) {
    const t = f.geometry?.type ?? "None";
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

function bboxOf(features: Feature[]): [number, number, number, number] | null {
  const pts: Position[] = [];
  for (const f of features) collectPositions(f.geometry, pts);
  if (pts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

interface ManifestLayer {
  key: string;
  label: string;
  category: LayerSpec["category"];
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

function convertLayer(spec: LayerSpec): ManifestLayer {
  const srcPath = join(RAW_DIR, spec.sourceFile);
  const base: ManifestLayer = {
    key: spec.key,
    label: spec.label,
    category: spec.category,
    sourceFile: spec.sourceFile,
    outputFile: spec.outputFile,
    available: false,
    featureCount: 0,
    geometryTypes: {},
    bbox: null,
    note: spec.note,
  };

  if (!existsSync(srcPath)) {
    base.error = `Source file not found: ${spec.sourceFile}`;
    console.warn(`[skip] ${base.error}`);
    return base;
  }

  try {
    const raw = readFileSync(srcPath, "utf8");
    const doc = new DOMParser().parseFromString(raw, "text/xml");
    const gj = kmlToGeoJson(doc) as unknown as FeatureCollection;
    const features = (gj.features ?? []).map((f) => {
      const props: Record<string, unknown> = { ...(f.properties ?? {}) };
      props["__layer"] = spec.key;
      props["__source"] = spec.sourceFile;
      return { ...f, properties: props };
    });
    const out: FeatureCollection = { type: "FeatureCollection", features };
    writeFileSync(join(OUT_DIR, spec.outputFile), JSON.stringify(out));

    const st = statSync(srcPath);
    return {
      ...base,
      available: true,
      featureCount: features.length,
      geometryTypes: geometryTypes(features),
      bbox: bboxOf(features),
      sourceBytes: st.size,
      sourceModified: st.mtime.toISOString(),
    };
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
    console.error(`[error] ${spec.sourceFile}: ${base.error}`);
    return base;
  }
}

function main(): void {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log(`AquaMind KML -> GeoJSON converter`);
  console.log(`  raw:    ${RAW_DIR}`);
  console.log(`  output: ${OUT_DIR}\n`);

  const layers = LAYERS.map(convertLayer);

  const manifest = {
    name: "Chennai Water Distribution Network",
    generatedAt: new Date().toISOString(),
    converter: "@tmcw/togeojson",
    spatialReference:
      "WGS84 geographic coordinates (EPSG:4326) as supplied in KML; values are lon,lat.",
    provenance:
      "Chennai Metro Water supply infrastructure layers (transmission mains, interconnection pipes, distribution chambers, overhead/underground tanks, flow meters).",
    caveats: [
      "Geometry and attributes are reproduced verbatim from the source KML; no values are invented.",
      "Presence of a feature does not confirm it is currently operational, surveyed recently, or hydraulically valid.",
      "Connectivity is derived from recorded from/to identifier fields where present; otherwise it is unavailable.",
    ],
    layers,
  };

  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  const total = layers.reduce((s, l) => s + l.featureCount, 0);
  console.log("\nLayer summary:");
  for (const l of layers) {
    const types = Object.entries(l.geometryTypes)
      .map(([t, c]) => `${t}:${c}`)
      .join(", ");
    console.log(
      `  ${l.available ? "OK " : "!! "}${l.key.padEnd(14)} ${String(l.featureCount).padStart(6)} features  [${types || "n/a"}]`,
    );
  }
  console.log(`\n  total features: ${total}`);
  console.log(`  manifest: ${join(OUT_DIR, "manifest.json")}`);
}

main();
