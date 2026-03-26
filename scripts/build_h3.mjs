#!/usr/bin/env node

import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { polygonToCells } from "h3-js";
import { buildHexFeature, fillFeatureCollectionHoles } from "./lib/h3_fill.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");
const pythonBin = process.env.OCSGE_PYTHON ?? "/Users/maelquillat/anaconda3/bin/python3";
const conflictResolverPath = path.join(__dirname, "resolve_h3_conflicts.py");

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

function geometryToCellSet(geometry, resolution) {
  const cells = new Set();
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    const indexes = polygonToCells(polygon, resolution, true);
    for (const cell of indexes) {
      cells.add(cell);
    }
  }
  return cells;
}

function resolveConflictCells(payload) {
  if (!payload.conflicts.length) {
    return new Map();
  }

  const result = spawnSync(
    pythonBin,
    [conflictResolverPath],
    {
      cwd: rootDir,
      input: JSON.stringify(payload),
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 128
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || `Conflict resolver failed with status ${result.status}`);
  }

  const parsed = JSON.parse(result.stdout);
  return new Map(
    (parsed.resolved ?? []).map((entry) => [
      entry.cell,
      {
        sourceId: entry.source_id,
        overlapAreaM2: entry.overlap_area_m2
      }
    ])
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input ? path.resolve(rootDir, args.input) : null;
  const outputPath = args.output ? path.resolve(rootDir, args.output) : null;
  const summaryPath = args.summary ? path.resolve(rootDir, args.summary) : null;
  const maskPath = args.mask ? path.resolve(rootDir, args.mask) : null;
  const scope = args.scope ?? "unknown";
  const resolution = Number(args.resolution ?? "9");
  const fillMinNeighbors = Number(args["fill-min-neighbors"] ?? "3");
  const fillMaxPasses = Number(args["fill-max-passes"] ?? "6");

  if (!inputPath || !outputPath) {
    throw new Error("Usage: node scripts/build_h3.mjs --input <geojson> --output <geojson> --scope <name> --resolution <n>");
  }

  const cellCandidates = new Map();
  const sourceRecords = [];
  let sourcePolygons = 0;
  let collisions = 0;
  let conflictCells = 0;
  let sourceFeatureCount = 0;

  async function processFeature(feature) {
    const geometry = feature.geometry;
    if (!geometry) {
      return;
    }
    sourceFeatureCount += 1;
    sourcePolygons += geometry.type === "Polygon" ? 1 : geometry.coordinates.length;
    const properties = {
      scope,
      resolution,
      source_year: feature.properties.millesime,
      pair_id: feature.properties.pair_id,
      code_cs: feature.properties.code_cs,
      label_cs: feature.properties.label_cs,
      color_cs: feature.properties.color_cs,
      code_us: feature.properties.code_us,
      label_us: feature.properties.label_us,
      color_us: feature.properties.color_us,
      source_feature_count: feature.properties.source_feature_count,
      area_m2: feature.properties.area_m2,
      surface_ha: feature.properties.surface_ha
    };
    const sourceId = sourceRecords.length;
    sourceRecords.push({
      id: sourceId,
      geometry,
      properties
    });

    const cells = geometryToCellSet(geometry, resolution);
    for (const cell of cells) {
      const entry = cellCandidates.get(cell) ?? {
        candidateIds: [],
        pairIds: new Set()
      };

      if (!entry.pairIds.has(properties.pair_id)) {
        if (entry.candidateIds.length > 0) {
          collisions += 1;
        }
        entry.candidateIds.push(sourceId);
        entry.pairIds.add(properties.pair_id);
        cellCandidates.set(cell, entry);
      }
    }
  }

  if (inputPath.endsWith(".geojsonl")) {
    const reader = readline.createInterface({
      input: createReadStream(inputPath, { encoding: "utf-8" }),
      crlfDelay: Infinity
    });
    for await (const line of reader) {
      if (!line.trim()) {
        continue;
      }
      await processFeature(JSON.parse(line));
    }
  } else {
    const raw = await fs.readFile(inputPath, "utf-8");
    const collection = JSON.parse(raw);
    for (const feature of collection.features) {
      await processFeature(feature);
    }
  }

  const conflictPayload = {
    sources: sourceRecords.map(({ id, geometry, properties }) => ({
      id,
      geometry,
      pair_id: properties.pair_id,
      area_m2: properties.area_m2
    })),
    conflicts: []
  };
  const resolvedCellMap = new Map();

  for (const [cell, entry] of cellCandidates.entries()) {
    if (entry.candidateIds.length === 1) {
      resolvedCellMap.set(cell, sourceRecords[entry.candidateIds[0]].properties);
      continue;
    }

    conflictCells += 1;
    conflictPayload.conflicts.push({
      cell,
      geometry: buildHexFeature(cell, {}).geometry,
      candidate_ids: entry.candidateIds
    });
  }

  const resolvedConflicts = resolveConflictCells(conflictPayload);
  for (const [cell, entry] of resolvedConflicts.entries()) {
    const sourceRecord = sourceRecords[entry.sourceId];
    if (sourceRecord) {
      resolvedCellMap.set(cell, sourceRecord.properties);
    }
  }

  for (const conflict of conflictPayload.conflicts) {
    if (!resolvedCellMap.has(conflict.cell)) {
      const fallbackSource = sourceRecords[conflict.candidate_ids[0]];
      if (fallbackSource) {
        resolvedCellMap.set(conflict.cell, fallbackSource.properties);
      }
    }
  }

  const rawOutput = {
    type: "FeatureCollection",
    features: Array.from(resolvedCellMap.entries()).map(([cell, properties]) => buildHexFeature(cell, properties))
  };
  const maskCollection = maskPath ? JSON.parse(await fs.readFile(maskPath, "utf-8")) : null;
  const { collection: output, filledCount, passSummaries } = fillFeatureCollectionHoles(rawOutput, {
    minNeighbors: fillMinNeighbors,
    maxPasses: fillMaxPasses,
    maskCollection
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(output), "utf-8");

  const summary = {
    scope,
    resolution,
    input: path.relative(rootDir, inputPath),
    output: path.relative(rootDir, outputPath),
    source_feature_count: sourceFeatureCount,
    source_polygon_count: sourcePolygons,
    hexagon_count: output.features.length,
    collisions,
    conflict_cells: conflictCells,
    conflict_resolution: "max_intersection_area",
    inferred_fill_count: filledCount,
    fill_min_neighbors: fillMinNeighbors,
    fill_max_passes: fillMaxPasses,
    fill_mask: maskPath ? path.relative(rootDir, maskPath) : null,
    fill_passes: passSummaries
  };

  const targetSummaryPath =
    summaryPath ?? path.join(docsDir, `${path.basename(outputPath, path.extname(outputPath))}_summary.json`);
  await fs.writeFile(targetSummaryPath, JSON.stringify(summary, null, 2) + "\n", "utf-8");

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
