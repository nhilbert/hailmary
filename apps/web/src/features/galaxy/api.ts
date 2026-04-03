import { ALL_STARS } from './data';
import type { FuelEstimate, ManeuverSegment, RouteSolveResponse, RoutePhase, ShipParameters } from './types';

interface SolvePayload {
  startStarId: string;
  endStarId: string;
  ship: ShipParameters;
}

const PARSEC_TO_KM = 3.0857e13;

// Sol mass: G·M☉ = 1.327e20 m³/s²
const GM_SOL = 1.327e20;
// Sol radius [m]
const R_SOL = 6.957e8;

// Gravity assist candidates provided for every solve request.
// Oberth parameters: GM [m³/s²], min flyby radius [m], peculiar velocity [m/s].
const GRAVITY_ASSIST_CANDIDATES = [
  {
    name: 'Jupiter',
    stellar_gm_m3_s2: 1.267e17,
    min_flyby_radius_m: 7.15e7,
    peculiar_velocity_mps: 13_100,
  },
  {
    name: 'Alpha Centauri A',
    stellar_gm_m3_s2: GM_SOL * 1.10,
    min_flyby_radius_m: R_SOL * 1.10,
    peculiar_velocity_mps: 22_000,
  },
];

const PHASE_MAP: Record<string, RoutePhase> = {
  acceleration:   'departure',
  gravity_assist: 'transfer',
  coast:          'coast',
  deceleration:   'insertion',
};

export const solveRoute = async (payload: SolvePayload): Promise<RouteSolveResponse> => {
  const startStar = ALL_STARS.find((s) => s.id === payload.startStarId);
  const endStar   = ALL_STARS.find((s) => s.id === payload.endStarId);

  const dx = (endStar?.posX ?? 0) - (startStar?.posX ?? 0);
  const dy = (endStar?.posY ?? 0) - (startStar?.posY ?? 0);
  const dz = (endStar?.posZ ?? 0) - (startStar?.posZ ?? 0);
  const distancePc = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  const response = await fetch('/routes/solve-by-spec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      engineClass:             payload.ship.engineClass,
      dryMassKg:               payload.ship.dryMassTons * 1000,
      maxAccelG:               payload.ship.maxAccelG,
      distanceKm:              distancePc * PARSEC_TO_KM,
      enableGravityAssist:     true,
      gravityAssistCandidates: GRAVITY_ASSIST_CANDIDATES,
    }),
  });

  if (!response.ok) {
    throw new Error(`Route solve failed (${response.status})`);
  }

  const data = await response.json() as {
    feasible: boolean;
    infeasibilityReason: string | null;
    fuelEstimate: {
      fuelMassKg: number;
      fuelUnit: string;
      fuelUnitSuffix: string;
      fuelAmountDisplay: number;
    } | null;
    trajectory: {
      totalEarthFrameSeconds: number;
      totalOnboardSeconds: number;
      totalDeltaVMps: number;
      coastFractionUsed: number;
      shieldRemainingKg: number;
      segments: Array<{
        phase: string;
        distanceKm: number;
        earthFrameDurationSeconds: number;
        onboardDurationSeconds: number;
        deltaVMps: number;
        shieldRemainingKg: number;
      }>;
    } | null;
  };

  // Infeasible — return error response with no segments
  if (!data.feasible || !data.trajectory) {
    return {
      routeId:            `route-infeasible-${Date.now()}`,
      totalDurationHours: 0,
      totalDeltaV:        0,
      coastFractionUsed:  0,
      shieldRemainingKg:  0,
      segments:           [],
      fuelEstimate:       null,
      infeasibilityReason: data.infeasibilityReason ?? 'Route is infeasible.',
    };
  }

  const traj = data.trajectory;
  const segments: ManeuverSegment[] = traj.segments.map((seg, index) => ({
    id:                   `seg-${index}`,
    fromStarId:           payload.startStarId,
    toStarId:             payload.endStarId,
    phase:                PHASE_MAP[seg.phase] ?? 'coast',
    durationHours:        seg.earthFrameDurationSeconds / 3600,
    durationHoursOnboard: seg.onboardDurationSeconds / 3600,
    distanceKm:           seg.distanceKm,
    deltaV:               seg.deltaVMps,
    shieldRemainingKg:    seg.shieldRemainingKg,
  }));

  const fuelEstimate: FuelEstimate | null = data.fuelEstimate
    ? {
        fuelMassKg:        data.fuelEstimate.fuelMassKg,
        fuelUnit:          data.fuelEstimate.fuelUnit,
        fuelUnitSuffix:    data.fuelEstimate.fuelUnitSuffix,
        fuelAmountDisplay: data.fuelEstimate.fuelAmountDisplay,
      }
    : null;

  return {
    routeId:             `route-${Date.now()}`,
    totalDurationHours:  traj.totalEarthFrameSeconds / 3600,
    totalDeltaV:         traj.totalDeltaVMps,
    coastFractionUsed:   traj.coastFractionUsed,
    shieldRemainingKg:   traj.shieldRemainingKg,
    segments,
    fuelEstimate,
    infeasibilityReason: null,
  };
};
