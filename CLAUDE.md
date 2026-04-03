# Claude Instructions — HailMary

## General

- Respond in the language the user writes in.
- Be concise. No filler, no unsolicited explanations.
- No emojis unless asked.
- Do not commit or push unless explicitly asked.
- Implement one logical unit at a time. Verify each step before moving on.

---

## Project Overview

**HailMary** is an accessible interstellar route-planning application. A React/TypeScript web UI lets users pick stars in a 2D galaxy viewport, configure a ship, and solve a relativistic multi-phase trajectory. A FastAPI backend runs the actual physics solver.

The codebase is a **npm + Python monorepo**:

```
apps/
  web/          React 18 + TypeScript + Vite + Babylon.js (3D, partially implemented)
  api/          FastAPI + Pydantic v2 (Python 3.11)
packages/
  contracts/    Shared Zod schemas (TypeScript)
```

---

## Running the Stack

### Frontend (web)
```bash
npm run dev -w @hailmary/web        # http://localhost:5173
```

### API (backend)
```bash
cd apps/api
uvicorn app.main:app --reload       # http://localhost:8000
```

### Full stack
```bash
docker compose up --build           # web :5173, api :8000, PostGIS :5432
```

### Environment variables (API)
| Variable | Default | Purpose |
|---|---|---|
| `STAR_INDEX_PATH` | — | Path to generated `star_index.json` |
| `TILES_ROOT` | `apps/api/data_pipeline/output/tiles` | Octree tile directory |
| `DATABASE_URL` | set in docker-compose | PostGIS connection |

---

## Tests

### Frontend
```bash
npm -w @hailmary/contracts run test
npm -w @hailmary/web run test
```
**Do not use `npm run test` from root** — the `-w` flag position in the root scripts is wrong and causes an infinite process loop that will exhaust all RAM. The correct root-level invocation is:
```bash
npm -w @hailmary/contracts run test && npm -w @hailmary/web run test
```
Framework: **Vitest** + Testing Library + jsdom.

### Backend
```bash
cd apps/api && python3 -m pytest tests/ -v
```
Framework: **pytest** + httpx TestClient.

### Quality checks
```bash
npm run lint        # ESLint on web + contracts
npm run typecheck   # tsc --noEmit on web + contracts
ruff check apps/api # Python linting
```

---

## Galaxy Point Cloud

The 3D scene renders **500,000 procedural stars** in a single GPU draw call using a custom vertex mesh with `StandardMaterial.pointsCloud = true`. The Milky Way structure is modelled from:
- Central bulge (dense ellipsoid, warm-white stars)
- 4 spiral arms with exponential density falloff (bluer inner → yellower outer)
- Thin galactic disc (background haze)

**11 real nearby stars** (Hipparcos catalogue, within 25 ly) sit on top of the cloud as clickable glowing spheres. Coordinates in light-years, heliocentric equatorial system.

**To replace procedural with real Gaia data:**
1. Obtain Gaia DR3 CSV from ESA archives
2. Run `apps/api/data_pipeline/gaia_etl.py` to generate `star_index.json`
3. Convert the index to a `Float32Array` binary (x,y,z per star in parsecs)
4. Load asynchronously in `bootstrapBabylon.ts` and feed into `generateGalaxyPoints` replacement

---

## Ship Presets

| Preset | Engine class | Description |
|---|---|---|
| Ion Probe | `ion` | Realistic near-future, very slow |
| Scout | `quantum` | Fast exploration ship |
| Freighter | `warp` | Heavy cargo hauler |
| Explorer | `ion` | Long-range science vessel |
| Hail Mary | `astrophage` | Andy Weir's astrophage drive, relativistic |
| USS Enterprise | `hyperdrive` | Star Trek warp, fictional physics |
| Millennium Falcon | `hyperdrive` | Star Wars hyperdrive, fictional physics |

Engine classes `astrophage` and `hyperdrive` have extreme Isp/thrust values — they will show near-c velocities and near-zero onboard time in the trajectory solver. This is intentional and demonstrates relativistic time dilation dramatically.

