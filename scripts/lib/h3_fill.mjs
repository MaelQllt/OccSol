import { cellToBoundary, cellToLatLng, gridDisk } from "h3-js";

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

export function buildHexFeature(cell, properties, { inferredFill = false } = {}) {
  const boundary = closeRing(cellToBoundary(cell, true));
  return {
    type: "Feature",
    properties: {
      ...properties,
      h3_index: cell,
      ...(inferredFill ? { inferred_fill: true } : {})
    },
    geometry: {
      type: "Polygon",
      coordinates: [boundary]
    }
  };
}

function computeCoordinateBounds(coordinates, bounds = {
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
    computeCoordinateBounds(entry, bounds);
  }

  return bounds;
}

function pointInRing([lng, lat], ring) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [currentLng, currentLat] = ring[index];
    const [previousLng, previousLat] = ring[previous];
    const intersects =
      currentLat > lat !== previousLat > lat &&
      lng < ((previousLng - currentLng) * (lat - currentLat)) / ((previousLat - currentLat) || Number.EPSILON) + currentLng;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(point, polygonCoordinates) {
  const [outerRing, ...holes] = polygonCoordinates;
  if (!pointInRing(point, outerRing)) {
    return false;
  }

  for (const hole of holes) {
    if (pointInRing(point, hole)) {
      return false;
    }
  }

  return true;
}

export function buildMaskIndex(maskCollection) {
  return maskCollection.features.map((feature) => ({
    geometry: feature.geometry,
    bounds: computeCoordinateBounds(feature.geometry.coordinates)
  }));
}

export function pointInMask(point, maskIndex) {
  for (const entry of maskIndex) {
    if (
      point[0] < entry.bounds.minLng ||
      point[0] > entry.bounds.maxLng ||
      point[1] < entry.bounds.minLat ||
      point[1] > entry.bounds.maxLat
    ) {
      continue;
    }

    if (entry.geometry.type === "Polygon" && pointInPolygon(point, entry.geometry.coordinates)) {
      return true;
    }

    if (entry.geometry.type === "MultiPolygon") {
      for (const polygon of entry.geometry.coordinates) {
        if (pointInPolygon(point, polygon)) {
          return true;
        }
      }
    }
  }

  return false;
}

function getNeighborCells(cell, radius) {
  return gridDisk(cell, radius).filter((neighbor) => neighbor !== cell);
}

function collectPairStats(neighborFeatures, weight) {
  const pairStats = new Map();
  for (const feature of neighborFeatures) {
    const pairId = feature.properties.pair_id;
    const existing = pairStats.get(pairId) ?? {
      primaryCount: 0,
      secondaryCount: 0,
      area: 0,
      feature
    };

    if (weight === "primary") {
      existing.primaryCount += 1;
    } else {
      existing.secondaryCount += 1;
    }
    existing.area += Number(feature.properties.area_m2 ?? 0);
    pairStats.set(pairId, existing);
  }

  return pairStats;
}

function mergePairStats(...maps) {
  const merged = new Map();
  for (const source of maps) {
    for (const [pairId, value] of source.entries()) {
      const existing = merged.get(pairId) ?? {
        primaryCount: 0,
        secondaryCount: 0,
        area: 0,
        feature: value.feature
      };
      existing.primaryCount += value.primaryCount;
      existing.secondaryCount += value.secondaryCount;
      existing.area += value.area;
      merged.set(pairId, existing);
    }
  }

  return merged;
}

function rankPairs(pairStats) {
  return Array.from(pairStats.values()).sort((left, right) => {
    if (right.primaryCount !== left.primaryCount) {
      return right.primaryCount - left.primaryCount;
    }
    if (right.secondaryCount !== left.secondaryCount) {
      return right.secondaryCount - left.secondaryCount;
    }
    if (right.area !== left.area) {
      return right.area - left.area;
    }
    return String(left.feature.properties.pair_id).localeCompare(String(right.feature.properties.pair_id));
  });
}

function scoreCandidate(candidate, featureByCell) {
  const ringOneCells = getNeighborCells(candidate, 1);
  const ringOneSet = new Set(ringOneCells);
  const ringTwoCells = getNeighborCells(candidate, 2).filter((cell) => !ringOneSet.has(cell));

  const ringOneFeatures = ringOneCells
    .filter((cell) => featureByCell.has(cell))
    .map((cell) => featureByCell.get(cell));
  const ringTwoFeatures = ringTwoCells
    .filter((cell) => featureByCell.has(cell))
    .map((cell) => featureByCell.get(cell));

  const rankedPairs = rankPairs(
    mergePairStats(collectPairStats(ringOneFeatures, "primary"), collectPairStats(ringTwoFeatures, "secondary"))
  );

  return {
    ringOneCount: ringOneFeatures.length,
    ringTwoCount: ringTwoFeatures.length,
    rankedPairs
  };
}

