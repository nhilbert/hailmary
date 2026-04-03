from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_star_search_returns_results() -> None:
    response = client.post("/stars/search", json={"query": "sir", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["id"] == "sirius"


def test_get_star_by_id_returns_details() -> None:
    response = client.get("/stars/sirius")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "sirius"
    assert "uncertaintyCartesian" in data


def test_tile_endpoint_serves_binary(monkeypatch, tmp_path: Path) -> None:
    tile_path = tmp_path / "0" / "0" / "0" / "0.bin"
    tile_path.parent.mkdir(parents=True)
    tile_path.write_bytes(b"hm")
    monkeypatch.setenv("TILES_ROOT", str(tmp_path))

    response = client.get("/tiles/0/0/0/0")
    assert response.status_code == 200
    assert response.content == b"hm"


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
