from __future__ import annotations

from typing import TypedDict


class ShipDefaults(TypedDict):
    engineClass: str
    cargoMassTons: float
    maxBurnHours: float
    safetyMarginPct: float


class SegmentDefaults(TypedDict):
    id: str
    fromStarId: str
    toStarId: str
    phase: str
    durationHours: float
    deltaV: float


class ScenarioDefaults(TypedDict):
    id: str
    title: str
    profile: str
    assumptions: list[str]
    disclaimer: str
    focusStarId: str
    routeStartId: str
    routeEndId: str
    ship: ShipDefaults
    segments: list[SegmentDefaults]


SCENARIO_DEFAULTS: list[ScenarioDefaults] = [
    {
        "id": "realistic-physics",
        "title": "Realistic Physics Profile",
        "profile": "realistic_physics",
        "assumptions": [
            "Finite-thrust ion propulsion with conservative safety reserve.",
            "Acceleration and insertion windows are mission-control constrained.",
            "Cruise segment reflects long-duration coast under known physics.",
        ],
        "disclaimer": "Non-canon training profile intended for planning practice.",
        "focusStarId": "alpha-centauri",
        "routeStartId": "sol",
        "routeEndId": "alpha-centauri",
        "ship": {
            "engineClass": "ion",
            "cargoMassTons": 42,
            "maxBurnHours": 52,
            "safetyMarginPct": 20,
        },
        "segments": [
            {
                "id": "realistic-1",
                "fromStarId": "sol",
                "toStarId": "alpha-centauri",
                "phase": "departure",
                "durationHours": 16,
                "deltaV": 9.4,
            },
            {
                "id": "realistic-2",
                "fromStarId": "alpha-centauri",
                "toStarId": "alpha-centauri",
                "phase": "coast",
                "durationHours": 110,
                "deltaV": 0,
            },
            {
                "id": "realistic-3",
                "fromStarId": "alpha-centauri",
                "toStarId": "alpha-centauri",
                "phase": "insertion",
                "durationHours": 20,
                "deltaV": 11.1,
            },
        ],
    },
    {
        "id": "fictional-drive",
        "title": "Fictional Drive Profile",
        "profile": "fictional_drive",
        "assumptions": [
            "Speculative quantum lane compression allows superluminal transfer.",
            "Navigation lock assumes stable beacons with no drift.",
            "Insertion burn modeled as deterministic for training UI only.",
        ],
        "disclaimer": "Non-canon sandbox profile; values are intentionally fictional.",
        "focusStarId": "sirius",
        "routeStartId": "sol",
        "routeEndId": "sirius",
        "ship": {
            "engineClass": "quantum",
            "cargoMassTons": 24,
            "maxBurnHours": 8,
            "safetyMarginPct": 8,
        },
        "segments": [
            {
                "id": "fictional-1",
                "fromStarId": "sol",
                "toStarId": "alpha-centauri",
                "phase": "departure",
                "durationHours": 0.6,
                "deltaV": 180,
            },
            {
                "id": "fictional-2",
                "fromStarId": "alpha-centauri",
                "toStarId": "sirius",
                "phase": "transfer",
                "durationHours": 1.1,
                "deltaV": 240,
            },
            {
                "id": "fictional-3",
                "fromStarId": "sirius",
                "toStarId": "sirius",
                "phase": "insertion",
                "durationHours": 0.4,
                "deltaV": 95,
            },
        ],
    },
]
