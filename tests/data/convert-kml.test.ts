import { describe, it, expect } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { kml } from "@tmcw/togeojson";

const MINIMAL_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <Document>
    <name>Test dataset</name>
    <Placemark>
      <name>Main A-B</name>
      <description>recorded link</description>
      <Style><LineStyle><color>ff0000ff</color><width>2</width></LineStyle></Style>
      <ExtendedData>
        <Data name="from_id_tapping_point"><value>TP-001</value></Data>
        <Data name="to_id_inclusion_point"><value>IP-002</value></Data>
        <Data name="length_of_main_m"><value>450</value></Data>
        <Data name="size_of_pipe_mm"><value>300</value></Data>
      </ExtendedData>
      <LineString>
        <coordinates>80.2700000,13.0827000,0 80.2800000,13.0827000,0</coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Chamber</name>
      <Polygon>
        <outerBoundaryIs><LinearRing>
          <coordinates>80.270,13.082 80.271,13.082 80.271,13.083 80.270,13.083 80.270,13.082</coordinates>
        </LinearRing></outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

describe("KML → GeoJSON pipeline (togeojson + xmldom, mirroring scripts/convert-kml.ts)", () => {
  const doc = new DOMParser().parseFromString(MINIMAL_KML, "text/xml");
  // @xmldom returns its own Document type; togeojson's types expect the DOM
  // Document, so cast the same way scripts/convert-kml.ts does.
  const geojson = kml(doc as unknown as Document);

  it("converts the line placemark to a LineString feature", () => {
    const line = geojson.features.find(
      (f) => f.id === "Main A-B" || f.properties?.name === "Main A-B",
    );
    expect(line).toBeDefined();

    const geom = line!.geometry as { type: string; coordinates: number[][] };
    expect(geom.type).toBe("LineString");
    expect(geom.coordinates).toHaveLength(2);
    expect(geom.coordinates[0][0]).toBeCloseTo(80.27, 6);
  });

  it("preserves the Ids and pipe attributes used for recorded connectivity", () => {
    const props = geojson.features[0].properties ?? {};
    expect(props.from_id_tapping_point).toBe("TP-001");
    expect(props.to_id_inclusion_point).toBe("IP-002");
    expect(props.length_of_main_m).toBe("450");
    expect(Number(props.size_of_pipe_mm)).toBe(300);
  });

  it("converts polygon rings to GeoJSON polygon coordinates", () => {
    const poly = geojson.features.find((f) => (f.geometry as { type: string })?.type === "Polygon");
    expect(poly).toBeDefined();
    const geom = poly!.geometry as { type: string; coordinates: number[][][] };
    expect(geom.type).toBe("Polygon");
    expect(geom.coordinates[0]).toHaveLength(5); // closed ring
    expect(geom.coordinates[0][0]).toEqual(geom.coordinates[0][4]);
  });
});