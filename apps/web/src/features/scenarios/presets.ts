import type { ManeuverSegment, ShipParameters } from '../galaxy/types';

export interface ScenarioPreset {
  id: string;
  titleKey: string;
  summaryKey: string;
  assumptions: string[];
  disclaimer: string;
  focusStarId: string;
  routeStartId: string;
  routeEndId: string;
  ship: ShipParameters;
  segments: ManeuverSegment[];
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'realistic-physics',
    titleKey: 'scenario.realisticPhysics.title',
    summaryKey: 'scenario.realisticPhysics.summary',
    assumptions: [
      'scenario.realisticPhysics.assumptionOne',
      'scenario.realisticPhysics.assumptionTwo',
      'scenario.realisticPhysics.assumptionThree',
    ],
    disclaimer:
      'scenario.realisticPhysics.disclaimer',
    focusStarId: 'alpha-centauri',
    routeStartId: 'sol',
    routeEndId: 'alpha-centauri',
    ship: {
      engineClass: 'ion',
      cargoMassTons: 42,
      maxBurnHours: 52,
      safetyMarginPct: 20,
    },
    segments: [
      {
        id: 'realistic-1',
        fromStarId: 'sol',
        toStarId: 'alpha-centauri',
        phase: 'departure',
        durationHours: 16,
        deltaV: 9.4,
      },
      {
        id: 'realistic-2',
        fromStarId: 'alpha-centauri',
        toStarId: 'alpha-centauri',
        phase: 'coast',
        durationHours: 110,
        deltaV: 0,
      },
      {
        id: 'realistic-3',
        fromStarId: 'alpha-centauri',
        toStarId: 'alpha-centauri',
        phase: 'insertion',
        durationHours: 20,
        deltaV: 11.1,
      },
    ],
  },
  {
    id: 'fictional-drive',
    titleKey: 'scenario.fictionalDrive.title',
    summaryKey: 'scenario.fictionalDrive.summary',
    assumptions: [
      'scenario.fictionalDrive.assumptionOne',
      'scenario.fictionalDrive.assumptionTwo',
      'scenario.fictionalDrive.assumptionThree',
    ],
    disclaimer:
      'scenario.fictionalDrive.disclaimer',
    focusStarId: 'sirius',
    routeStartId: 'sol',
    routeEndId: 'sirius',
    ship: {
      engineClass: 'quantum',
      cargoMassTons: 24,
      maxBurnHours: 8,
      safetyMarginPct: 8,
    },
    segments: [
      {
        id: 'fictional-1',
        fromStarId: 'sol',
        toStarId: 'alpha-centauri',
        phase: 'departure',
        durationHours: 0.6,
        deltaV: 180,
      },
      {
        id: 'fictional-2',
        fromStarId: 'alpha-centauri',
        toStarId: 'sirius',
        phase: 'transfer',
        durationHours: 1.1,
        deltaV: 240,
      },
      {
        id: 'fictional-3',
        fromStarId: 'sirius',
        toStarId: 'sirius',
        phase: 'insertion',
        durationHours: 0.4,
        deltaV: 95,
      },
    ],
  },
];
