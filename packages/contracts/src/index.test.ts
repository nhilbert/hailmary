import { describe, expect, it } from 'vitest';
import { RouteSimulationRequestSchema } from './index';

describe('contracts schemas', () => {
  it('validates route simulation request', () => {
    const payload = {
      startStarId: 'sol',
      endStarId: 'sirius',
      engineClass: 'warp',
      cargoMassTons: 10
    };

    const result = RouteSimulationRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