---

## Known Issues (open)

| # | Area | Issue |
|---|---|---|
| # | Area | Issue |
|---|---|---|
| 1 | `apps/web/src/locales/fr/common.ts` | French locale has only 6 keys — all others fall back to English. |
| 2 | `apps/web/Dockerfile` | Runs `npm run dev` instead of a production build. |
| 3 | `apps/api/app/star_repository.py` | PostGIS is in docker-compose but the API never queries it — star data comes from hardcoded defaults or `STAR_INDEX_PATH` JSON. |
| 4 | Galaxy point cloud | Currently procedural (500K synthetic stars). Replace with real Gaia DR3 data via ETL pipeline for true star positions. |
| 5 | Star labels in 3D | Named stars have no label in the 3D scene. Requires `@babylonjs/gui` package. |
| 6 | Route segments | All segments share the same fromStarId/toStarId (the overall route endpoints). Multi-hop routes are not yet modelled. |

---

## Architecture

### Frontend state flow
```
GalaxyWorkspace (state owner)
  ├── GalaxyViewport     — 2D SVG star map + route overlay
  ├── ShipParametersForm — engine class, cargo, burn hours, safety margin
  ├── MissionTimeline    — scrubber across solved segments
  └── aside              — star detail, route start/end selectors, scenario presets
```

### API endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/stars/search` | Filter stars by name/id/constellation |
| GET | `/stars/{id}` | Star detail with cartesian position |
| GET | `/tiles/{lod}/{x}/{y}/{z}` | Binary octree tile (LOD streaming) |
| POST | `/routes/simulate` | Simple linear route (distance / speed) |
| POST | `/routes/solve` | Full relativistic trajectory solver |

### Physics solver (`apps/api/physics/trajectory.py`)
Four-phase integration: **acceleration → gravity_assist → coast → deceleration**.
Relativistic corrections: Lorentz factor, time dilation, γ³ thrust correction, velocity cap at 0.999999c.
Input: `SolveTrajectoryRequest` (raw SI units). Output: `SolveTrajectoryResponse` with per-segment timeline.

### Frontend ↔ backend contract gap
The frontend sends `{ startStarId, endStarId, ship: ShipParameters }` to `/routes/solve`.
The backend expects `{ ship: SolveShipParameters, mission: SolveMissionParameters }` in SI units.
The frontend types `RouteSolveResponse` / `ManeuverSegment` don't match `SolveTrajectoryResponse` / `SolveTimelineSegment`.
**Resolution**: add an adapter in `api.ts` that maps engine class → physics params and transforms the response.

---

## Tech Stack

| Layer | Key libraries |
|---|---|
| Frontend | React 18, TypeScript 5.7, Vite 6, Babylon.js 7, i18next 24, react-i18next 15 |
| Contracts | Zod 3.23 |
| Backend | FastAPI 0.116, Pydantic v2, Python 3.11 |
| Testing (FE) | Vitest 2, @testing-library/react 16, jsdom |
| Testing (BE) | pytest 8, httpx |
| Linting | ESLint 9 + typescript-eslint, Ruff |
| Infra | Docker Compose, PostgreSQL 16 + PostGIS 3.4, GitHub Actions CI |

---

## i18n

Three locales: `en` (complete), `es` (complete), `fr` (scaffold only).
Files: `apps/web/src/locales/{en,es,fr}/common.ts` — plain TypeScript objects, no JSON.
Fallback: English. Pluralization via `_one` / `_other` suffixes. Interpolation with `{{variable}}`.

---

## Code Standards

- **TypeScript**: type hints on all function signatures, no `any`.
- **Python**: type hints everywhere, Pydantic models for all IO boundaries.
- **Functions**: single responsibility, short. No dead code.
- **No abbreviations** unless universally understood.
- **Imports**: stdlib → third-party → local (both languages).
- **Tests required** for every module and function. No code is done without passing tests.
