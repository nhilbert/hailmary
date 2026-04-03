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


## Internationalization and accessibility

The web app uses i18next resources in `apps/web/src/locales` with:

- `en` as the primary locale.
- `es` as a complete additional locale.
- `fr` as a scaffold locale for future translation expansion.

Accessibility coverage includes:

- Keyboard-first interactions for route solving and language toggling.
- ARIA labels and live regions for dynamic route status updates.
- Screen-reader route summaries with segment-by-segment text output.
- Color tokens for route phases and high-contrast-friendly surface/text combinations.
- `prefers-reduced-motion` support to minimize motion effects.

## CI pipeline

GitHub Actions workflow: `.github/workflows/ci.yml` runs and fails on any error for:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## API endpoints

- `POST /stars/search` and `GET /stars/search`: filter stars by name/id/constellation.
- `GET /stars/{id}`: return a single star including galactocentric position and uncertainty vectors.
- `GET /tiles/{lod}/{x}/{y}/{z}`: fetch binary octree tile chunks for renderer LOD streaming.
- `POST /routes/simulate`: simulate route between two stars.
- `POST /routes/solve`: solve staged acceleration/coast/deceleration mission profiles with finite thrust, propellant depletion, optional gravity assists, and relativistic timeline outputs (Earth frame + onboard proper time).
- `GET /health`: health probe.



### Trajectory solver payload (`POST /routes/solve`)

Request body includes:

- `ship`: `dryMassKg`, `fuelMassKg`, `thrustNewtons`, `ispSeconds`
- `mission`: `distanceKm`, `coastFraction`, optional `maxVelocityMps`, `enableGravityAssist`, `integrationStepSeconds`
- `gravityAssistCandidates`: optional list of `{ name, deltaVBonusMps }`

Response includes phase-by-phase segments (`acceleration`, optional `gravity_assist`, `coast`, `deceleration`) with:

- delta-v and burn duration
- Earth-frame and onboard-frame elapsed times
- Lorentz factor and relativistic kinetic energy
- remaining fuel after each phase

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

## Galaxy navigation UI

The web client now includes a galaxy workspace under `apps/web/src/features/galaxy` with:

- Star picking interactions and a live detail side panel.
- Route overlay rendering with per-phase maneuver colors (`departure`, `transfer`, `insertion`, `coast`).
- Mission timeline scrubbing that synchronizes the active scene target and route segment focus.
- Ship parameter form presets + validation and solver integration through `POST /routes/solve`.
- Seeded one-click scenario profiles at `apps/web/src/features/scenarios/presets.ts`, including:
  - A **realistic physics** profile with explicit planning assumptions.
  - A **fictional drive** profile with clearly marked non-canon disclaimer text.

Mirrored API-side scenario defaults are available at `apps/api/scenarios/defaults.py` for backend parity and future endpoint wiring.

Expected `/routes/solve` response contract used by the UI:

```json
{
  "routeId": "string",
  "totalDurationHours": 0,
  "totalDeltaV": 0,
  "segments": [
    {
      "id": "seg-1",
      "fromStarId": "sol",
      "toStarId": "alpha-centauri",
      "phase": "departure",
      "durationHours": 0,
      "deltaV": 0
    }
  ]
}
```
