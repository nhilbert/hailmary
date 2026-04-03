import type { EngineClass, GalaxyStar, ShipParameters } from './types';
import nearbyStarsRaw from './nearby-stars.json';

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
    // pm: -3.678"/yr RA, 0.481"/yr Dec, rv +22.4 km/s → pc/yr
    pmX: -0.0000540, pmY: 0.0000081, pmZ: 0.0000320,
    descriptionKey: 'starDescription.alpha-centauri',
  },
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    constellation: 'Oph',
    magnitude: 9.5,
    distanceLightYears: 5.96,
    posX: -0.018, posY: 0.150, posZ: 1.821,
    // Fastest proper motion: -3.774"/yr RA, +10.337"/yr Dec, rv -110.8 km/s
    pmX: -0.0000059, pmY: 0.0001594, pmZ: 0.0000158,
    descriptionKey: 'starDescription.barnards-star',
  },
  {
    id: 'wolf-359',
    name: 'Wolf 359',
    constellation: 'Leo',
    magnitude: 13.5,
    distanceLightYears: 7.86,
    posX: -2.299, posY: 0.294, posZ: -0.656,
    pmX: -0.0000880, pmY: -0.0000510, pmZ: 0.0000150,
    descriptionKey: 'starDescription.wolf-359',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    constellation: 'CMa',
    magnitude: -1.46,
    distanceLightYears: 8.6,
    posX: -0.494, posY: -0.757, posZ: -2.477,
    // pm: -0.546"/yr RA, -1.223"/yr Dec, rv -5.5 km/s
    pmX: -0.0000045, pmY: -0.0000106, pmZ: -0.0000009,
    descriptionKey: 'starDescription.sirius',
  },
  {
    id: 'epsilon-eridani',
    name: 'Epsilon Eridani',
    constellation: 'Eri',
    magnitude: 3.73,
    distanceLightYears: 10.5,
    posX: 1.898, posY: -0.530, posZ: -2.541,
    pmX: 0.0000276, pmY: -0.0000234, pmZ: 0.0000076,
    descriptionKey: 'starDescription.epsilon-eridani',
  },
  {
    id: 'tau-ceti',
    name: 'Tau Ceti',
    constellation: 'Cet',
    magnitude: 3.49,
    distanceLightYears: 11.9,
    posX: 3.154, posY: -1.002, posZ: -1.542,
    pmX: -0.0000271, pmY: -0.0000173, pmZ: -0.0000037,
    descriptionKey: 'starDescription.tau-ceti',
  },
  {
    id: 'procyon',
    name: 'Procyon',
    constellation: 'CMi',
    magnitude: 0.34,
    distanceLightYears: 11.46,
    posX: -1.474, posY: 0.319, posZ: -3.172,
    pmX: -0.0000484, pmY: -0.0000178, pmZ: -0.0000016,
    descriptionKey: 'starDescription.procyon',
  },
  {
    id: '61-cygni',
    name: '61 Cygni',
    constellation: 'Cyg',
    magnitude: 5.21,
    distanceLightYears: 11.4,
    posX: 1.980, posY: 2.186, posZ: 1.873,
    pmX: 0.0000264, pmY: 0.0000600, pmZ: 0.0000340,
    descriptionKey: 'starDescription.61-cygni',
  },
  {
    id: 'altair',
    name: 'Altair',
    constellation: 'Aql',
    magnitude: 0.77,
    distanceLightYears: 16.77,
    posX: 2.363, posY: 0.791, posZ: 4.498,
    pmX: 0.0000320, pmY: 0.0000187, pmZ: 0.0000059,
    descriptionKey: 'starDescription.altair',
  },
  {
    id: 'vega',
    name: 'Vega',
    constellation: 'Lyr',
    magnitude: 0.03,
    distanceLightYears: 25.04,
    posX: 0.959, posY: 4.802, posZ: 5.911,
    pmX: 0.0000127, pmY: 0.0000278, pmZ: -0.0000140,
    descriptionKey: 'starDescription.vega',
  },
  // ── Extended neighbourhood (10–25 ly) ─────────────────────────
  {
    id: 'ross-248',
    name: 'Ross 248',
    constellation: 'And',
    magnitude: 13.0,
    distanceLightYears: 10.32,
    posX: 2.261, posY: 2.204, posZ: 0.179,
    descriptionKey: 'starDescription.ross-248',
  },
  {
    id: 'lacaille-9352',
    name: 'Lacaille 9352',
    constellation: 'PsA',
    magnitude: 7.34,
    distanceLightYears: 10.74,
    posX: 2.595, posY: -1.929, posZ: 0.621,
    descriptionKey: 'starDescription.lacaille-9352',
  },
  {
    id: 'ross-128',
    name: 'Ross 128',
    constellation: 'Vir',
    magnitude: 11.13,
    distanceLightYears: 10.92,
    posX: -3.341, posY: 0.104, posZ: -0.179,
    descriptionKey: 'starDescription.ross-128',
  },
  {
    id: 'groombridge-34',
    name: 'Groombridge 34',
    constellation: 'And',
    magnitude: 8.08,
    distanceLightYears: 11.62,
    posX: 2.554, posY: 2.475, posZ: -0.205,
    descriptionKey: 'starDescription.groombridge-34',
  },
  {
    id: '40-eridani',
    name: '40 Eridani',
    constellation: 'Eri',
    magnitude: 4.43,
    distanceLightYears: 16.39,
    posX: 2.197, posY: -0.669, posZ: -4.469,
    descriptionKey: 'starDescription.40-eridani',
  },
  {
    id: 'kapteyns-star',
    name: "Kapteyn's Star",
    constellation: 'Pic',
    magnitude: 8.84,
    distanceLightYears: 12.83,
    posX: 0.582, posY: -2.781, posZ: -2.720,
    descriptionKey: 'starDescription.kapteyns-star',
  },
  {
    id: '82-eridani',
    name: '82 Eridani',
    constellation: 'Eri',
    magnitude: 4.26,
    distanceLightYears: 19.81,
    posX: 0.490, posY: -0.264, posZ: -6.047,
    descriptionKey: 'starDescription.82-eridani',
  },
  {
    id: 'delta-pavonis',
    name: 'Delta Pavonis',
    constellation: 'Pav',
    magnitude: 3.55,
    distanceLightYears: 19.92,
    posX: 1.314, posY: -5.588, posZ: 2.088,
    descriptionKey: 'starDescription.delta-pavonis',
  },
  {
    id: 'fomalhaut',
    name: 'Fomalhaut',
    constellation: 'PsA',
    magnitude: 1.16,
    distanceLightYears: 25.13,
    posX: 6.451, posY: -3.806, posZ: 1.799,
    descriptionKey: 'starDescription.fomalhaut',
  },
  {
    id: 'gliese-667',
    name: 'Gliese 667',
    constellation: 'Sco',
    magnitude: 5.89,
    distanceLightYears: 23.62,
    posX: -1.057, posY: -4.150, posZ: 5.833,
    descriptionKey: 'starDescription.gliese-667',
  },
  // ── Bright landmarks (33–35 ly) ────────────────────────────────
  {
    id: 'pollux',
    name: 'Pollux',
    constellation: 'Gem',
    magnitude: 1.14,
    distanceLightYears: 33.78,
    posX: -4.054, posY: 4.865, posZ: -8.194,
    descriptionKey: 'starDescription.pollux',
  },
];

