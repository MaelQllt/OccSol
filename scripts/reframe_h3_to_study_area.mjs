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
      inferred_study_fill: true
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

function findSupport(cell, featureByCell, maxRadius) {
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
  const areaPath = args.area ? path.resolve(rootDir, args.area) : null;
  const outputPath = args.output ? path.resolve(rootDir, args.output) : inputPath;
  const maxRadius = Number(args["max-radius"] ?? "12");

  if (!inputPath || !areaPath || !outputPath) {
    throw new Error("Usage: node scripts/reframe_h3_to_study_area.mjs --input <geojson> --area <geojson> [--output <geojson>] [--max-radius <n>]");
  }

  const [rawData, rawArea] = await Promise.all([
    fs.readFile(inputPath, "utf-8"),
    fs.readFile(areaPath, "utf-8")
  ]);

  const collection = JSON.parse(rawData);
  const area = JSON.parse(rawArea);
  const polygonCoordinates = getPolygonCoordinates(area);
  const resolution = Number(collection.features[0]?.properties?.resolution ?? 9);
  const targetCells = polygonToCells(polygonCoordinates, resolution, true);
  const sourceByCell = new Map(collection.features.map((feature) => [feature.properties.h3_index, feature]));
  const targetByCell = new Map();
  const inferred = [];

  for (const cell of targetCells) {
    const existing = sourceByCell.get(cell);
    if (existing) {
      targetByCell.set(cell, existing);
      continue;
    }

    const supportFeatures = findSupport(cell, targetByCell.size ? new Map([...sourceByCell, ...targetByCell]) : sourceByCell, maxRadius);
    if (!supportFeatures.length) {
      continue;
    }

    const ranked = rankFeatures(supportFeatures);
    const winner = ranked[0]?.feature;
    if (!winner) {
      continue;
    }

    const nextFeature = buildHexFeature(cell, winner.properties);
    targetByCell.set(cell, nextFeature);
    inferred.push(nextFeature);
  }

  const nextCollection = {
    type: "FeatureCollection",
    features: Array.from(targetByCell.values()).sort((left, right) =>
      left.properties.h3_index.localeCompare(right.properties.h3_index)
    )
  };

  await fs.writeFile(outputPath, JSON.stringify(nextCollection), "utf-8");

  process.stdout.write(
    `${JSON.stringify(
      {
        input: path.relative(rootDir, inputPath),
        area: path.relative(rootDir, areaPath),
        output: path.relative(rootDir, outputPath),
        resolution,
        target_hexagons: targetCells.length,
        written_hexagons: nextCollection.features.length,
        inferred_study_fill_count: inferred.length,
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
