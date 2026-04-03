from fastapi import FastAPI, HTTPException, Query, Response

from physics.trajectory import compute_trajectory, solve_by_spec

from .models import (
    RouteSimulationLeg,
    RouteSimulationRequest,
    RouteSimulationResponse,
    SolveBySpecRequest,
    SolveBySpecResponse,
    SolveTrajectoryRequest,
    SolveTrajectoryResponse,
    StarDetail,
    StarSearchRequest,
    StarSearchResponse,
)
from .star_repository import StarRepository, load_tile_bytes

app = FastAPI(title="HailMary API", version="0.2.0")

ENGINE_SPEED = {
    "ion": 0.02,
    "warp": 2.0,
    "quantum": 5.0,
}

repository = StarRepository()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/stars/search", response_model=StarSearchResponse)
def search_stars(payload: StarSearchRequest) -> StarSearchResponse:
    return StarSearchResponse(results=repository.search(payload.query, payload.limit))


@app.get("/stars/search", response_model=StarSearchResponse)
def search_stars_get(
    query: str = Query(min_length=1),
    limit: int = Query(default=10, ge=1, le=100),
) -> StarSearchResponse:
    return StarSearchResponse(results=repository.search(query, limit))


@app.get("/stars/{star_id}", response_model=StarDetail)
def get_star(star_id: str) -> StarDetail:
    star = repository.get_by_id(star_id)
    if star is None:
        raise HTTPException(status_code=404, detail="Star not found")
    return star


@app.get("/tiles/{lod}/{x}/{y}/{z}")
def get_tile(lod: int, x: int, y: int, z: int) -> Response:
    tile_bytes = load_tile_bytes(lod, x, y, z)
    if tile_bytes is None:
        raise HTTPException(status_code=404, detail="Tile not found")
    return Response(content=tile_bytes, media_type="application/octet-stream")


@app.post("/routes/simulate", response_model=RouteSimulationResponse)
def simulate_route(payload: RouteSimulationRequest) -> RouteSimulationResponse:
    start = repository.get_by_id(payload.startStarId)
    end = repository.get_by_id(payload.endStarId)
    if start is None or end is None:
        raise HTTPException(status_code=404, detail="Star not found")

    distance = abs(end.distanceLightYears - start.distanceLightYears)
    speed = ENGINE_SPEED[payload.engineClass.value]
    eta_hours = distance / speed
    fuel_cost = distance * payload.cargoMassTons * 0.8

    leg = RouteSimulationLeg(
        fromStarId=start.id,
        toStarId=end.id,
        distanceLightYears=distance,
        etaHours=eta_hours,
        fuelCost=fuel_cost,
    )

    return RouteSimulationResponse(
        totalDistanceLightYears=distance,
        totalEtaHours=eta_hours,
        totalFuelCost=fuel_cost,
        legs=[leg],
    )


@app.post("/routes/solve", response_model=SolveTrajectoryResponse)
def solve_route(payload: SolveTrajectoryRequest) -> SolveTrajectoryResponse:
    return compute_trajectory(
        ship=payload.ship,
        mission=payload.mission,
        gravity_assists=payload.gravityAssistCandidates,
    )


@app.post("/routes/solve-by-spec", response_model=SolveBySpecResponse)
def solve_route_by_spec(payload: SolveBySpecRequest) -> SolveBySpecResponse:
    return solve_by_spec(payload)
