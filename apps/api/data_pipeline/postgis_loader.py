from __future__ import annotations

import argparse
import csv
from pathlib import Path

TABLE_SQL = """
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS stars (
    id BIGINT PRIMARY KEY,
    ra_deg DOUBLE PRECISION NOT NULL,
    dec_deg DOUBLE PRECISION NOT NULL,
    distance_pc DOUBLE PRECISION NOT NULL,
    x_pc DOUBLE PRECISION NOT NULL,
    y_pc DOUBLE PRECISION NOT NULL,
    z_pc DOUBLE PRECISION NOT NULL,
    sigma_x_pc DOUBLE PRECISION NOT NULL,
    sigma_y_pc DOUBLE PRECISION NOT NULL,
    sigma_z_pc DOUBLE PRECISION NOT NULL,
    magnitude DOUBLE PRECISION NOT NULL,
    color_index DOUBLE PRECISION NOT NULL,
    position GEOMETRY(POINTZ, 4978) GENERATED ALWAYS AS
      (ST_SetSRID(ST_MakePoint(x_pc, y_pc, z_pc), 4978)) STORED
);

CREATE INDEX IF NOT EXISTS stars_position_gix ON stars USING GIST (position);
CREATE INDEX IF NOT EXISTS stars_magnitude_idx ON stars (magnitude);
""".strip()


COPY_TEMPLATE = (
    "\\copy stars (id, ra_deg, dec_deg, distance_pc, x_pc, y_pc, z_pc, "
    "sigma_x_pc, sigma_y_pc, sigma_z_pc, magnitude, color_index) "
    "FROM '{path}' WITH (FORMAT csv, HEADER true)"
)


def write_postgis_bootstrap_sql(output_sql: Path, csv_path: Path) -> None:
    output_sql.parent.mkdir(parents=True, exist_ok=True)
    sql = TABLE_SQL + "\n\n" + COPY_TEMPLATE.format(path=csv_path.as_posix()) + ";\n"
    output_sql.write_text(sql, encoding="utf-8")


def write_csv_from_index(index_json: Path, output_csv: Path) -> None:
    import json

    rows = json.loads(index_json.read_text(encoding="utf-8"))
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", encoding="utf-8", newline="") as outfile:
        writer = csv.writer(outfile)
        writer.writerow(
            [
                "id",
                "ra_deg",
                "dec_deg",
                "distance_pc",
                "x_pc",
                "y_pc",
                "z_pc",
                "sigma_x_pc",
                "sigma_y_pc",
                "sigma_z_pc",
                "magnitude",
                "color_index",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row["id"],
                    row["ra_deg"],
                    row["dec_deg"],
                    row["distance_pc"],
                    row["x_pc"],
                    row["y_pc"],
                    row["z_pc"],
                    row["sigma_x_pc"],
                    row["sigma_y_pc"],
                    row["sigma_z_pc"],
                    row["magnitude"],
                    row["color_index"],
                ]
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate PostGIS load SQL from star index")
    parser.add_argument("--index", type=Path, required=True, help="star_index.json path")
    parser.add_argument("--csv", type=Path, required=True, help="Output CSV path")
    parser.add_argument("--sql", type=Path, required=True, help="Output SQL bootstrap path")
    args = parser.parse_args()

    write_csv_from_index(args.index, args.csv)
    write_postgis_bootstrap_sql(args.sql, args.csv)
