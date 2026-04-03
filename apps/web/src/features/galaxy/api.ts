import { STARS } from './data';
import type { EngineClass, ManeuverSegment, RouteSolveResponse, RoutePhase, ShipParameters } from './types';

interface SolvePayload {
  startStarId: string;
  endStarId: string;
  ship: ShipParameters;
}

const LIGHT_YEAR_TO_KM = 9.461e12;

/** Real physics parameters per engine class */
const ENGINE_PHYSICS: Record<
  EngineClass,
  { thrustNewtons: number; ispSeconds: number; dryMassBaseKg: number; fuelRatioPerTon: number }
> = {
  // ── Near-future / realistic ──────────────────────────────────
  ion:        { thrustNewtons:      100_000, ispSeconds:    3_000, dryMassBaseKg:   5_000, fuelRatioPerTon:   500 },
  warp:       { thrustNewtons:      500_000, ispSeconds:    1_200, dryMassBaseKg:   8_000, fuelRatioPerTon:   800 },
  quantum:    { thrustNewtons:    2_000_000, ispSeconds:    8_000, dryMassBaseKg:   4_000, fuelRatioPerTon:   300 },
  // ── Sci-fi drives ────────────────────────────────────────────
  // Astrophage (Project Hail Mary): photon-like drive, insane Isp
  astrophage: { thrustNewtons:   10_000_000, ispSeconds:  25_000_000, dryMassBaseKg: 200_000, fuelRatioPerTon: 1_000 },
  // Warp / hyperdrive: absurd parameters for fictional ships
  hyperdrive: { thrustNewtons: 1_000_000_000_000, ispSeconds: 1_000_000, dryMassBaseKg:  50_000, fuelRatioPerTon:   500 },
};

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
  const distanceLy = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  const physics  = ENGINE_PHYSICS[payload.ship.engineClass];
  const cargoKg  = payload.ship.cargoMassTons * 1000;
  const dryMassKg  = physics.dryMassBaseKg + cargoKg;
  const fuelMassKg = payload.ship.cargoMassTons * physics.fuelRatioPerTon;
  const coastFraction = Math.max(0, Math.min(0.9, 1 - payload.ship.safetyMarginPct / 100));

  const response = await fetch('/routes/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ship: {
        dryMassKg,
        fuelMassKg,
        thrustNewtons: physics.thrustNewtons,
        ispSeconds:    physics.ispSeconds,
      },
      mission: {
        distanceKm:             distanceLy * LIGHT_YEAR_TO_KM,
        coastFraction,
        maxVelocityMps:         null,
        enableGravityAssist:    false,
        integrationStepSeconds: 1.0,
      },
      gravityAssistCandidates: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Route solve failed (${response.status})`);
  }

  const data = await response.json() as {
    totalEarthFrameSeconds: number;
    totalOnboardSeconds: number;
    totalDeltaVMps: number;
    segments: Array<{
      phase: string;
      earthFrameDurationSeconds: number;
      onboardDurationSeconds: number;
      deltaVMps: number;
    }>;
  };

  const segments: ManeuverSegment[] = data.segments.map((seg, index) => ({
    id:          `seg-${index}`,
    fromStarId:  payload.startStarId,
    toStarId:    payload.endStarId,
    phase:       PHASE_MAP[seg.phase] ?? 'coast',
    durationHours:        seg.earthFrameDurationSeconds / 3600,
    deltaV:      seg.deltaVMps,
  }));

  return {
    routeId:           `route-${Date.now()}`,
    totalDurationHours: data.totalEarthFrameSeconds / 3600,
    totalDeltaV:        data.totalDeltaVMps,
    segments,
  };
};
