#!/usr/bin/env python3

import argparse
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd
from pyproj import Transformer
from shapely.geometry import box
from shapely.ops import transform


ROOT = Path(__file__).resolve().parent.parent
RAW_ROOT = ROOT / "data" / "raw"
INPUT_GPKG = RAW_ROOT / "OCS-GE_2-0__GPKG_LAMB93_D089_2023-01-01" / "OCS-GE" / "1_DONNEES_LIVRAISON_2025-07-00055" / "OCSGE_2-0_GPKG_LAMB93_D89-2023" / "OCCUPATION_SOL.gpkg"
NOMENCLATURE_CSV = RAW_ROOT / "OCS-GE_2-0__GPKG_LAMB93_D089_2023-01-01" / "OCS-GE" / "3_SUPPLEMENTS_LIVRAISON_2025-07-00055" / "NomenclatureOCSGE.csv"
INTERMEDIATE_DIR = ROOT / "data" / "intermediate"
DOCS_DIR = ROOT / "docs"
TARGET_CRS = "EPSG:4326"
SOURCE_CRS = "EPSG:2154"
JOIGNY_BBOX_WGS84 = (3.30, 47.92, 3.52, 48.05)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def load_nomenclature() -> dict[str, dict[str, str]]:
    df = pd.read_csv(NOMENCLATURE_CSV, sep=";", encoding="utf-8")
    return {
        row["CODE"]: {
            "label": row["LIBELLE"],
            "color": rgb_to_hex(int(row["R"]), int(row["V"]), int(row["B"])),
        }
        for _, row in df.iterrows()
    }


def get_scope_config(scope: str) -> dict[str, object]:
    if scope == "joigny":
        return {
            "bbox_wgs84": JOIGNY_BBOX_WGS84,
            "output": INTERMEDIATE_DIR / "joigny_ocs_pair.geojson",
            "metadata": DOCS_DIR / "joigny_summary.json",
            "simplify_tolerance": None,
            "format": "geojson",
        }
    if scope == "yonne":
        return {
            "bbox_wgs84": None,
            "output": INTERMEDIATE_DIR / "yonne_ocs_pair.geojsonl",
            "metadata": DOCS_DIR / "yonne_summary.json",
            "simplify_tolerance": None,
            "format": "geojsonl",
        }
    raise ValueError(f"Unsupported scope: {scope}")


def build_source_bbox(bbox_wgs84: tuple[float, float, float, float] | None):
    if bbox_wgs84 is None:
        return None, None

    to_source = Transformer.from_crs(TARGET_CRS, SOURCE_CRS, always_xy=True).transform
    bbox_source = transform(to_source, box(*bbox_wgs84))
    return bbox_source.bounds, bbox_source


def enrich_labels(gdf: gpd.GeoDataFrame, nomenclature: dict[str, dict[str, str]]) -> gpd.GeoDataFrame:
    gdf["label_cs"] = gdf["code_cs"].map(lambda code: nomenclature.get(code, {}).get("label", code))
    gdf["label_us"] = gdf["code_us"].map(lambda code: nomenclature.get(code, {}).get("label", code))
    gdf["color_cs"] = gdf["code_cs"].map(lambda code: nomenclature.get(code, {}).get("color", "#888888"))
    gdf["color_us"] = gdf["code_us"].map(lambda code: nomenclature.get(code, {}).get("color", "#888888"))
    return gdf


def load_scope_features(scope: str, limit: int | None = None) -> tuple[gpd.GeoDataFrame, dict[str, object]]:
    config = get_scope_config(scope)
    bbox_bounds, bbox_shape = build_source_bbox(config["bbox_wgs84"])

    read_kwargs = {
        "bbox": bbox_bounds,
        "columns": ["id", "code_cs", "code_us", "millesime", "source", "ossature", "id_origine", "code_or"],
    }
    if limit is not None:
        read_kwargs["rows"] = limit

    gdf = gpd.read_file(INPUT_GPKG, engine="pyogrio", **read_kwargs)
    if bbox_shape is not None:
        gdf = gdf.clip(bbox_shape)

    gdf = gdf[gdf.geometry.notnull() & ~gdf.geometry.is_empty].copy()
    gdf["area_m2"] = gdf.geometry.area
    gdf["source_feature_count"] = 1

    dissolved = gdf.dissolve(
        by=["code_cs", "code_us"],
        aggfunc={
            "millesime": "first",
            "source": "first",
            "ossature": "max",
            "area_m2": "sum",
            "source_feature_count": "sum",
        },
        as_index=False,
    )

    simplify_tolerance = config["simplify_tolerance"]
    if simplify_tolerance is not None:
        dissolved.geometry = dissolved.geometry.simplify(simplify_tolerance, preserve_topology=True)

    dissolved = dissolved.to_crs(TARGET_CRS)

    nomenclature = load_nomenclature()
    dissolved = enrich_labels(dissolved, nomenclature)
    dissolved["pair_id"] = dissolved["code_cs"] + "|" + dissolved["code_us"]
    dissolved["scope"] = scope
    dissolved["surface_ha"] = (dissolved["area_m2"] / 10000).round(2)
    dissolved["area_m2"] = dissolved["area_m2"].round(2)

    keep_columns = [
        "pair_id",
        "scope",
        "millesime",
        "source",
        "ossature",
        "source_feature_count",
        "area_m2",
        "surface_ha",
        "code_cs",
        "label_cs",
        "color_cs",
        "code_us",
        "label_us",
        "color_us",
        "geometry",
    ]
    dissolved = dissolved[keep_columns]

    metadata = {
        "scope": scope,
        "source_gpkg": str(INPUT_GPKG.relative_to(ROOT)),
        "target_crs": TARGET_CRS,
        "source_crs": SOURCE_CRS,
        "bbox_wgs84": config["bbox_wgs84"],
        "source_feature_count": int(len(gdf)),
        "dissolved_feature_count": int(len(dissolved)),
        "coverage_codes": sorted(dissolved["code_cs"].unique().tolist()),
        "usage_codes": sorted(dissolved["code_us"].unique().tolist()),
    }
    return dissolved, metadata


def write_geojsonl(gdf: gpd.GeoDataFrame, output_path: Path) -> None:
    with output_path.open("w", encoding="utf-8") as handle:
        for feature in gdf.iterfeatures(drop_id=True):
            handle.write(json.dumps(feature, ensure_ascii=False))
            handle.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract OCS GE 2023 Yonne and prepare dissolved GeoJSON.")
    parser.add_argument("--scope", choices=["joigny", "yonne"], required=True)
    parser.add_argument("--limit", type=int, default=None, help="Optional read limit for debugging.")
    args = parser.parse_args()

    INTERMEDIATE_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    if not INPUT_GPKG.exists():
        raise FileNotFoundError(f"Missing input GeoPackage: {INPUT_GPKG}")

    gdf, metadata = load_scope_features(args.scope, args.limit)
    config = get_scope_config(args.scope)
    if config["format"] == "geojsonl":
        write_geojsonl(gdf, config["output"])
    else:
        gdf.to_file(config["output"], driver="GeoJSON")
    config["metadata"].write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {config['output']}")
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
