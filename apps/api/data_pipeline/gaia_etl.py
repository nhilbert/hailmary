from __future__ import annotations

import argparse
import csv
import json
import math
import struct
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

# Approximate galactocentric offset constants (parsecs)
SUN_GALACTOCENTRIC_X_PC = -8_122.0
SUN_GALACTOCENTRIC_Z_PC = 20.8


@dataclass(slots=True)
class GaiaPoint:
    source_id: str
    ra_deg: float
    dec_deg: float
    parallax_mas: float
    parallax_error_mas: float
    phot_g_mean_mag: float
    bp_rp: float


@dataclass(slots=True)
class StarRecord:
    id: str
    ra_deg: float
    dec_deg: float
    distance_pc: float
    x_pc: float
    y_pc: float
    z_pc: float
    sigma_x_pc: float
    sigma_y_pc: float
    sigma_z_pc: float
    magnitude: float
    color_index: float


def _safe_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def read_gaia_csv(path: Path) -> list[GaiaPoint]:
    rows: list[GaiaPoint] = []
    with path.open("r", encoding="utf-8") as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            parallax = _safe_float(row.get("parallax"))
            if parallax <= 0:
                continue
            rows.append(
                GaiaPoint(
                    source_id=str(row.get("source_id", "")).strip(),
                    ra_deg=_safe_float(row.get("ra")),
                    dec_deg=_safe_float(row.get("dec")),
                    parallax_mas=parallax,
                    parallax_error_mas=max(_safe_float(row.get("parallax_error")), 1e-6),
                    phot_g_mean_mag=_safe_float(row.get("phot_g_mean_mag"), 99.0),
                    bp_rp=_safe_float(row.get("bp_rp")),
                )
            )
    return rows


def gaia_to_star_record(point: GaiaPoint) -> StarRecord:
    ra_rad = math.radians(point.ra_deg)
    dec_rad = math.radians(point.dec_deg)
    distance_pc = 1000.0 / point.parallax_mas

    x_helio = distance_pc * math.cos(dec_rad) * math.cos(ra_rad)
    y_helio = distance_pc * math.cos(dec_rad) * math.sin(ra_rad)
    z_helio = distance_pc * math.sin(dec_rad)

    x_gal = x_helio + SUN_GALACTOCENTRIC_X_PC
    y_gal = y_helio
    z_gal = z_helio + SUN_GALACTOCENTRIC_Z_PC

    frac_distance_error = point.parallax_error_mas / point.parallax_mas
    sigma_distance = distance_pc * frac_distance_error

    sigma_x = abs(x_helio / max(distance_pc, 1e-6)) * sigma_distance
    sigma_y = abs(y_helio / max(distance_pc, 1e-6)) * sigma_distance
    sigma_z = abs(z_helio / max(distance_pc, 1e-6)) * sigma_distance

    return StarRecord(
        id=point.source_id,
        ra_deg=point.ra_deg,
        dec_deg=point.dec_deg,
        distance_pc=distance_pc,
        x_pc=x_gal,
        y_pc=y_gal,
        z_pc=z_gal,
        sigma_x_pc=sigma_x,
        sigma_y_pc=sigma_y,
        sigma_z_pc=sigma_z,
        magnitude=point.phot_g_mean_mag,
        color_index=point.bp_rp,
    )


def write_star_index_json(records: Iterable[StarRecord], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [asdict(record) for record in records]
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _tile_key(record: StarRecord, lod: int, cube_extent_pc: float) -> tuple[int, int, int, int]:
    tiles_per_axis = 2**lod

    def axis_to_index(value: float) -> int:
        normalized = (value + cube_extent_pc) / (2 * cube_extent_pc)
        bucket = int(normalized * tiles_per_axis)
        return max(0, min(tiles_per_axis - 1, bucket))

    return lod, axis_to_index(record.x_pc), axis_to_index(record.y_pc), axis_to_index(record.z_pc)


def write_octree_tiles(
    records: Iterable[StarRecord],
    output_dir: Path,
    max_lod: int = 6,
    cube_extent_pc: float = 16_384.0,
) -> Path:
    tile_map: dict[tuple[int, int, int, int], list[StarRecord]] = defaultdict(list)
    records_list = list(records)
    for record in records_list:
        for lod in range(max_lod + 1):
            tile_map[_tile_key(record, lod, cube_extent_pc)].append(record)

    manifest: dict[str, dict[str, int | str]] = {}
    tiles_root = output_dir / "tiles"
    for (lod, x, y, z), stars in tile_map.items():
        tile_dir = tiles_root / str(lod) / str(x) / str(y)
        tile_dir.mkdir(parents=True, exist_ok=True)
        tile_file = tile_dir / f"{z}.bin"
        with tile_file.open("wb") as out:
            out.write(struct.pack("<I", len(stars)))
            for star in stars:
                packed = struct.pack(
                    "<Qfffffffff",
                    int(star.id),
                    star.x_pc,
                    star.y_pc,
                    star.z_pc,
                    star.sigma_x_pc,
                    star.sigma_y_pc,
                    star.sigma_z_pc,
                    star.magnitude,
                    star.color_index,
                    star.distance_pc,
                )
                out.write(packed)
        manifest[f"{lod}/{x}/{y}/{z}"] = {
            "path": str(tile_file.relative_to(output_dir)),
            "count": len(stars),
        }

    manifest_path = output_dir / "tiles_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest_path


def run_pipeline(input_csv: Path, output_dir: Path, max_lod: int) -> None:
    gaia_rows = read_gaia_csv(input_csv)
    records = [gaia_to_star_record(row) for row in gaia_rows]

    output_dir.mkdir(parents=True, exist_ok=True)
    write_star_index_json(records, output_dir / "star_index.json")
    write_octree_tiles(records, output_dir, max_lod=max_lod)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build Gaia DR3 star tiles and index")
    parser.add_argument("--input", type=Path, required=True, help="Path to Gaia DR3 CSV export")
    parser.add_argument("--output", type=Path, required=True, help="Output directory")
    parser.add_argument("--max-lod", type=int, default=6, help="Maximum LOD to generate")
    args = parser.parse_args()

    run_pipeline(args.input, args.output, args.max_lod)
