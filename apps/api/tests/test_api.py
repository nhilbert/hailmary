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


def test_route_solver_returns_relativistic_timeline() -> None:
    # Gravity assist candidates now use Oberth parameters instead of flat deltaVBonusMps.
    # Jupiter: GM = 1.267e17 m³/s², min flyby ≈ 1 Jupiter radius = 7.15e7 m,
    #          peculiar velocity ≈ 13,100 m/s (orbital speed in Sol frame).
    response = client.post(
        "/routes/solve",
        json={
            "ship": {
                "dryMassKg": 12000,
                "fuelMassKg": 4000,
                "thrustNewtons": 900000,
                "ispSeconds": 350,
                "shieldMassKg": 500,
            },
            "mission": {
                "distanceKm": 1200000,
                "maxVelocityMps": 30000,
                "enableGravityAssist": True,
                "integrationStepSeconds": 0.5,
            },
            "gravityAssistCandidates": [
                {
                    "name": "Jupiter",
                    "stellar_gm_m3_s2": 1.267e17,
                    "min_flyby_radius_m": 7.15e7,
                    "peculiar_velocity_mps": 13100,
                },
                {
                    "name": "Saturn",
                    "stellar_gm_m3_s2": 3.793e16,
                    "min_flyby_radius_m": 6.03e7,
                    "peculiar_velocity_mps": 9700,
                },
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["gravityAssistChosen"] in ("Jupiter", "Saturn")
    assert data["totalEarthFrameSeconds"] >= data["totalOnboardSeconds"]
    assert "coastFractionUsed" in data
    assert 0.0 <= data["coastFractionUsed"] <= 1.0
    assert data["shieldRemainingKg"] >= 0

    phases = [segment["phase"] for segment in data["segments"]]
    assert phases == ["acceleration", "gravity_assist", "coast", "deceleration"]

    decel_segment = data["segments"][-1]
    assert decel_segment["fuelRemainingKg"] >= 0
    assert decel_segment["lorentzFactor"] >= 1
    assert "shieldRemainingKg" in decel_segment
