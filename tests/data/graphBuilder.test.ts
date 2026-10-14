import { describe, it, expect } from "vitest";
import {
  buildNetworkGraph,
  toWeightedGraph,
  DEFAULT_SNAP_TOLERANCE_M,
  EDGE_COST_METRICS,
} from "@/services/data/graphBuilder";
import type { FeatureCollection } from "@/types";

function fc(features: NonNullable<FeatureCollection>["features"]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

function line(coords: [number, number][], props: Record<string, unknown> = {}): NonNullable<FeatureCollection>["features"][number] {
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: props,
  };
}

const RECORDED_LINES = fc([
  line(
    [
      [80.27, 13.0827],
      [80.28, 13.0827],
    ],
    { from_id_tapping_point: "TP-1", to_id_inclusion_point: "IP-1", length_of_main_m: 1111, size_of_pipe_mm: 300 },
  ),
  line(
    [
      [80.28, 13.0827],
      [80.29, 13.0827],
    ],
    { from_id_tapping_point: "IP-2", to_id_inclusion_point: "TP-3", length_of_main_m: 999, size_of_pipe_mm: 150 },
  ),
]);

describe("buildNetworkGraph", () => {
  it("builds edges from recorded from/to identifiers", () => {
    const { graph, stats } = buildNetworkGraph([{ key: "transmission", data: RECORDED_LINES }]);
    expect(stats.recordedConnections).toBe(2);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[0].connectionType).toBe("recorded");
    expect(graph.edges[0].from).toBe("TP-1");
    expect(graph.edges[0].to).toBe("IP-1");
    expect(graph.edges[0].weight).toBe(1111);
  });

  it("snaps identifier-less endpoints within the tolerance and marks them inferred", () => {
    const snapDist = DEFAULT_SNAP_TOLERANCE_M / 111320; // ~5 m in degrees
    const snapped = fc([
      line([
        [80.27, 13.0827],
        [80.27 + 2 * snapDist, 13.0827],
      ]),
      line([
        [80.27 + (2 * snapDist + 0.9 * snapDist), 13.0827],
        [80.27 + 4 * snapDist, 13.0827],
      ]),
    ]);
    const first = snapped.features[0].geometry as { coordinates: [number, number][] };
    const second = snapped.features[1].geometry as { coordinates: [number, number][] };
    const gapM = Math.abs(second.coordinates[0][0] - first.coordinates[1][0]) * 111320;
    expect(gapM).toBeLessThan(DEFAULT_SNAP_TOLERANCE_M);

    const { graph, stats, warnings } = buildNetworkGraph(
      [{ key: "transmission", data: snapped }],
      { snapToleranceM: DEFAULT_SNAP_TOLERANCE_M },
    );
    expect(stats.geometryConnections).toBe(2);
    expect(graph.nodes.size).toBe(3); // A-B-C snapped at the shared fence
    expect(graph.edges.every((e) => e.connectionType === "geometry")).toBe(true);
    expect(warnings.join(" ")).toMatch(/inferred/);
  });

  it("does not merge distant endpoints", () => {
    const apart = fc([
      line([
        [80.27, 13.0827],
        [80.27, 13.083],
      ]),
      line([
        [80.27, 13.084],
        [80.27, 13.085],
      ]),
    ]);
    const { graph } = buildNetworkGraph([{ key: "transmission", data: apart }]);
    expect(graph.nodes.size).toBe(4);
    expect(graph.edges).toHaveLength(2);
  });

  it("reports no line features when given only polygons", () => {
    const polygons = fc([
      { type: "Feature", geometry: { type: "Polygon", coordinates: [[]] }, properties: {} },
    ]);
    const { stats, warnings } = buildNetworkGraph([{ key: "chambers", data: polygons }]);
    expect(stats.recordedConnections).toBe(0);
    expect(stats.geometryConnections).toBe(0);
    expect(warnings.join(" ")).toMatch(/No line features/);
  });
});

describe("toWeightedGraph metric mapping", () => {
  it("uses recorded length for the length metric", () => {
    const { graph } = buildNetworkGraph([{ key: "transmission", data: RECORDED_LINES }]);
    const wg = toWeightedGraph(graph, "length");
    expect(wg.edges[0].weight).toBe(1111);
  });

  it("uses 1000/diameter for the size metric", () => {
    const { graph } = buildNetworkGraph([{ key: "transmission", data: RECORDED_LINES }]);
    const wg = toWeightedGraph(graph, "size");
    expect(wg.edges[0].weight).toBeCloseTo(1000 / 300, 6);
  });

  it("uses unit cost for hops and never emits zero weights", () => {
    const { graph } = buildNetworkGraph([{ key: "transmission", data: RECORDED_LINES }]);
    const wg = toWeightedGraph(graph, "uniform");
    for (const e of wg.edges) {
      expect(e.weight).toBe(1);
    }
  });

  it("defines every metric with a label and description", () => {
    const labels = new Set(EDGE_COST_METRICS.map((m) => m.value));
    expect(labels).toEqual(new Set(["length", "uniform", "size"]));
    for (const m of EDGE_COST_METRICS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });
});