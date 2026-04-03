import type { EngineClass, GalaxyStar, ShipParameters } from './types';

export const PHASE_COLORS = {
  departure: 'var(--color-phase-departure)',
  transfer:  'var(--color-phase-transfer)',
  insertion: 'var(--color-phase-insertion)',
  coast:     'var(--color-phase-coast)',
} as const;

/**
 * Real Babylon-space coordinates in parsecs.
 * Derived from Hipparcos/Gaia RA, Dec, parallax:
 *   Babylon X =  HYG x  (toward vernal equinox)
 *   Babylon Y =  HYG z  (toward north celestial pole — Babylon "up")
 *   Babylon Z = -HYG y
 */
export const STARS: GalaxyStar[] = [
  {
    id: 'sol',
    name: 'Sol',
    constellation: 'N/A',
    magnitude: -26.74,
    distanceLightYears: 0,
    posX: 0, posY: 0, posZ: 0,
    descriptionKey: 'starDescription.sol',
  },
  {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    constellation: 'Cen',
    magnitude: -0.27,
    distanceLightYears: 4.37,
    posX: -0.500, posY: -1.171, posZ: 0.417,
    descriptionKey: 'starDescription.alpha-centauri',
  },
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    constellation: 'Oph',
    magnitude: 9.5,
    distanceLightYears: 5.96,
    posX: -0.018, posY: 0.150, posZ: 1.821,
    descriptionKey: 'starDescription.barnards-star',
  },
  {
    id: 'wolf-359',
    name: 'Wolf 359',
    constellation: 'Leo',
    magnitude: 13.5,
    distanceLightYears: 7.86,
    posX: -2.299, posY: 0.294, posZ: -0.656,
    descriptionKey: 'starDescription.wolf-359',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    constellation: 'CMa',
    magnitude: -1.46,
    distanceLightYears: 8.6,
    posX: -0.494, posY: -0.757, posZ: -2.477,
    descriptionKey: 'starDescription.sirius',
  },
  {
    id: 'epsilon-eridani',
    name: 'Epsilon Eridani',
    constellation: 'Eri',
    magnitude: 3.73,
    distanceLightYears: 10.5,
    posX: 1.898, posY: -0.530, posZ: -2.541,
    descriptionKey: 'starDescription.epsilon-eridani',
  },
  {
    id: 'tau-ceti',
    name: 'Tau Ceti',
    constellation: 'Cet',
    magnitude: 3.49,
    distanceLightYears: 11.9,
    posX: 3.154, posY: -1.002, posZ: -1.542,
    descriptionKey: 'starDescription.tau-ceti',
  },
  {
    id: 'procyon',
    name: 'Procyon',
    constellation: 'CMi',
    magnitude: 0.34,
    distanceLightYears: 11.46,
    posX: -1.474, posY: 0.319, posZ: -3.172,
    descriptionKey: 'starDescription.procyon',
  },
  {
    id: '61-cygni',
    name: '61 Cygni',
    constellation: 'Cyg',
    magnitude: 5.21,
    distanceLightYears: 11.4,
    posX: 1.980, posY: 2.186, posZ: 1.873,
    descriptionKey: 'starDescription.61-cygni',
  },
  {
    id: 'altair',
    name: 'Altair',
    constellation: 'Aql',
    magnitude: 0.77,
    distanceLightYears: 16.77,
    posX: 2.363, posY: 0.791, posZ: 4.498,
    descriptionKey: 'starDescription.altair',
  },
  {
    id: 'vega',
    name: 'Vega',
    constellation: 'Lyr',
    magnitude: 0.03,
    distanceLightYears: 25.04,
    posX: 0.959, posY: 4.802, posZ: 5.911,
    descriptionKey: 'starDescription.vega',
  },
];

export const ENGINE_LABELS: Record<EngineClass, string> = {
  ion:        'engine.ion',
  warp:       'engine.warp',
  quantum:    'engine.quantum',
  astrophage: 'engine.astrophage',
  hyperdrive: 'engine.hyperdrive',
};

export const SHIP_PRESETS: Record<string, ShipParameters> = {
  // ── Realistic ──────────────────────────────────────────────
  'ion-probe': {
    engineClass: 'ion',
    cargoMassTons: 5,
    maxBurnHours: 720,
    safetyMarginPct: 20,
  },
  scout: {
    engineClass: 'quantum',
    cargoMassTons: 18,
    maxBurnHours: 14,
    safetyMarginPct: 10,
  },
  freighter: {
    engineClass: 'warp',
    cargoMassTons: 120,
    maxBurnHours: 30,
    safetyMarginPct: 22,
  },
  explorer: {
    engineClass: 'ion',
    cargoMassTons: 45,
    maxBurnHours: 48,
    safetyMarginPct: 16,
  },
  // ── Project Hail Mary ──────────────────────────────────────
  'hail-mary': {
    engineClass: 'astrophage',
    cargoMassTons: 490,
    maxBurnHours: 9600,
    safetyMarginPct: 5,
  },
  // ── Star Trek ──────────────────────────────────────────────
  enterprise: {
    engineClass: 'hyperdrive',
    cargoMassTons: 190_000,
    maxBurnHours: 8760,
    safetyMarginPct: 20,
  },
  // ── Star Wars ──────────────────────────────────────────────
  'millennium-falcon': {
    engineClass: 'hyperdrive',
    cargoMassTons: 900,
    maxBurnHours: 720,
    safetyMarginPct: 8,
  },
};
