import type { EngineClass, GalaxyStar, ShipParameters } from './types';

export const PHASE_COLORS = {
  departure: 'var(--color-phase-departure)',
  transfer:  'var(--color-phase-transfer)',
  insertion: 'var(--color-phase-insertion)',
  coast:     'var(--color-phase-coast)',
} as const;

/**
 * Real heliocentric equatorial coordinates (light-years).
 * Derived from Hipparcos/Gaia RA, Dec, parallax.
 * x = d·cos(dec)·cos(ra), y = d·sin(dec), z = −d·cos(dec)·sin(ra)
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
    posX: -1.63, posY: -3.82, posZ: 1.36,
    descriptionKey: 'starDescription.alpha-centauri',
  },
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    constellation: 'Oph',
    magnitude: 9.5,
    distanceLightYears: 5.96,
    posX: -0.06, posY: 0.49, posZ: 5.94,
    descriptionKey: 'starDescription.barnards-star',
  },
  {
    id: 'wolf-359',
    name: 'Wolf 359',
    constellation: 'Leo',
    magnitude: 13.5,
    distanceLightYears: 7.86,
    posX: -7.50, posY: 0.96, posZ: -2.14,
    descriptionKey: 'starDescription.wolf-359',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    constellation: 'CMa',
    magnitude: -1.46,
    distanceLightYears: 8.6,
    posX: -1.61, posY: -2.47, posZ: -8.08,
    descriptionKey: 'starDescription.sirius',
  },
  {
    id: 'epsilon-eridani',
    name: 'Epsilon Eridani',
    constellation: 'Eri',
    magnitude: 3.73,
    distanceLightYears: 10.5,
    posX: 6.19, posY: -1.73, posZ: -8.29,
    descriptionKey: 'starDescription.epsilon-eridani',
  },
  {
    id: 'tau-ceti',
    name: 'Tau Ceti',
    constellation: 'Cet',
    magnitude: 3.49,
    distanceLightYears: 11.9,
    posX: 10.29, posY: -3.27, posZ: -5.03,
    descriptionKey: 'starDescription.tau-ceti',
  },
  {
    id: 'procyon',
    name: 'Procyon',
    constellation: 'CMi',
    magnitude: 0.34,
    distanceLightYears: 11.46,
    posX: -4.81, posY: 1.04, posZ: -10.35,
    descriptionKey: 'starDescription.procyon',
  },
  {
    id: '61-cygni',
    name: '61 Cygni',
    constellation: 'Cyg',
    magnitude: 5.21,
    distanceLightYears: 11.4,
    posX: 6.46, posY: 7.13, posZ: 6.11,
    descriptionKey: 'starDescription.61-cygni',
  },
  {
    id: 'altair',
    name: 'Altair',
    constellation: 'Aql',
    magnitude: 0.77,
    distanceLightYears: 16.77,
    posX: 7.71, posY: 2.58, posZ: 14.67,
    descriptionKey: 'starDescription.altair',
  },
  {
    id: 'vega',
    name: 'Vega',
    constellation: 'Lyr',
    magnitude: 0.03,
    distanceLightYears: 25.04,
    posX: 3.13, posY: 15.66, posZ: 19.28,
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
