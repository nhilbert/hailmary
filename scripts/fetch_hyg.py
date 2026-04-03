#!/usr/bin/env python3
"""
Download the HYG v3 star catalogue and convert it to a compact binary
for the HailMary Navigator frontend.

Output: apps/web/public/stars.bin

Binary format
─────────────
  4 bytes   uint32 LE   star count N
  N × 24 bytes per star (all float32 LE):
    x_pc   Babylon X  = HYG x (toward vernal equinox)
    y_pc   Babylon Y  = HYG z (toward north celestial pole, Babylon "up")
    z_pc   Babylon Z  = -HYG y
    r      red   channel [0, 1]  (magnitude-dimmed)
    g      green channel [0, 1]
    b      blue  channel [0, 1]

Coordinate notes
────────────────
HYG uses heliocentric equatorial (J2000):
  x → RA = 0°, Dec = 0°  (vernal equinox)
  y → RA = 90°, Dec = 0°
  z → north celestial pole

We map to Babylon.js (Y-up, left-handed):
  Babylon X = HYG x
  Babylon Y = HYG z   (pole becomes "up")
  Babylon Z = -HYG y

This makes the ecliptic tilt visible (~23°) and the Milky Way band
appear at ~63° to the XZ plane — exactly as seen from Earth.
The user can orient the camera however they like.

Usage
─────
  python scripts/fetch_hyg.py
  python scripts/fetch_hyg.py --local path/to/hyg_v3.csv
  python scripts/fetch_hyg.py --mag 8.5   # only stars visible to the naked eye
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import struct
import sys
import urllib.request
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────

HYG_URL = (
    "https://raw.githubusercontent.com/astronexus/"
    "HYG-Database/main/hyg/v3/hyg_v38.csv.gz"
)

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = REPO_ROOT / "apps" / "web" / "public" / "stars.bin"


# ── Color mapping ──────────────────────────────────────────────────────────

def bv_to_rgb(bv: float) -> tuple[float, float, float]:
    """Convert B-V color index to approximate sRGB triplet (0–1 each).

    Spectral type reference:
      O  bv < -0.30  →  blue-violet
      B  -0.30–0.00  →  blue-white
      A  0.00–0.25   →  white
      F  0.25–0.60   →  yellow-white
      G  0.60–1.00   →  yellow  (Sun ≈ 0.65)
      K  1.00–1.50   →  orange
      M  bv > 1.50   →  red
    """
    bv = max(-0.4, min(2.0, bv))
    if bv < -0.30:
        return (0.58, 0.71, 1.00)
    if bv < 0.00:
        t = (bv + 0.30) / 0.30
        return (0.58 + t * 0.32, 0.71 + t * 0.18, 1.00)
    if bv < 0.25:
        t = bv / 0.25
        return (0.90 + t * 0.10, 0.89 + t * 0.06, 1.00 - t * 0.10)
    if bv < 0.60:
        t = (bv - 0.25) / 0.35
        return (1.00, 0.95 - t * 0.10, 0.90 - t * 0.30)
    if bv < 1.00:
        t = (bv - 0.60) / 0.40
        return (1.00, 0.85 - t * 0.20, 0.60 - t * 0.25)
    if bv < 1.50:
        t = (bv - 1.00) / 0.50
        return (1.00, 0.65 - t * 0.20, 0.35 - t * 0.15)
    return (1.00, 0.45, 0.20)


def magnitude_brightness(mag: float, mag_limit: float) -> float:
    """Map apparent magnitude to a brightness scalar in (0, 1].

    Brighter stars (lower mag) → closer to 1.
    Faintest stars at mag_limit → ~0.06.
    """
    return max(0.06, 1.0 - (max(0.0, mag) / mag_limit) * 0.94)


# ── CSV processing ─────────────────────────────────────────────────────────

def process_csv(text: str, mag_limit: float) -> list[tuple[float, ...]]:
    """Parse HYG CSV and return list of (bx, by, bz, r, g, b) tuples."""
    stars: list[tuple[float, ...]] = []
    reader = csv.DictReader(io.StringIO(text))

    for row in reader:
        try:
            mag = float(row["mag"])
            x_hyg = float(row["x"])
            y_hyg = float(row["y"])
            z_hyg = float(row["z"])
        except (ValueError, KeyError):
            continue

        if mag > mag_limit:
            continue

        ci_str = (row.get("ci") or "").strip()
        ci = float(ci_str) if ci_str else 0.65  # default: G-type (Sun-like)

        # HYG → Babylon coordinate mapping
        bx = x_hyg
        by = z_hyg  # celestial north → Babylon Y (up)
        bz = -y_hyg

        r, g, b = bv_to_rgb(ci)
        bright = magnitude_brightness(mag, mag_limit)
        stars.append((bx, by, bz, r * bright, g * bright, b * bright))

    return stars


# ── Binary writer ──────────────────────────────────────────────────────────

def write_binary(stars: list[tuple[float, ...]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as out:
        out.write(struct.pack("<I", len(stars)))
        for entry in stars:
            out.write(struct.pack("<ffffff", *entry))


# ── Entrypoint ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Build HYG star binary for HailMary")
    parser.add_argument(
        "--local", metavar="CSV_PATH",
        help="Use a local HYG CSV instead of downloading",
    )
    parser.add_argument(
        "--mag", type=float, default=10.5,
        help="Apparent magnitude limit (default 10.5 = full HYG catalogue)",
    )
    args = parser.parse_args()

    # ── Acquire CSV ──────────────────────────────────────────────────
    if args.local:
        csv_path = Path(args.local)
        if not csv_path.exists():
            print(f"Error: file not found: {csv_path}", file=sys.stderr)
            sys.exit(1)
        print(f"Reading local file: {csv_path}")
        raw = csv_path.read_bytes()
        csv_text = (gzip.decompress(raw) if csv_path.suffix == ".gz" else raw).decode("utf-8")
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
                "then run:\n  python scripts/fetch_hyg.py --local hyg_v38.csv.gz",
                file=sys.stderr,
            )
            sys.exit(1)

    # ── Process ──────────────────────────────────────────────────────
    print(f"Processing (magnitude limit: {args.mag}) …")
    stars = process_csv(csv_text, args.mag)
    print(f"Stars included: {len(stars):,}")

    # ── Write ────────────────────────────────────────────────────────
    write_binary(stars, OUT_PATH)
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"Written: {OUT_PATH.relative_to(REPO_ROOT)}  ({size_kb:,.0f} KB)")
    print("\nRestart the dev server — the frontend will pick up stars.bin automatically.")


if __name__ == "__main__":
    main()
