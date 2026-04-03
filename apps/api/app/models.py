from enum import Enum

from pydantic import BaseModel, Field


class EngineClass(str, Enum):
    ion = "ion"
    warp = "warp"
    quantum = "quantum"


class StarSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=10, ge=1, le=50)


class StarSummary(BaseModel):
    id: str
    name: str
    constellation: str
    magnitude: float
    distanceLightYears: float = Field(ge=0)


class StarSearchResponse(BaseModel):
    results: list[StarSummary]


class RouteSimulationRequest(BaseModel):
    startStarId: str
    endStarId: str
    engineClass: EngineClass
    cargoMassTons: float = Field(gt=0)


class RouteSimulationLeg(BaseModel):
    fromStarId: str
    toStarId: str
    distanceLightYears: float = Field(gt=0)
    etaHours: float = Field(gt=0)
    fuelCost: float = Field(ge=0)


class RouteSimulationResponse(BaseModel):
    totalDistanceLightYears: float = Field(gt=0)
    totalEtaHours: float = Field(gt=0)
    totalFuelCost: float = Field(ge=0)
    legs: list[RouteSimulationLeg]
