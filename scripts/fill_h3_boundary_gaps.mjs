#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cellToBoundary, gridRing, polygonToCells } from "h3-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
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

function closeRing(ring) {
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

function buildHexFeature(cell, properties) {
  const boundary = closeRing(cellToBoundary(cell, true));
  return {
    type: "Feature",
    properties: {
      ...properties,
      h3_index: cell,
      inferred_boundary_fill: true
    },
    geometry: {
      type: "Polygon",
      coordinates: [boundary]
    }
  };
}

function getPolygonCoordinates(geojson) {
  if (geojson.type === "FeatureCollection") {
    return geojson.features[0]?.geometry?.coordinates;
  }
  if (geojson.type === "Feature") {
    return geojson.geometry?.coordinates;
  }
  return geojson.coordinates;
}

function rankFeatures(features) {
  const stats = new Map();
  for (const feature of features) {
    const pairId = feature.properties.pair_id;
    const existing = stats.get(pairId) ?? {
      count: 0,
      area: 0,
      feature
    };
    existing.count += 1;
    existing.area += Number(feature.properties.area_m2 ?? 0);
    stats.set(pairId, existing);
  }

  return Array.from(stats.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return right.area - left.area;
  });
}

function findNearestSupport(cell, featureByCell, maxRadius) {
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    const supportCells = gridRing(cell, radius).filter((candidate) => featureByCell.has(candidate));
    if (supportCells.length) {
      return supportCells.map((candidate) => featureByCell.get(candidate));
    }
  }
  return [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input ? path.resolve(rootDir, args.input) : null;
  const boundaryPath = args.boundary ? path.resolve(rootDir, args.boundary) : null;
  const outputPath = args.output ? path.resolve(rootDir, args.output) : inputPath;
  const maxRadius = Number(args["max-radius"] ?? "6");

  if (!inputPath || !boundaryPath || !outputPath) {
    throw new Error("Usage: node scripts/fill_h3_boundary_gaps.mjs --input <geojson> --boundary <geojson> [--output <geojson>] [--max-radius <n>]");
  }

  const [rawData, rawBoundary] = await Promise.all([
    fs.readFile(inputPath, "utf-8"),
    fs.readFile(boundaryPath, "utf-8")
  ]);

  const collection = JSON.parse(rawData);
  const boundary = JSON.parse(rawBoundary);
  const polygonCoordinates = getPolygonCoordinates(boundary);
  const resolution = Number(collection.features[0]?.properties?.resolution ?? 9);
  const requiredCells = polygonToCells(polygonCoordinates, resolution, true);

  const featureByCell = new Map(collection.features.map((feature) => [feature.properties.h3_index, feature]));
  const filled = [];

  for (const cell of requiredCells) {
    if (featureByCell.has(cell)) {
      continue;
    }

    const supportFeatures = findNearestSupport(cell, featureByCell, maxRadius);
    if (!supportFeatures.length) {
      continue;
    }

    const ranked = rankFeatures(supportFeatures);
    const winner = ranked[0]?.feature;
    if (!winner) {
      continue;
    }

    const nextFeature = buildHexFeature(cell, winner.properties);
    featureByCell.set(cell, nextFeature);
    filled.push(nextFeature);
  }

  const nextCollection = {
    type: "FeatureCollection",
    features: Array.from(featureByCell.values()).sort((left, right) =>
      left.properties.h3_index.localeCompare(right.properties.h3_index)
    )
  };

  await fs.writeFile(outputPath, JSON.stringify(nextCollection), "utf-8");

  process.stdout.write(
    `${JSON.stringify(
      {
        input: path.relative(rootDir, inputPath),
        boundary: path.relative(rootDir, boundaryPath),
        output: path.relative(rootDir, outputPath),
        resolution,
        filled_boundary_cells: filled.length,
        max_radius: maxRadius
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
