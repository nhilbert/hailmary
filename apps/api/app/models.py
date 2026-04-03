from enum import Enum

from pydantic import BaseModel, Field


class EngineClass(str, Enum):
    ion = "ion"
    warp = "warp"
    quantum = "quantum"


class StarSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=10, ge=1, le=100)


class CartesianVector(BaseModel):
    xPc: float
    yPc: float
    zPc: float


class StarSummary(BaseModel):
    id: str
    name: str
    constellation: str
    magnitude: float
    distanceLightYears: float = Field(ge=0)
    positionCartesian: CartesianVector | None = None


class StarDetail(StarSummary):
    raDeg: float
    decDeg: float
    uncertaintyCartesian: CartesianVector


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


class SolveShipParameters(BaseModel):
    dryMassKg: float = Field(gt=0)
    fuelMassKg: float = Field(ge=0)
    thrustNewtons: float = Field(gt=0)
    ispSeconds: float = Field(gt=0)


class GravityAssistCandidate(BaseModel):
    name: str = Field(min_length=1)
    deltaVBonusMps: float = Field(ge=0)


class SolveMissionParameters(BaseModel):
    distanceKm: float = Field(gt=0)
    coastFraction: float = Field(default=0.4, ge=0, le=1)
    maxVelocityMps: float | None = Field(default=None, gt=0)
    enableGravityAssist: bool = False
    integrationStepSeconds: float = Field(default=1.0, gt=0)


class SolveTrajectoryRequest(BaseModel):
    ship: SolveShipParameters
    mission: SolveMissionParameters
    gravityAssistCandidates: list[GravityAssistCandidate] = Field(default_factory=list)


class SolvePhase(str, Enum):
    acceleration = "acceleration"
    gravity_assist = "gravity_assist"
    coast = "coast"
    deceleration = "deceleration"


class SolveTimelineSegment(BaseModel):
    phase: SolvePhase
    distanceKm: float = Field(ge=0)
    startVelocityMps: float = Field(ge=0)
    endVelocityMps: float = Field(ge=0)
    deltaVMps: float = Field(ge=0)
    burnDurationSeconds: float = Field(ge=0)
    earthFrameDurationSeconds: float = Field(ge=0)
    onboardDurationSeconds: float = Field(ge=0)
    startEarthTimeSeconds: float = Field(ge=0)
    endEarthTimeSeconds: float = Field(ge=0)
    startOnboardTimeSeconds: float = Field(ge=0)
    endOnboardTimeSeconds: float = Field(ge=0)
    fuelRemainingKg: float = Field(ge=0)
    relativisticKineticEnergyJoules: float = Field(ge=0)
    lorentzFactor: float = Field(ge=1)
    gravityAssistUsed: str | None = None


class SolveTrajectoryResponse(BaseModel):
    totalDistanceKm: float = Field(gt=0)
    totalEarthFrameSeconds: float = Field(gt=0)
    totalOnboardSeconds: float = Field(gt=0)
    totalDeltaVMps: float = Field(ge=0)
    finalVelocityMps: float = Field(ge=0)
    fuelRemainingKg: float = Field(ge=0)
    segments: list[SolveTimelineSegment]
    gravityAssistChosen: str | None = None
