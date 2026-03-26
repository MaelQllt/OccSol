#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const ORIGIN_LNG = -180;
const ORIGIN_LAT = -90;

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

function getChunkStep(resolution) {
  const numericResolution = Number(resolution);
  return Math.max(0.04, 0.18 / (1.5 ** Math.max(0, numericResolution - 7)));
}

function computeBounds(coordinates, bounds = {
  minLng: Infinity,
  minLat: Infinity,
  maxLng: -Infinity,
  maxLat: -Infinity
}) {
  if (!Array.isArray(coordinates[0])) {
    const [lng, lat] = coordinates;
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
    return bounds;
  }

  for (const entry of coordinates) {
    computeBounds(entry, bounds);
  }

  return bounds;
}

function getFeatureBounds(feature) {
  return computeBounds(feature.geometry.coordinates);
}

function getTileIndex(value, origin, step) {
  return Math.floor((value - origin) / step);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input ? path.resolve(rootDir, args.input) : null;
  const outputDir = args["out-dir"] ? path.resolve(rootDir, args["out-dir"]) : null;
  const resolution = Number(args.resolution ?? "8");
  const step = Number(args.step ?? getChunkStep(resolution));

  if (!inputPath || !outputDir) {
    throw new Error("Usage: node scripts/chunk_h3_dataset.mjs --input <geojson> --out-dir <dir> --resolution <n> [--step <degrees>]");
  }

  const raw = await fs.readFile(inputPath, "utf-8");
  const collection = JSON.parse(raw);
  const chunks = new Map();

  for (const feature of collection.features) {
    const bounds = getFeatureBounds(feature);
    const minX = getTileIndex(bounds.minLng, ORIGIN_LNG, step);
    const maxX = getTileIndex(bounds.maxLng, ORIGIN_LNG, step);
    const minY = getTileIndex(bounds.minLat, ORIGIN_LAT, step);
    const maxY = getTileIndex(bounds.maxLat, ORIGIN_LAT, step);

    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      for (let tileY = minY; tileY <= maxY; tileY += 1) {
        const chunkId = `${tileX}_${tileY}`;
        const chunk = chunks.get(chunkId) ?? {
          id: chunkId,
          tileX,
          tileY,
          bbox: {
            west: ORIGIN_LNG + tileX * step,
            south: ORIGIN_LAT + tileY * step,
            east: ORIGIN_LNG + (tileX + 1) * step,
            north: ORIGIN_LAT + (tileY + 1) * step
          },
          features: []
        };
        chunk.features.push(feature);
        chunks.set(chunkId, chunk);
      }
    }
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const manifest = {
    input: path.relative(rootDir, inputPath),
    resolution,
    step,
    origin: {
      lng: ORIGIN_LNG,
      lat: ORIGIN_LAT
    },
    chunk_count: chunks.size,
    chunks: []
  };

  for (const chunk of Array.from(chunks.values()).sort((left, right) => left.id.localeCompare(right.id))) {
    const fileName = `${chunk.id}.geojson`;
    await fs.writeFile(
      path.join(outputDir, fileName),
      JSON.stringify({
        type: "FeatureCollection",
        features: chunk.features
      }),
      "utf-8"
    );

    manifest.chunks.push({
      id: chunk.id,
      tile_x: chunk.tileX,
      tile_y: chunk.tileY,
      feature_count: chunk.features.length,
      bbox: chunk.bbox,
      path: fileName
    });
  }

  await fs.writeFile(path.join(outputDir, "index.json"), JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  process.stdout.write(`${JSON.stringify({
    input: path.relative(rootDir, inputPath),
    output_dir: path.relative(rootDir, outputDir),
    resolution,
    step,
    chunk_count: manifest.chunk_count
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
