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
    shieldMassKg: float | None = Field(default=None, ge=0)


class GravityAssistCandidate(BaseModel):
    name: str = Field(min_length=1)
    # Oberth-aware gravity assist parameters
    stellar_gm_m3_s2: float = Field(gt=0, description="G·M of the flyby star [m³/s²]")
    min_flyby_radius_m: float = Field(gt=0, description="Minimum safe periapsis radius [m]")
    peculiar_velocity_mps: float = Field(ge=0, description="Stellar peculiar velocity vs Sol [m/s]")


class SolveMissionParameters(BaseModel):
    distanceKm: float = Field(gt=0)
    # coastFraction is now computed by the brachistochrone optimizer; this field
    # is ignored by the solver but kept for backwards compatibility.
    coastFraction: float = Field(default=0.0, ge=0, le=1)
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
    shieldRemainingKg: float = Field(ge=0)
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
    shieldRemainingKg: float = Field(ge=0)
    coastFractionUsed: float = Field(ge=0, le=1)
    segments: list[SolveTimelineSegment]
    gravityAssistChosen: str | None = None


# ── Spec-driven solve (fuel as output) ────────────────────────────────────


class SolveBySpecRequest(BaseModel):
    engineClass: str
    dryMassKg: float = Field(gt=0, description="Ship + cargo dry mass in kg")
    maxAccelG: float = Field(gt=0, le=1000, description="Max desired initial acceleration in g")
    distanceKm: float = Field(gt=0)
    enableGravityAssist: bool = False
    gravityAssistCandidates: list[GravityAssistCandidate] = Field(default_factory=list)


class FuelEstimate(BaseModel):
    fuelMassKg: float = Field(ge=0)
    fuelUnit: str
    fuelUnitSuffix: str
    fuelAmountDisplay: float = Field(ge=0, description="Amount in display units (e.g. tonnes)")


class SolveBySpecResponse(BaseModel):
    feasible: bool
    infeasibilityReason: str | None = None
    fuelEstimate: FuelEstimate | None = None
    trajectory: SolveTrajectoryResponse | None = None
