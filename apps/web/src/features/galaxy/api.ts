import { STARS } from './data';
import type { EngineClass, ManeuverSegment, RouteSolveResponse, RoutePhase, ShipParameters } from './types';

interface SolvePayload {
  startStarId: string;
  endStarId: string;
  ship: ShipParameters;
}

const PARSEC_TO_KM = 3.0857e13;
const STANDARD_GRAVITY_MPS2 = 9.80665;

// Sol mass: G·M☉ = 1.327e20 m³/s²
const GM_SOL = 1.327e20;
// Sol radius [m]
const R_SOL = 6.957e8;

/** Real physics parameters per engine class */
const ENGINE_PHYSICS: Record<
  EngineClass,
  {
    thrustNewtons: number;
    ispSeconds: number;
    dryMassBaseKg: number;
    fuelRatioPerTon: number;
    shieldMassKg: number;
  }
> = {
  // ── Near-future / realistic ──────────────────────────────────────────────
  ion:        { thrustNewtons:      100_000, ispSeconds:    3_000, dryMassBaseKg:   5_000, fuelRatioPerTon:     500, shieldMassKg:         0 },
  warp:       { thrustNewtons:      500_000, ispSeconds:    1_200, dryMassBaseKg:   8_000, fuelRatioPerTon:     800, shieldMassKg:         0 },
  quantum:    { thrustNewtons:    2_000_000, ispSeconds:    8_000, dryMassBaseKg:   4_000, fuelRatioPerTon:     300, shieldMassKg:         0 },
  // ── Sci-fi drives ────────────────────────────────────────────────────────
  // Astrophage (Project Hail Mary): corrected to give ~0.96c, ~5 yr ship time.
  astrophage: { thrustNewtons:  110_000_000, ispSeconds: 25_000_000, dryMassBaseKg: 200_000, fuelRatioPerTon:  14_000, shieldMassKg:  50_000 },
  // Warp / hyperdrive: absurd parameters for fictional ships
  hyperdrive: { thrustNewtons: 1_000_000_000_000, ispSeconds: 1_000_000, dryMassBaseKg: 50_000, fuelRatioPerTon: 500, shieldMassKg:         0 },
};

// Gravity assist candidates for each engine class.
// Oberth parameters: GM [m³/s²], min flyby radius [m], peculiar velocity [m/s].
// Jupiter is always available as a departure-leg boost for all ships.
const GRAVITY_ASSIST_CANDIDATES = [
  {
    name: 'Jupiter',
    stellar_gm_m3_s2:   1.267e17,
    min_flyby_radius_m: 7.15e7,   // 1 Jupiter radius (grazing)
    peculiar_velocity_mps: 13_100, // Jupiter orbital speed
  },
  {
    name: 'Alpha Centauri A',
    stellar_gm_m3_s2:   GM_SOL * 1.10,  // 1.10 M☉
    min_flyby_radius_m: R_SOL * 1.10,   // ~1 stellar radius
    peculiar_velocity_mps: 22_000,       // peculiar velocity vs Sol
  },
];

const PHASE_MAP: Record<string, RoutePhase> = {
  acceleration:   'departure',
  gravity_assist: 'transfer',
  coast:          'coast',
  deceleration:   'insertion',
};

export const solveRoute = async (payload: SolvePayload): Promise<RouteSolveResponse> => {
  const startStar = STARS.find((s) => s.id === payload.startStarId);
  const endStar   = STARS.find((s) => s.id === payload.endStarId);

  // Real 3D Euclidean distance between the two stars
  const dx = (endStar?.posX ?? 0) - (startStar?.posX ?? 0);
  const dy = (endStar?.posY ?? 0) - (startStar?.posY ?? 0);
  const dz = (endStar?.posZ ?? 0) - (startStar?.posZ ?? 0);
  const distancePc = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  const physics    = ENGINE_PHYSICS[payload.ship.engineClass];
  const cargoKg    = payload.ship.cargoMassTons * 1000;
  const dryMassKg  = physics.dryMassBaseKg + cargoKg;
  const fuelMassKg = payload.ship.cargoMassTons * physics.fuelRatioPerTon;

  // Adaptive integration step: target ~10 000 steps per burn phase.
  const mdotKgPerSec = physics.thrustNewtons / (physics.ispSeconds * STANDARD_GRAVITY_MPS2);
  const estimatedBurnSec = fuelMassKg / mdotKgPerSec;
  const integrationStepSeconds = Math.min(86_400, Math.max(1, Math.ceil(estimatedBurnSec / 10_000)));

  const response = await fetch('/routes/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ship: {
        dryMassKg,
        fuelMassKg,
        thrustNewtons:  physics.thrustNewtons,
        ispSeconds:     physics.ispSeconds,
        shieldMassKg:   physics.shieldMassKg,
      },
      mission: {
        distanceKm:             distancePc * PARSEC_TO_KM,
        maxVelocityMps:         null,
        enableGravityAssist:    true,
        integrationStepSeconds,
      },
      gravityAssistCandidates: GRAVITY_ASSIST_CANDIDATES,
    }),
  });

  if (!response.ok) {
    throw new Error(`Route solve failed (${response.status})`);
  }

  const data = await response.json() as {
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
  };

  const segments: ManeuverSegment[] = data.segments.map((seg, index) => ({
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

  return {
    routeId:             `route-${Date.now()}`,
    totalDurationHours:  data.totalEarthFrameSeconds / 3600,
    totalDeltaV:         data.totalDeltaVMps,
    coastFractionUsed:   data.coastFractionUsed,
    shieldRemainingKg:   data.shieldRemainingKg,
    segments,
  };
};
