import { length as turfLength, bbox as turfBbox } from "@turf/turf";
import type { Geometry, Position } from "@/types";

export type Line = [number, number][];

/** Extract line coordinate arrays from any geometry (LineString/Multi/Collection). */
export function toLines(geometry: Geometry | null): Line[] {
  if (!geometry) return [];
  if (geometry.type === "LineString") {
    return [geometry.coordinates.map((c) => [Number(c[0]), Number(c[1])] as [number, number])];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((line) =>
      line.map((c) => [Number(c[0]), Number(c[1])] as [number, number]),
    );
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((g) => toLines(g));
  }
  return [];
}

/** Length of a line in metres using turf's geodesic length. */
export function lineLengthM(line: Line): number | null {
  if (line.length < 2) return null;
  try {
    const km = turfLength(
      { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } },
      { units: "kilometers" },
    );
    return km * 1000;
  } catch {
    return null;
  }
}

export function lineMidpoint(line: Line): [number, number] | null {
  if (line.length === 0) return null;
  const mid = line[Math.floor(line.length / 2)];
  return [mid[0], mid[1]];
}

/** Collect every position from a geometry (any type). */
export function flattenPositions(geometry: Geometry | null, into: Position[] = []): Position[] {
  if (!geometry) return into;
  if (geometry.type === "GeometryCollection") {
    for (const g of geometry.geometries) flattenPositions(g, into);
    return into;
  }
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
      into.push(node as Position);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(geometry.coordinates);
  return into;
}

export function bboxOf(geometries: (Geometry | null)[]): [number, number, number, number] | null {
  const positions: Position[] = [];
  for (const g of geometries) flattenPositions(g, positions);
  if (positions.length === 0) return null;
  try {
    return turfBbox({
      type: "FeatureCollection",
      features: positions.map((p) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [p[0], p[1]] },
      })),
    }) as [number, number, number, number];
  } catch {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of positions) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
    return [minX, minY, maxX, maxY];
  }
}
