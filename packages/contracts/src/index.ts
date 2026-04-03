import { z } from 'zod';

export const EngineClassSchema = z.enum(['ion', 'warp', 'quantum']);

export const StarSearchRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10)
});

export const StarSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  constellation: z.string(),
  magnitude: z.number(),
  distanceLightYears: z.number().nonnegative()
});

export const StarSearchResponseSchema = z.object({
  results: z.array(StarSummarySchema)
});

export const RouteSimulationRequestSchema = z.object({
  startStarId: z.string(),
  endStarId: z.string(),
  engineClass: EngineClassSchema,
  cargoMassTons: z.number().positive()
});

export const RouteSimulationLegSchema = z.object({
  fromStarId: z.string(),
  toStarId: z.string(),
  distanceLightYears: z.number().positive(),
  etaHours: z.number().positive(),
  fuelCost: z.number().nonnegative()
});

export const RouteSimulationResponseSchema = z.object({
  totalDistanceLightYears: z.number().positive(),
  totalEtaHours: z.number().positive(),
  totalFuelCost: z.number().nonnegative(),
  legs: z.array(RouteSimulationLegSchema)
});

export type EngineClass = z.infer<typeof EngineClassSchema>;
export type StarSearchRequest = z.infer<typeof StarSearchRequestSchema>;
export type StarSummary = z.infer<typeof StarSummarySchema>;
export type StarSearchResponse = z.infer<typeof StarSearchResponseSchema>;
export type RouteSimulationRequest = z.infer<typeof RouteSimulationRequestSchema>;
export type RouteSimulationLeg = z.infer<typeof RouteSimulationLegSchema>;
export type RouteSimulationResponse = z.infer<typeof RouteSimulationResponseSchema>;
