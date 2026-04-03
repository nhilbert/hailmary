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
    disclaimer: 'scenario.realisticPhysics.disclaimer',
    focusStarId: 'alpha-centauri',
    routeStartId: 'sol',
    routeEndId: 'alpha-centauri',
    ship: {
      engineClass: 'ion',
      dryMassTons: 0.5,
      maxAccelG: 0.0001,
    },
    segments: [
      {
        id: 'realistic-1',
        fromStarId: 'sol',
        toStarId: 'alpha-centauri',
        phase: 'departure',
        durationHours: 16,
        durationHoursOnboard: 16,
        distanceKm: 0,
        deltaV: 9.4,
        shieldRemainingKg: 0,
        startVelocityMps: 0,
        endVelocityMps: 9400,
      },
      {
        id: 'realistic-2',
        fromStarId: 'alpha-centauri',
        toStarId: 'alpha-centauri',
        phase: 'coast',
        durationHours: 110,
        durationHoursOnboard: 110,
        distanceKm: 0,
        deltaV: 0,
        shieldRemainingKg: 0,
        startVelocityMps: 9400,
        endVelocityMps: 9400,
      },
      {
        id: 'realistic-3',
        fromStarId: 'alpha-centauri',
        toStarId: 'alpha-centauri',
        phase: 'insertion',
        durationHours: 20,
        durationHoursOnboard: 20,
        distanceKm: 0,
        deltaV: 11.1,
        shieldRemainingKg: 0,
        startVelocityMps: 9400,
        endVelocityMps: 0,
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
    disclaimer: 'scenario.fictionalDrive.disclaimer',
    focusStarId: 'sirius',
    routeStartId: 'sol',
    routeEndId: 'sirius',
    ship: {
      engineClass: 'quantum',
      dryMassTons: 20,
      maxAccelG: 1.0,
    },
    segments: [
      {
        id: 'fictional-1',
        fromStarId: 'sol',
        toStarId: 'alpha-centauri',
        phase: 'departure',
        durationHours: 0.6,
        durationHoursOnboard: 0.6,
        distanceKm: 0,
        deltaV: 180,
        shieldRemainingKg: 0,
        startVelocityMps: 0,
        endVelocityMps: 180_000,
      },
      {
        id: 'fictional-2',
        fromStarId: 'alpha-centauri',
        toStarId: 'sirius',
        phase: 'transfer',
        durationHours: 1.1,
        durationHoursOnboard: 1.1,
        distanceKm: 0,
        deltaV: 240,
        shieldRemainingKg: 0,
        startVelocityMps: 180_000,
        endVelocityMps: 240_000,
      },
      {
        id: 'fictional-3',
        fromStarId: 'sirius',
        toStarId: 'sirius',
        phase: 'insertion',
        durationHours: 0.4,
        durationHoursOnboard: 0.4,
        distanceKm: 0,
        deltaV: 95,
        shieldRemainingKg: 0,
        startVelocityMps: 240_000,
        endVelocityMps: 0,
      },
    ],
  },
];
