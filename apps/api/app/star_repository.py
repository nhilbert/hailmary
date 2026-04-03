from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .models import CartesianVector, StarDetail, StarSummary


@dataclass(slots=True)
class StarRecord:
    id: str
    name: str
    constellation: str
    magnitude: float
    distance_ly: float
    ra_deg: float
    dec_deg: float
    x_pc: float
    y_pc: float
    z_pc: float
    sigma_x_pc: float
    sigma_y_pc: float
    sigma_z_pc: float

    def to_summary(self) -> StarSummary:
        return StarSummary(
            id=self.id,
            name=self.name,
            constellation=self.constellation,
            magnitude=self.magnitude,
            distanceLightYears=self.distance_ly,
            positionCartesian=CartesianVector(xPc=self.x_pc, yPc=self.y_pc, zPc=self.z_pc),
        )

    def to_detail(self) -> StarDetail:
        summary = self.to_summary()
        return StarDetail(
            **summary.model_dump(),
            raDeg=self.ra_deg,
            decDeg=self.dec_deg,
            uncertaintyCartesian=CartesianVector(
                xPc=self.sigma_x_pc,
                yPc=self.sigma_y_pc,
                zPc=self.sigma_z_pc,
            ),
        )


DEFAULT_STARS = [
    StarRecord(
        id="sol",
        name="Sol",
        constellation="N/A",
        magnitude=-26.74,
        distance_ly=0.0,
        ra_deg=0.0,
        dec_deg=0.0,
        x_pc=-8122.0,
        y_pc=0.0,
        z_pc=20.8,
        sigma_x_pc=0.0,
        sigma_y_pc=0.0,
        sigma_z_pc=0.0,
    ),
    StarRecord(
        id="sirius",
        name="Sirius",
        constellation="Canis Major",
        magnitude=-1.46,
        distance_ly=8.6,
        ra_deg=101.287,
        dec_deg=-16.716,
        x_pc=-8122.489,
        y_pc=2.246,
        z_pc=19.039,
        sigma_x_pc=0.002,
        sigma_y_pc=0.003,
        sigma_z_pc=0.002,
    ),
    StarRecord(
        id="vega",
        name="Vega",
        constellation="Lyra",
        magnitude=0.03,
        distance_ly=25.0,
        ra_deg=279.234,
        dec_deg=38.783,
        x_pc=-8121.425,
        y_pc=-2.138,
        z_pc=26.636,
        sigma_x_pc=0.008,
        sigma_y_pc=0.006,
        sigma_z_pc=0.008,
    ),
]


class StarRepository:
    def __init__(self) -> None:
        self._stars = self._load_stars()

    def _load_stars(self) -> list[StarRecord]:
        index_path = os.getenv("STAR_INDEX_PATH")
        if not index_path:
            return DEFAULT_STARS

        path = Path(index_path)
        if not path.exists():
            return DEFAULT_STARS

        rows = json.loads(path.read_text(encoding="utf-8"))
        loaded: list[StarRecord] = []
        for row in rows:
            source_id = str(row["id"])
            loaded.append(
                StarRecord(
                    id=source_id,
                    name=f"Gaia {source_id}",
                    constellation="Unknown",
                    magnitude=float(row["magnitude"]),
                    distance_ly=float(row["distance_pc"]) * 3.26156,
                    ra_deg=float(row["ra_deg"]),
                    dec_deg=float(row["dec_deg"]),
                    x_pc=float(row["x_pc"]),
                    y_pc=float(row["y_pc"]),
                    z_pc=float(row["z_pc"]),
                    sigma_x_pc=float(row["sigma_x_pc"]),
                    sigma_y_pc=float(row["sigma_y_pc"]),
                    sigma_z_pc=float(row["sigma_z_pc"]),
                )
            )
        return loaded or DEFAULT_STARS

    def search(self, query: str, limit: int) -> list[StarSummary]:
        query_lower = query.lower()
        results = [
            star.to_summary()
            for star in self._stars
            if query_lower in star.id.lower()
            or query_lower in star.name.lower()
            or query_lower in star.constellation.lower()
        ]
        return results[:limit]

    def get_by_id(self, star_id: str) -> StarDetail | None:
        for star in self._stars:
            if star.id == star_id:
                return star.to_detail()
        return None


def load_tile_bytes(lod: int, x: int, y: int, z: int) -> bytes | None:
    base = Path(os.getenv("TILES_ROOT", "apps/api/data_pipeline/output/tiles"))
    tile_path = base / str(lod) / str(x) / str(y) / f"{z}.bin"
    if not tile_path.exists():
        return None
    return tile_path.read_bytes()


def postgis_schema_sql() -> str:
    return (
        "CREATE EXTENSION IF NOT EXISTS postgis;\n"
        "CREATE TABLE IF NOT EXISTS stars (\n"
        "  id BIGINT PRIMARY KEY,\n"
        "  name TEXT NOT NULL,\n"
        "  magnitude DOUBLE PRECISION NOT NULL,\n"
        "  position GEOMETRY(POINTZ, 4978) NOT NULL\n"
        ");\n"
        "CREATE INDEX IF NOT EXISTS stars_position_gix ON stars USING GIST(position);\n"
    )


def postgis_search_sql(limit: int) -> tuple[str, dict[str, Any]]:
    sql = (
        "SELECT id, name, magnitude, "
        "ST_X(position) AS x_pc, ST_Y(position) AS y_pc, ST_Z(position) AS z_pc "
        "FROM stars ORDER BY magnitude ASC LIMIT %(limit)s"
    )
    return sql, {"limit": limit}
