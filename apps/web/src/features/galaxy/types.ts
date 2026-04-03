export type RoutePhase = 'departure' | 'transfer' | 'insertion' | 'coast';

export interface GalaxyStar {
  id: string;
  name: string;
  constellation: string;
  magnitude: number;
  distanceLightYears: number;
  x: number;
  y: number;
  z: number;
  description: string;
}

export interface ShipParameters {
  engineClass: 'ion' | 'warp' | 'quantum';
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
