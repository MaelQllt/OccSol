#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fillFeatureCollectionHoles } from "./lib/h3_fill.mjs";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input ? path.resolve(rootDir, args.input) : null;
  const outputPath = args.output ? path.resolve(rootDir, args.output) : inputPath;
  const minNeighbors = Number(args["min-neighbors"] ?? "6");
  const maxPasses = Number(args["max-passes"] ?? "6");
  const maskPath = args.mask ? path.resolve(rootDir, args.mask) : null;

  if (!inputPath || !outputPath) {
    throw new Error("Usage: node scripts/fill_h3_holes.mjs --input <geojson> [--output <geojson>] [--min-neighbors <n>] [--max-passes <n>] [--mask <geojson>]");
  }

  const raw = await fs.readFile(inputPath, "utf-8");
  const collection = JSON.parse(raw);
  const maskCollection = maskPath ? JSON.parse(await fs.readFile(maskPath, "utf-8")) : null;
  const { collection: nextCollection, filledCount, passSummaries } = fillFeatureCollectionHoles(collection, {
    minNeighbors,
    maxPasses,
    maskCollection
  });

  await fs.writeFile(outputPath, JSON.stringify(nextCollection), "utf-8");

  process.stdout.write(
    `${JSON.stringify(
      {
        input: path.relative(rootDir, inputPath),
        output: path.relative(rootDir, outputPath),
        filled_holes: filledCount,
        min_neighbors: minNeighbors,
        max_passes: maxPasses,
        mask: maskPath ? path.relative(rootDir, maskPath) : null,
        passes: passSummaries
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
