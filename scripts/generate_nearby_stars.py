#!/usr/bin/env python3
"""
Generate the 1000 nearest stars JSON for the HailMary Navigator frontend.

Downloads the HYG v3 star catalogue, extracts the 1000 stars nearest to Sol
(excluding Sol itself), and writes a JSON file consumed statically by the
frontend as apps/web/src/features/galaxy/nearby-stars.json.

Usage
─────
  python scripts/generate_nearby_stars.py
  python scripts/generate_nearby_stars.py --local path/to/hyg_v38.csv.gz
  python scripts/generate_nearby_stars.py --count 500
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import sys
import urllib.request
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────

HYG_URL = (
    "https://raw.githubusercontent.com/astronexus/"
    "HYG-Database/main/hyg/v3/hyg_v38.csv.gz"
)

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = (
    REPO_ROOT / "apps" / "web" / "src" / "features" / "galaxy" / "nearby-stars.json"
)

PARSECS_PER_LY = 3.261563777

# ── Spectral descriptions ──────────────────────────────────────────────────

SPECTRAL_DESCRIPTIONS: dict[str, str] = {
    "O": "Rare hot blue giant — extremely luminous and short-lived.",
    "B": "Hot blue-white star, tens of times more massive than the Sun.",
    "A": "White main-sequence star, slightly hotter than the Sun.",
    "F": "Yellow-white star, slightly larger and hotter than the Sun.",
    "G": "Sun-like yellow star — a stable home for rocky planets.",
    "K": "Orange dwarf, cooler and longer-lived than the Sun.",
    "M": "Red dwarf — the most common type of star in the galaxy.",
    "D": "White dwarf: the dense remnant of an evolved Sun-like star.",
    "L": "Brown dwarf: too cool to sustain hydrogen fusion.",
    "T": "Methane brown dwarf, near the boundary with giant planets.",
    "W": "Wolf-Rayet star: massive, intensely hot, shedding material fast.",
    "C": "Carbon star: a red giant with a carbon-rich atmosphere.",
    "S": "S-type giant with zirconium oxide in its spectrum.",
}


def bv_to_spectral_class(bv: float) -> str:
    if bv < -0.30:
        return "O"
    if bv < 0.00:
        return "B"
    if bv < 0.25:
        return "A"
    if bv < 0.60:
        return "F"
    if bv < 1.00:
        return "G"
    if bv < 1.50:
        return "K"
    return "M"


def star_description(spect: str, ci_str: str, dist_ly: float) -> str:
    spec_class = spect[0].upper() if spect else ""
    if spec_class not in SPECTRAL_DESCRIPTIONS:
        try:
            spec_class = bv_to_spectral_class(float(ci_str)) if ci_str else "M"
        except ValueError:
            spec_class = "M"
    base = SPECTRAL_DESCRIPTIONS.get(spec_class, SPECTRAL_DESCRIPTIONS["M"])
    return f"{base} ({dist_ly:.1f} ly)"


# ── Name resolution ────────────────────────────────────────────────────────

def best_name(row: dict[str, str]) -> str:
    """Return the most human-readable name available for a HYG row."""
    if row.get("proper", "").strip():
        return row["proper"].strip()
    bf = row.get("bf", "").strip()
    if bf:
        return bf
    gl = row.get("gl", "").strip()
    if gl:
        return gl
    hd = row.get("hd", "").strip()
    if hd:
        return f"HD {hd}"
    hip = row.get("hip", "").strip()
    if hip:
        return f"HIP {hip}"
    return f"HYG {row.get('id', '?')}"


def star_id(row: dict[str, str]) -> str:
    hip = row.get("hip", "").strip()
    if hip:
        return f"hyg-hip-{hip}"
    hd = row.get("hd", "").strip()
    if hd:
        return f"hyg-hd-{hd}"
    return f"hyg-{row.get('id', '0')}"


# ── CSV processing ─────────────────────────────────────────────────────────

def process_csv(text: str, count: int) -> list[dict]:
    reader = csv.DictReader(io.StringIO(text))
    stars: list[dict] = []

    for row in reader:
        try:
            dist_pc = float(row["dist"])
            x_hyg   = float(row["x"])
            y_hyg   = float(row["y"])
            z_hyg   = float(row["z"])
            mag     = float(row["mag"])
        except (ValueError, KeyError):
            continue

        if dist_pc <= 0.001 or dist_pc > 1e6:
            continue  # skip Sol (dist ≈ 0) and invalid entries

        # Proper motion components [arcsec/yr] and radial velocity [km/s]
        try:
            pmra  = float(row["pmra"])   # proper motion in RA  [arcsec/yr]
            pmdec = float(row["pmdec"])  # proper motion in Dec [arcsec/yr]
        except (ValueError, KeyError):
            pmra = pmdec = 0.0
        try:
            rv_km_s = float(row["rv"])   # radial velocity [km/s]
        except (ValueError, KeyError):
            rv_km_s = 0.0

        # Convert proper motion to HYG Cartesian velocity [pc/yr].
        # v_transverse [pc/yr] = pm [arcsec/yr] * dist_pc / 206265
        # (206265 arcsec per radian)
        # The HYG x/y/z axes: x→RA=0, y→RA=90, z→north pole.
        # Approximation: decompose pmra (east) and pmdec (north) into x,y,z.
        # For small angles this is accurate enough for visualisation.
        import math as _math
        try:
            ra_rad  = _math.radians(float(row["ra"]))
            dec_rad = _math.radians(float(row["dec"]))
        except (ValueError, KeyError):
            ra_rad = dec_rad = 0.0

        # Unit vectors for east (pmra) and north (pmdec) at this position
        # east  = (-sin(ra), cos(ra), 0)
        # north = (-sin(dec)cos(ra), -sin(dec)sin(ra), cos(dec))
        ARCSEC_PER_RAD = 206_265.0
        KM_PER_S_TO_PC_PER_YR = 1.022e-6  # 1 km/s ≈ 1.022e-6 pc/yr

        pm_scale = dist_pc / ARCSEC_PER_RAD  # pc per arcsec at this distance

        e_x = -_math.sin(ra_rad)
        e_y =  _math.cos(ra_rad)
        e_z =  0.0

        n_x = -_math.sin(dec_rad) * _math.cos(ra_rad)
        n_y = -_math.sin(dec_rad) * _math.sin(ra_rad)
        n_z =  _math.cos(dec_rad)

        # Radial direction (away from Sol)
        r_x = _math.cos(dec_rad) * _math.cos(ra_rad)
        r_y = _math.cos(dec_rad) * _math.sin(ra_rad)
        r_z = _math.sin(dec_rad)

        vx_hyg = pmra * pm_scale * e_x + pmdec * pm_scale * n_x + rv_km_s * KM_PER_S_TO_PC_PER_YR * r_x
        vy_hyg = pmra * pm_scale * e_y + pmdec * pm_scale * n_y + rv_km_s * KM_PER_S_TO_PC_PER_YR * r_y
        vz_hyg = pmra * pm_scale * e_z + pmdec * pm_scale * n_z + rv_km_s * KM_PER_S_TO_PC_PER_YR * r_z

        stars.append({
            "dist_pc": dist_pc,
            "x_hyg":   x_hyg,
            "y_hyg":   y_hyg,
            "z_hyg":   z_hyg,
            "vx_hyg":  vx_hyg,
            "vy_hyg":  vy_hyg,
            "vz_hyg":  vz_hyg,
            "mag":     mag,
            "spect":   row.get("spect", ""),
            "ci":      row.get("ci", ""),
            "con":     row.get("con", "").strip(),
            "proper":  row.get("proper", ""),
            "bf":      row.get("bf", ""),
            "gl":      row.get("gl", ""),
            "hd":      row.get("hd", ""),
            "hip":     row.get("hip", ""),
            "id":      row.get("id", ""),
        })

    stars.sort(key=lambda s: s["dist_pc"])
    return stars[:count]


def to_galaxy_star(s: dict) -> dict:
    dist_ly = s["dist_pc"] * PARSECS_PER_LY
    # HYG equatorial Cartesian → Babylon.js (Y-up, left-handed)
    # Babylon X = HYG x,  Y = HYG z,  Z = -HYG y
    # Same mapping applies to velocity components.
    return {
        "id":                 star_id(s),
        "name":               best_name(s),
        "constellation":      s["con"] or "—",
        "magnitude":          round(s["mag"], 2),
        "distanceLightYears": round(dist_ly, 2),
        "posX":               round(s["x_hyg"],   3),
        "posY":               round(s["z_hyg"],   3),
        "posZ":               round(-s["y_hyg"],  3),
        "pmX":                round(s.get("vx_hyg", 0.0),  8),
        "pmY":                round(s.get("vz_hyg", 0.0),  8),
        "pmZ":                round(-s.get("vy_hyg", 0.0), 8),
        "description":        star_description(s["spect"], s["ci"], dist_ly),
    }


# ── Entrypoint ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate nearby-stars.json for HailMary Navigator"
    )
    parser.add_argument(
        "--local", metavar="CSV_PATH",
        help="Use a local HYG CSV/gz instead of downloading",
    )
    parser.add_argument(
        "--count", type=int, default=1000,
        help="Number of nearest stars to include (default 1000)",
    )
    args = parser.parse_args()

    # ── Acquire CSV ──────────────────────────────────────────────────────
    if args.local:
        path = Path(args.local)
        if not path.exists():
            print(f"Error: file not found: {path}", file=sys.stderr)
            sys.exit(1)
        print(f"Reading local file: {path}")
        raw = path.read_bytes()
        csv_text = (gzip.decompress(raw) if path.suffix == ".gz" else raw).decode("utf-8")
    else:
        print(f"Downloading HYG v3 from:\n  {HYG_URL}")
        print("(~10 MB — this may take a moment)")
        try:
            req = urllib.request.Request(HYG_URL, headers={"User-Agent": "HailMary/1.0"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
            csv_text = gzip.decompress(raw).decode("utf-8")
        except Exception as exc:
            print(f"\nDownload failed: {exc}", file=sys.stderr)
            print(
                "\nAlternative: download hyg_v38.csv.gz manually from\n"
                "  https://github.com/astronexus/HYG-Database/tree/main/hyg/v3\n"
                "then run:\n"
                "  python scripts/generate_nearby_stars.py --local hyg_v38.csv.gz",
                file=sys.stderr,
            )
            sys.exit(1)

    # ── Process ──────────────────────────────────────────────────────────
    print(f"Processing (nearest {args.count} stars) …")
    raw_stars = process_csv(csv_text, args.count)
    output = [to_galaxy_star(s) for s in raw_stars]

    # ── Write ─────────────────────────────────────────────────────────────
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Written: {OUT_PATH.relative_to(REPO_ROOT)}")
    print(f"Stars:   {len(output)}")
    if output:
        farthest = max(output, key=lambda s: s["distanceLightYears"])
        print(f"Farthest: {farthest['name']} at {farthest['distanceLightYears']:.1f} ly")
    print("\nRestart the dev server — the frontend picks up nearby-stars.json automatically.")


if __name__ == "__main__":
    main()
