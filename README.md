# hailmary monorepo

This repository is a polyglot monorepo with:

- `apps/web`: React + TypeScript + Vite client with Babylon.js bootstrap, i18next localization, and accessibility baseline.
- `apps/api`: FastAPI service with contracts-aligned models and simulation/search routes.
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

- `POST /stars/search`: filter stars by name/id/constellation.
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
