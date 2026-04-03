import type { RouteSolveResponse, ShipParameters } from './types';

interface SolvePayload {
  startStarId: string;
  endStarId: string;
  ship: ShipParameters;
}

export const solveRoute = async (payload: SolvePayload): Promise<RouteSolveResponse> => {
  const response = await fetch('/routes/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Route solve failed (${response.status})`);
  }

  return (await response.json()) as RouteSolveResponse;
};
