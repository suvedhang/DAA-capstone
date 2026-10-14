import { describe, it, expect } from "vitest";
import { LAYER_FILE, manifestLayer } from "@/services/data/loader";
import type { DatasetManifest, LayerKey } from "@/types";

describe("data loader", () => {
  it("maps every layer key to a generated GeoJSON file", () => {
    expect(LAYER_FILE).toEqual({
      transmission: "chennai-water-network.geojson",
      interconnection: "chennai-interconnection-pipes.geojson",
      chambers: "chennai-distribution-chambers.geojson",
      overhead: "chennai-overhead-tanks.geojson",
      underground: "chennai-underground-tanks.geojson",
      meters: "chennai-flow-meters.geojson",
    });
  });

  it("looks up a layer descriptor from the manifest", () => {
    const manifest: DatasetManifest = {
      name: "test",
      generatedAt: "t",
      converter: "node",
      spatialReference: "EPSG:4326",
      provenance: "from-kml",
      caveats: [],
      layers: [
        {
          key: "transmission",
          label: "Network",
          category: "pipe",
          sourceFile: "chennai-water-network.kml",
          outputFile: "chennai-water-network.geojson",
          available: true,
          featureCount: 5,
          geometryTypes: { LineString: 5 },
          bbox: [0, 0, 1, 1],
          note: "",
        },
      ],
    };
    const layer = manifestLayer(manifest, "transmission");
    expect(layer?.outputFile).toBe("chennai-water-network.geojson");
    expect(manifestLayer(manifest, "meters")).toBeUndefined();
    expect(manifestLayer(null, "meters")).toBeUndefined();
  });

  it("covers every LayerKey with a file entry", () => {
    const keys: LayerKey[] = [
      "transmission",
      "interconnection",
      "chambers",
      "overhead",
      "underground",
      "meters",
    ];
    for (const k of keys) {
      expect(LAYER_FILE[k]).toMatch(/\.geojson$/);
    }
  });
});