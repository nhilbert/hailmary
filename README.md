# HailMary

An interactive, accessible interstellar route-planning application. Pick stars in a 3D galaxy viewport, configure a ship, and solve a relativistic multi-phase trajectory with real physics.

Inspired by Andy Weir's *Project Hail Mary*.

---

## Features

### Galaxy Viewport
- 500,000-star procedural Milky Way rendered in a single GPU draw call (Babylon.js point cloud)
- 22+ real nearby stars (Hipparcos/Gaia catalogue) as clickable glowing spheres with accurate heliocentric equatorial positions
- Route overlay with per-phase maneuver colors: departure, transfer, coast, insertion
- Stellar proper-motion simulation: slide an epoch slider (−50,000 to +100,000 years) to see how the night sky evolves
- Stellar aberration visualization: simulate the apparent shift of stars at a given fraction of c

### Ship & Route Planner
- Select any two stars as route endpoints; filter by name
- Configure engine class, dry mass, and peak acceleration
- One-click ship presets (see [Ship Presets](#ship-presets))
- Solve button triggers the relativistic trajectory solver; results appear immediately

### Mission Timeline
- **Speed profile chart**: SVG velocity-vs-time chart, phase-colored, with active-segment highlight
- Phase-by-phase table showing Earth-frame duration, onboard (proper) time, and shield mass remaining
- Scrubber slider synced to the 3D viewport — drag to step through the mission and jump the camera to the current target star
- Relativistic time dilation displayed explicitly (ship time < Earth time for fast segments)

### Scenario Presets
- **Realistic physics**: Ion probe to Alpha Centauri. True ΔV, realistic travel time (~50,000 years).
- **Fictional drive**: Quantum scout to Sirius. Sub-hour transit showing what "sci-fi engines" imply.

### Accessibility
- Keyboard-first navigation; ARIA labels and live regions for all dynamic updates
- Screen-reader route summary with segment-by-segment text
- `prefers-reduced-motion` support
- Skip link; focus-visible outlines

### Internationalization
- English (`en`) — complete
- Spanish (`es`) — complete
- French (`fr`) — scaffold, falls back to English

---

## Physics Model

### Trajectory Solver (`apps/api/physics/trajectory.py`)

The solver integrates a four-phase mission: **acceleration → (optional gravity assist) → coast → deceleration**.

**Relativistic state variable:** `γv` (four-momentum component). The integrator steps on Earth-frame time and tracks:
- `γv` via `d(γv)/dt = F/m`
- `v` recovered as `γv / sqrt(1 + (γv/c)²)`
- Proper time via `dτ = dt / γ`
- Velocity cap at `0.999999c`

**Two burn modes:**

| Mode | Condition | Physics |
|---|---|---|
| Constant thrust | `constant_proper_accel = False` | `F = const`, acceleration rises as fuel burns. Classic rocket equation. |
| Constant proper acceleration | `constant_proper_accel = True` | `F(t) = a·m(t)`, thrust throttles down with mass. Used for astrophage and antimatter drives. |

**Brachistochrone (flip-and-burn) for constant proper accel drives:**

The solver uses an analytic formula — no binary search needed:

```
τ_half = (c / a) × acosh(1 + d × a / c²)
R_half = exp(a_g × τ_half / Isp_s)
```

Fuel split is **asymmetric** because the acceleration leg carries deceleration fuel as dead weight:
```
decel_fuel = payload × (R_half − 1)
accel_fuel = payload × R_half × (R_half − 1)
total_fuel = payload × (R_half² − 1)
```

**Constant-thrust drives** use a binary search over burn distance to find the optimal flip point that minimises total fuel for a given peak-velocity target.

**Infeasibility:** A route is infeasible if the required wet/dry mass ratio exceeds the drive's structural limit (`mass_ratio_limit`). This check only applies to constant proper-accel drives; constant-thrust drives can always coast, they just go slowly.

### Fuel Estimation

The `/routes/solve-by-spec` endpoint returns a `FuelEstimate`:
- `totalFuelTons` — propellant required for the full mission
- `fuelPerDryMassTons` — fuel/dry-mass ratio
- `displayAmount` / `displayUnit` — formatted in the drive's native unit (e.g., "397,541 t astrophage")

---

## Engine Classes

| Class | Isp (s) | vₑ | Max accel | Mass ratio limit | Mode | Notes |
|---|---|---|---|---|---|---|
| `ion` | 10,000 | 98 km/s | 0.002 g | 100 | Constant thrust | Realistic near-future (Dawn/Hayabusa class). TRL 9. |
| `orion` | 200,000 | 1,960 km/s | 1.0 g | 500 | Constant thrust | Nuclear pulse (Dyson 1968). TRL 4. Max reach ~0.033c coast. |
| `fusion` | 1,200,000 | 11,760 km/s ≈ 0.04c | 0.05 g | 400 | Constant thrust | D-³He ICF, Project Daedalus/Icarus. Ceiling ~0.1c. |
| `antimatter` | 10,000,000 | 98,000 km/s ≈ 0.33c | 0.5 g | 1,000 | Const proper accel | Pion beam core. Most powerful physically plausible drive. 5% gamma shield. |
| `astrophage` | 25,000,000 | 245,000 km/s ≈ 0.82c | 2.0 g | 100,000 | Const proper accel | Andy Weir's fictional drive. Near-c exhaust. 25% shield. |
| `warp` | 1,000,000 | — | 10.0 g | 500 | Constant thrust | Fictional (Star Trek). |
| `quantum` | 5,000,000 | — | 5.0 g | 1,000 | Constant thrust | Fictional high-Isp. |
| `hyperdrive` | 2,000,000 | — | 100.0 g | 2,000 | Constant thrust | Fictional (Star Wars / Star Trek). |

**Physical restrictions:**
- Magsail braking becomes ineffective above ~0.1c (proton gyroradius exceeds magnetopause). Not modelled explicitly but reflected in `fusion` ceiling.
- Orion cannot brachistochrone to nearby stars — it coasts with a ~965-year one-way trip to Alpha Centauri at max fuel.
- Fusion round-trip to Alpha Centauri at 0.1c requires mass ratio ~22,000 — feasible in the model only with extraordinary staging.
- Antimatter and astrophage drives demonstrate strong relativistic time dilation (ship time << Earth time).

---

## Ship Presets

| Preset | Engine | Dry mass | Peak accel | Description |
|---|---|---|---|---|
| Ion Probe | `ion` | 0.5 t | 0.0001 g | Realistic Dawn/Hayabusa-class probe |
| Orion Battleship | `orion` | 10,000 t | 1.0 g | Dyson (1968) interstellar Orion concept |
| Fusion Explorer | `fusion` | 450 t | 0.01 g | Project Daedalus / Icarus class |
| Antimatter Torch | `antimatter` | 1,000 t | 0.3 g | Pion beam core drive |
| Hail Mary | `astrophage` | 200 t | 1.5 g | Andy Weir's ship from the novel |
| Scout | `quantum` | 20 t | 1.0 g | Fictional quantum drive scout |
| Freighter | `warp` | 5,000 t | 0.5 g | Fictional heavy cargo hauler |
| USS Enterprise | `hyperdrive` | 190,000 t | 10.0 g | Star Trek |
| Millennium Falcon | `hyperdrive` | 100 t | 50.0 g | Star Wars |

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/stars/search` | Filter stars by name / id / constellation |
| `GET` | `/stars/{id}` | Star detail with cartesian position |
| `GET` | `/tiles/{lod}/{x}/{y}/{z}` | Binary octree tile (LOD streaming) |
| `POST` | `/routes/simulate` | Simple linear route (distance / speed) |
| `POST` | `/routes/solve-by-spec` | Full relativistic trajectory solver (primary endpoint) |

### `/routes/solve-by-spec` request

```json
{
  "startStarId": "sol",
  "endStarId": "tau-ceti",
  "ship": {
    "engineClass": "astrophage",
    "dryMassTons": 200,
    "maxAccelG": 1.5
  }
}
```

### `/routes/solve-by-spec` response

```json
{
  "segments": [
    {
      "id": "seg-accel",
      "fromStarId": "sol",
      "toStarId": "tau-ceti",
      "phase": "departure",
      "durationHours": 17520,
      "durationHoursOnboard": 4380,
      "distanceKm": 5.5e13,
      "deltaV": 250000,
      "shieldRemainingKg": 50000,
      "startVelocityMps": 0,
      "endVelocityMps": 2.5e8
    }
  ],
  "coastFractionUsed": 0.0,
  "fuelEstimate": {
    "totalFuelTons": 397541,
    "fuelPerDryMassTons": 1987,
    "displayAmount": "397,541",
    "displayUnit": "t astrophage"
  },
  "infeasibilityReason": null
}
```

---

## Monorepo Structure

```
apps/
  web/          React 18 + TypeScript + Vite + Babylon.js
  api/          FastAPI + Pydantic v2 (Python 3.11)
packages/
  contracts/    Shared Zod schemas (TypeScript)
```

---

## Running the Stack

### Prerequisites
- Node.js 22+
- Python 3.11+
- Docker + Docker Compose (optional)

### Install

```bash
npm install
python -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
```

### Frontend

```bash
npm run dev -w @hailmary/web        # http://localhost:5173
```

### API

```bash
cd apps/api
uvicorn app.main:app --reload       # http://localhost:8000
```

### Full stack (Docker)

```bash
docker compose up --build           # web :5173, api :8000, PostGIS :5432
```

---

## Tests & Quality

```bash
# Frontend
npm -w @hailmary/contracts run test
npm -w @hailmary/web run test

# Backend
cd apps/api && python3 -m pytest tests/ -v

# Linting / type-checking
npm run lint
npm run typecheck
ruff check apps/api
```

> **Note:** Do not run `npm run test` from the repo root — use the `-w` form above.

---

## Gaia DR3 ETL (optional)

The galaxy currently uses a procedural 500K-star point cloud. To replace it with real Gaia DR3 positions:

```bash
python apps/api/data_pipeline/gaia_etl.py \
  --input /path/to/gaia_dr3_subset.csv \
  --output apps/api/data_pipeline/output \
  --max-lod 6
```

Set `STAR_INDEX_PATH` to the generated `star_index.json` when running the API.

---

## Known Limitations

| # | Area | Issue |
|---|---|---|
| 1 | French locale | Only 6 keys translated; all others fall back to English |
| 2 | Web Dockerfile | Runs `npm run dev` — not a production build |
| 3 | PostGIS | In docker-compose but the API never queries it; star data comes from hardcoded defaults or `STAR_INDEX_PATH` JSON |
| 4 | Galaxy point cloud | Procedural only — real Gaia DR3 data requires ETL pipeline |
| 5 | Star labels | Named stars have no text label in the 3D scene (needs `@babylonjs/gui`) |
| 6 | Multi-hop routes | All segments share the same origin/destination — true multi-hop trajectories are not yet modelled |
