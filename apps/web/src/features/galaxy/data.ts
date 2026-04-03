import type { GalaxyStar, ShipParameters } from './types';

export const PHASE_COLORS = {
  departure: '#5ad1ff',
  transfer: '#9b7bff',
  insertion: '#63f7a9',
  coast: '#ffc965'
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
    description: 'Home system and common departure point for missions.'
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
    description: 'Nearest stellar system with high refuel infrastructure density.'
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
    description: 'Low-luminosity red dwarf often used for training routes.'
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
    description: 'Major logistics hub with dense traffic and strict insertion windows.'
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
