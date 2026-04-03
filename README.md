# hailmary monorepo

This repository is a polyglot monorepo with:

- `apps/web`: React + TypeScript + Vite client with Babylon.js bootstrap, i18next localization, and accessibility baseline.
- `apps/api`: FastAPI service with contracts-aligned models, Gaia DR3 ETL helpers, octree tiles, and simulation/search routes.
- `packages/contracts`: Shared TypeScript schemas and types used across apps.

## Prerequisites

- Node.js 22+
- Python 3.12+
- Docker + Docker Compose (optional for full local stack)

## Install

```bash
npm install
python -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
```

## Development

### Web app

```bash
npm run dev -w @hailmary/web
```

### API app

```bash
uvicorn app.main:app --reload --app-dir apps/api
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
ruff check apps/api
pytest apps/api/tests
```

## API endpoints

- `POST /stars/search` and `GET /stars/search`: filter stars by name/id/constellation.
- `GET /stars/{id}`: return a single star including galactocentric position and uncertainty vectors.
- `GET /tiles/{lod}/{x}/{y}/{z}`: fetch binary octree tile chunks for renderer LOD streaming.
- `POST /routes/simulate`: simulate route between two stars.
- `GET /health`: health probe.

## Docker Compose

Start complete stack (Postgres/PostGIS + API + web):

```bash
docker compose up --build
```

Services:

- Web: `http://localhost:5173`
- API: `http://localhost:8000`
- PostGIS: `localhost:5432`


## Gaia DR3 ETL + Tile Generation

Generate a normalized star index and octree tiles under `apps/api/data_pipeline/output`:

```bash
python apps/api/data_pipeline/gaia_etl.py --input /path/to/gaia_dr3_subset.csv --output apps/api/data_pipeline/output --max-lod 6
```

Generate PostGIS bootstrap artifacts (`stars.csv` + SQL including 3D GiST index):

```bash
python apps/api/data_pipeline/postgis_loader.py \
  --index apps/api/data_pipeline/output/star_index.json \
  --csv apps/api/data_pipeline/output/stars.csv \
  --sql apps/api/data_pipeline/output/postgis_bootstrap.sql
```

Runtime environment variables for the API:

- `STAR_INDEX_PATH`: optional path to generated `star_index.json`.
- `TILES_ROOT`: optional path to generated binary tiles root (default `apps/api/data_pipeline/output/tiles`).
