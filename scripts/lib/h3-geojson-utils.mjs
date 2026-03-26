import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cellToBoundary, gridRing } from "h3-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, "../..");

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }
    args[current.slice(2)] = argv[index + 1];
    index += 1;
  }

  return args;
}

export function resolveRootPath(relativePath) {
  return path.resolve(rootDir, relativePath);
}

export function closeRing(ring) {
  if (!ring.length) {
    return ring;
  }

  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  if (firstLng === lastLng && firstLat === lastLat) {
    return ring;
  }

  return [...ring, ring[0]];
}

export function buildHexFeature(cell, properties, extraProperties = {}) {
  const boundary = closeRing(cellToBoundary(cell, true));
  return {
    type: "Feature",
    properties: {
      ...properties,
      h3_index: cell,
      ...extraProperties
    },
    geometry: {
      type: "Polygon",
      coordinates: [boundary]
    }
  };
}

export function getPolygonCoordinates(geojson) {
  if (geojson.type === "FeatureCollection") {
    return geojson.features[0]?.geometry?.coordinates;
  }

  if (geojson.type === "Feature") {
    return geojson.geometry?.coordinates;
  }

  return geojson.coordinates;
}

export function rankFeaturesByPair(features) {
  const statsByPair = new Map();

  for (const feature of features) {
    const pairId = feature.properties.pair_id;
    const existing = statsByPair.get(pairId) ?? {
      count: 0,
      area: 0,
      feature
    };
    existing.count += 1;
    existing.area += Number(feature.properties.area_m2 ?? 0);
    statsByPair.set(pairId, existing);
  }

  return Array.from(statsByPair.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return right.area - left.area;
  });
}

export function findNearestSupportFeatures(cell, featureByCell, maxRadius) {
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    const supportCells = gridRing(cell, radius).filter((candidate) => featureByCell.has(candidate));
    if (supportCells.length) {
      return supportCells.map((candidate) => featureByCell.get(candidate));
    }
  }

  return [];
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

export async function writeJson(filePath, data, { pretty = false } = {}) {
  const content = pretty ? JSON.stringify(data, null, 2) + "\n" : JSON.stringify(data);
  await fs.writeFile(filePath, content, "utf-8");
}

export function toSortedFeatureCollection(featureByCell) {
  return {
    type: "FeatureCollection",
    features: Array.from(featureByCell.values()).sort((left, right) =>
      left.properties.h3_index.localeCompare(right.properties.h3_index)
    )
  };
}
