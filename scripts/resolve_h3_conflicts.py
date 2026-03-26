#!/Users/maelquillat/anaconda3/bin/python3

import json
import sys

from pyproj import Transformer
from shapely.geometry import shape
from shapely.validation import make_valid
from shapely.ops import transform


TO_LAMB93 = Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True).transform


def project_geometry(geometry):
    projected = transform(TO_LAMB93, shape(geometry))
    if not projected.is_valid:
        projected = make_valid(projected)
    return projected


def main() -> None:
    payload = json.load(sys.stdin)

    projected_sources = {}
    source_meta = {}
    for source in payload.get("sources", []):
      source_id = source["id"]
      projected_sources[source_id] = project_geometry(source["geometry"])
      source_meta[source_id] = {
          "pair_id": source.get("pair_id"),
          "area_m2": float(source.get("area_m2") or 0),
      }

    resolved = []
    for conflict in payload.get("conflicts", []):
        cell_geom = project_geometry(conflict["geometry"])
        best = None

        for source_id in conflict.get("candidate_ids", []):
            source_geom = projected_sources[source_id]
            overlap_area = source_geom.intersection(cell_geom).area
            candidate = {
                "source_id": source_id,
                "overlap_area_m2": overlap_area,
                "area_m2": source_meta[source_id]["area_m2"],
                "pair_id": str(source_meta[source_id]["pair_id"]),
            }

            if best is None:
                best = candidate
                continue

            if candidate["overlap_area_m2"] > best["overlap_area_m2"]:
                best = candidate
                continue

            if candidate["overlap_area_m2"] == best["overlap_area_m2"]:
                if candidate["area_m2"] > best["area_m2"]:
                    best = candidate
                    continue
                if candidate["area_m2"] == best["area_m2"] and candidate["pair_id"] < best["pair_id"]:
                    best = candidate

        if best is None:
            continue

        resolved.append({
            "cell": conflict["cell"],
            "source_id": best["source_id"],
            "overlap_area_m2": round(best["overlap_area_m2"], 4),
        })

    json.dump({"resolved": resolved}, sys.stdout)


if __name__ == "__main__":
    main()
