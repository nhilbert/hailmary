from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_star_search_returns_results() -> None:
    response = client.post("/stars/search", json={"query": "sir", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["id"] == "sirius"


def test_route_simulation_returns_leg() -> None:
    response = client.post(
        "/routes/simulate",
        json={
            "startStarId": "sol",
            "endStarId": "sirius",
            "engineClass": "warp",
            "cargoMassTons": 2,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["legs"][0]["fromStarId"] == "sol"
    assert data["totalDistanceLightYears"] > 0