export const ENGINE_LABELS: Record<EngineClass, string> = {
  ion:        'engine.ion',
  fusion:     'engine.fusion',
  astrophage: 'engine.astrophage',
  warp:       'engine.warp',
  quantum:    'engine.quantum',
  hyperdrive: 'engine.hyperdrive',
};

export const SHIP_PRESETS: Record<string, ShipParameters> = {
  // ── Realistic ──────────────────────────────────────────────
  // Ion probe: tiny, very slow. Realistic near-future (Dawn/Hayabusa class).
  'ion-probe': {
    engineClass: 'ion',
    dryMassTons: 0.5,
    maxAccelG: 0.0001,
  },
  // Fusion explorer: Project Daedalus / Icarus class. Modest thrust.
  'fusion-explorer': {
    engineClass: 'fusion',
    dryMassTons: 450,
    maxAccelG: 0.01,
  },
  // ── Project Hail Mary ──────────────────────────────────────
  // Dry mass = ship structure + crew + equipment (astrophage fuel computed separately).
  'hail-mary': {
    engineClass: 'astrophage',
    dryMassTons: 200,
    maxAccelG: 1.5,
  },
  // ── Sci-fi drives ──────────────────────────────────────────
  scout: {
    engineClass: 'quantum',
    dryMassTons: 20,
    maxAccelG: 1.0,
  },
  freighter: {
    engineClass: 'warp',
    dryMassTons: 5_000,
    maxAccelG: 0.5,
  },
  // ── Star Trek ──────────────────────────────────────────────
  enterprise: {
    engineClass: 'hyperdrive',
    dryMassTons: 190_000,
    maxAccelG: 10.0,
  },
  // ── Star Wars ──────────────────────────────────────────────
  'millennium-falcon': {
    engineClass: 'hyperdrive',
    dryMassTons: 100,
    maxAccelG: 50.0,
  },
};

// ── Nearby stars from HYG catalogue ───────────────────────────────────────
// Generated by scripts/generate_nearby_stars.py.
// Deduplicate against the curated STARS list using 3D proximity (< 1 pc).

type NearbyStarRaw = {
  id: string; name: string; constellation: string; magnitude: number;
  distanceLightYears: number; posX: number; posY: number; posZ: number;
  description: string;
};

const _nearbyRaw = nearbyStarsRaw as NearbyStarRaw[];

const _nearbyFiltered: GalaxyStar[] = _nearbyRaw.filter((candidate) =>
  !STARS.some((named) => {
    const dx = named.posX - candidate.posX;
    const dy = named.posY - candidate.posY;
    const dz = named.posZ - candidate.posZ;
    return dx * dx + dy * dy + dz * dz < 1.0; // within 1 pc → same star
  })
).map((s) => ({ ...s, descriptionKey: undefined }));

/** All navigable stars: curated named stars + HYG nearby catalogue. */
export const ALL_STARS: GalaxyStar[] = [...STARS, ..._nearbyFiltered];