function shouldFillSparseCandidate(rankedPairs, ringOneCount) {
  if (!rankedPairs.length || ringOneCount <= 0) {
    return false;
  }

  const top = rankedPairs[0];
  const second = rankedPairs[1] ?? null;
  const secondPrimary = second?.primaryCount ?? 0;
  const secondSecondary = second?.secondaryCount ?? 0;

  if (ringOneCount >= 3) {
    return true;
  }

  if (ringOneCount === 2) {
    if (top.primaryCount === 2) {
      return true;
    }
    if (top.primaryCount > secondPrimary) {
      return true;
    }
    if (top.primaryCount === secondPrimary && top.secondaryCount >= secondSecondary + 1) {
      return true;
    }
    return top.primaryCount === secondPrimary && top.secondaryCount === secondSecondary && top.area >= (second?.area ?? 0) * 1.5;
  }

  if (second === null) {
    return top.primaryCount === 1 && top.secondaryCount >= 2;
  }

  return top.primaryCount === 1 && top.secondaryCount >= 2 && top.secondaryCount >= secondSecondary + 2;
}

function collectCandidateCells(featureByCell) {
  const candidates = new Set();
  for (const cell of featureByCell.keys()) {
    for (const neighbor of getNeighborCells(cell, 1)) {
      if (!featureByCell.has(neighbor)) {
        candidates.add(neighbor);
      }
    }
  }
  return candidates;
}

export function fillFeatureCollectionHoles(collection, {
  minNeighbors = 4,
  maxPasses = 6,
  maskCollection = null
} = {}) {
  const featureByCell = new Map(collection.features.map((feature) => [feature.properties.h3_index, feature]));
  const filled = [];
  const passSummaries = [];
  const maskIndex = maskCollection ? buildMaskIndex(maskCollection) : null;
  const maskCache = new Map();

  for (let pass = 1; pass <= maxPasses; pass += 1) {
    const candidates = collectCandidateCells(featureByCell);
    const newlyFilled = [];

    for (const candidate of candidates) {
      if (maskIndex) {
        const isInsideMask = maskCache.get(candidate) ?? pointInMask(
          (() => {
            const [lat, lng] = cellToLatLng(candidate);
            return [lng, lat];
          })(),
          maskIndex
        );
        maskCache.set(candidate, isInsideMask);
        if (!isInsideMask) {
          continue;
        }
      }

      const { ringOneCount, ringTwoCount, rankedPairs } = scoreCandidate(candidate, featureByCell);
      if (ringOneCount < minNeighbors || !rankedPairs.length) {
        continue;
      }

      const winner = rankedPairs[0].feature;
      const filledFeature = buildHexFeature(candidate, winner.properties, { inferredFill: true });
      featureByCell.set(candidate, filledFeature);
      newlyFilled.push({
        cell: candidate,
        ringOneCount,
        ringTwoCount,
        pairId: winner.properties.pair_id
      });
      filled.push(filledFeature);
    }

    passSummaries.push({
      pass,
      candidates: candidates.size,
      filled: newlyFilled.length
    });

    if (!newlyFilled.length) {
      break;
    }
  }

  if (maskIndex) {
    for (let pass = 1; pass <= maxPasses; pass += 1) {
      const candidates = collectCandidateCells(featureByCell);
      const newlyFilled = [];

      for (const candidate of candidates) {
        const isInsideMask = maskCache.get(candidate) ?? pointInMask(
          (() => {
            const [lat, lng] = cellToLatLng(candidate);
            return [lng, lat];
          })(),
          maskIndex
        );
        maskCache.set(candidate, isInsideMask);
        if (!isInsideMask) {
          continue;
        }

        const { ringOneCount, ringTwoCount, rankedPairs } = scoreCandidate(candidate, featureByCell);
        if (!shouldFillSparseCandidate(rankedPairs, ringOneCount)) {
          continue;
        }

        const winner = rankedPairs[0].feature;
        const filledFeature = buildHexFeature(candidate, winner.properties, { inferredFill: true });
        featureByCell.set(candidate, filledFeature);
        newlyFilled.push({
          cell: candidate,
          ringOneCount,
          ringTwoCount,
          pairId: winner.properties.pair_id
        });
        filled.push(filledFeature);
      }

      passSummaries.push({
        pass: `sparse-${pass}`,
        candidates: candidates.size,
        filled: newlyFilled.length
      });

      if (!newlyFilled.length) {
        break;
      }
    }
  }

  return {
    collection: {
      type: "FeatureCollection",
      features: Array.from(featureByCell.values()).sort((left, right) =>
        left.properties.h3_index.localeCompare(right.properties.h3_index)
      )
    },
    filledCount: filled.length,
    passSummaries
  };
}
