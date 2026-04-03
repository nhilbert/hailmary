export type RoutePhase = 'departure' | 'transfer' | 'insertion' | 'coast';

export interface GalaxyStar {
  id: string;
  name: string;
  constellation: string;
  magnitude: number;
  distanceLightYears: number;
  /** Real Babylon-space coordinates in parsecs (Babylon X = HYG x, Y = HYG z, Z = -HYG y) */
  posX: number;
  posY: number;
  posZ: number;
  /** i18n key for the description; ignored when description is set */
  descriptionKey?: string;
  /** Inline description string, takes priority over descriptionKey */
  description?: string;
  /** Proper motion in Babylon X [pc/yr] — derived from HYG pmra/pmdec/rv */
  pmX?: number;
  /** Proper motion in Babylon Y [pc/yr] */
  pmY?: number;
  /** Proper motion in Babylon Z [pc/yr] */
  pmZ?: number;
}

export type EngineClass = 'ion' | 'fusion' | 'astrophage' | 'warp' | 'quantum' | 'hyperdrive';

export interface ShipParameters {
  engineClass: EngineClass;
  /** Ship + cargo dry mass in tonnes (zero-fuel weight). */
  dryMassTons: number;
  /** Maximum desired initial acceleration in g. */
  maxAccelG: number;
}

export interface FuelEstimate {
  fuelMassKg: number;
  fuelUnit: string;
  fuelUnitSuffix: string;
  fuelAmountDisplay: number;
}

export interface ManeuverSegment {
  id: string;
  fromStarId: string;
  toStarId: string;
  phase: RoutePhase;
  durationHours: number;        // Earth-frame duration
  durationHoursOnboard: number; // Ship-frame duration (time dilation)
  distanceKm: number;
  deltaV: number;
  shieldRemainingKg: number;
}

export interface RouteSolveResponse {
  routeId: string;
  totalDurationHours: number;
  totalDeltaV: number;
  coastFractionUsed: number;
  shieldRemainingKg: number;
  segments: ManeuverSegment[];
  fuelEstimate: FuelEstimate | null;
  infeasibilityReason: string | null;
}

export interface TimelineEvent {
  id: string;
  label: string;
  phase: RoutePhase;
  segmentId: string;
  targetStarId: string;
  elapsedHours: number;
  durationHours: number;
  durationHoursOnboard: number;
  shieldRemainingKg: number;
}
