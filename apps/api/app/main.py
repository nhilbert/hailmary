from fastapi import FastAPI, HTTPException

from .models import (
    RouteSimulationLeg,
    RouteSimulationRequest,
    RouteSimulationResponse,
    StarSearchRequest,
    StarSearchResponse,
    StarSummary,
)

app = FastAPI(title="HailMary API", version="0.1.0")

STARS = [
    StarSummary(
        id="sol",
        name="Sol",
        constellation="N/A",
        magnitude=-26.74,
        distanceLightYears=0,
    ),
    StarSummary(
        id="sirius",
        name="Sirius",
        constellation="Canis Major",
        magnitude=-1.46,
        distanceLightYears=8.6,
    ),
    StarSummary(
        id="vega",
        name="Vega",
        constellation="Lyra",
        magnitude=0.03,
        distanceLightYears=25,
    ),
]

ENGINE_SPEED = {
    "ion": 0.02,
    "warp": 2.0,
    "quantum": 5.0,
}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/stars/search", response_model=StarSearchResponse)
def search_stars(payload: StarSearchRequest) -> StarSearchResponse:
    query = payload.query.lower()
    results = [
        star
        for star in STARS
        if (
            query in star.name.lower()
            or query in star.constellation.lower()
            or query in star.id.lower()
        )
    ]
    return StarSearchResponse(results=results[: payload.limit])


@app.post("/routes/simulate", response_model=RouteSimulationResponse)
def simulate_route(payload: RouteSimulationRequest) -> RouteSimulationResponse:
    start = next((star for star in STARS if star.id == payload.startStarId), None)
    end = next((star for star in STARS if star.id == payload.endStarId), None)
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
