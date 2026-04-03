import type { GalaxyStar, ShipParameters } from './types';

export const PHASE_COLORS = {
  departure: 'var(--color-phase-departure)',
  transfer: 'var(--color-phase-transfer)',
  insertion: 'var(--color-phase-insertion)',
  coast: 'var(--color-phase-coast)'
} as const;

export const STARS: GalaxyStar[] = [
  {
    id: 'sol',
    name: 'Sol',
    constellation: 'N/A',
    magnitude: -26.74,
    distanceLightYears: 0,
    x: 10,
    y: 70,
    z: 0,
    descriptionKey: 'starDescription.sol'
  },
  {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    constellation: 'Cen',
    magnitude: -0.27,
    distanceLightYears: 4.37,
    x: 35,
    y: 55,
    z: 2,
    descriptionKey: 'starDescription.alpha-centauri'
  },
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    constellation: 'Oph',
    magnitude: 9.5,
    distanceLightYears: 5.96,
    x: 50,
    y: 32,
    z: -1,
    descriptionKey: 'starDescription.barnards-star'
  },
  {
    id: 'sirius',
    name: 'Sirius',
    constellation: 'CMa',
    magnitude: -1.46,
    distanceLightYears: 8.6,
    x: 76,
    y: 24,
    z: 5,
    descriptionKey: 'starDescription.sirius'
  }
];

export const SHIP_PRESETS: Record<string, ShipParameters> = {
  scout: {
    engineClass: 'quantum',
    cargoMassTons: 18,
    maxBurnHours: 14,
    safetyMarginPct: 10
  },
  freighter: {
    engineClass: 'warp',
    cargoMassTons: 120,
    maxBurnHours: 30,
    safetyMarginPct: 22
  },
  explorer: {
    engineClass: 'ion',
    cargoMassTons: 45,
    maxBurnHours: 48,
    safetyMarginPct: 16
  }
};
