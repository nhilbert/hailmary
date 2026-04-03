export type RoutePhase = 'departure' | 'transfer' | 'insertion' | 'coast';

export interface GalaxyStar {
  id: string;
  name: string;
  constellation: string;
  magnitude: number;
  distanceLightYears: number;
  /** Real heliocentric equatorial coordinates in light-years */
  posX: number;
  posY: number;
  posZ: number;
  descriptionKey: string;
}

export type EngineClass = 'ion' | 'warp' | 'quantum' | 'astrophage' | 'hyperdrive';

export interface ShipParameters {
  engineClass: EngineClass;
  cargoMassTons: number;
  maxBurnHours: number;
  safetyMarginPct: number;
}

export interface ManeuverSegment {
  id: string;
  fromStarId: string;
  toStarId: string;
  phase: RoutePhase;
  durationHours: number;
  deltaV: number;
}

export interface RouteSolveResponse {
  routeId: string;
  totalDurationHours: number;
  totalDeltaV: number;
  segments: ManeuverSegment[];
}

export interface TimelineEvent {
  id: string;
  label: string;
  phase: RoutePhase;
  segmentId: string;
  targetStarId: string;
  elapsedHours: number;
}
