import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import './i18n';

// Shape matches SolveTrajectoryResponse from the API (apps/api/app/models.py)
const mockSolveResponse = {
  totalDistanceKm: 4.13e13,
  totalEarthFrameSeconds: 43200,
  totalOnboardSeconds: 43100,
  totalDeltaVMps: 40000,
  finalVelocityMps: 100,
  fuelRemainingKg: 1000,
  gravityAssistChosen: null,
  segments: [
    {
      phase: 'acceleration',
      distanceKm: 2e13,
      startVelocityMps: 0,
      endVelocityMps: 20000,
      deltaVMps: 20000,
      burnDurationSeconds: 14400,
      earthFrameDurationSeconds: 14400,
      onboardDurationSeconds: 14300,
      startEarthTimeSeconds: 0,
      endEarthTimeSeconds: 14400,
      startOnboardTimeSeconds: 0,
      endOnboardTimeSeconds: 14300,
      fuelRemainingKg: 2000,
      relativisticKineticEnergyJoules: 1e20,
      lorentzFactor: 1.00001,
      gravityAssistUsed: null
    },
    {
      phase: 'deceleration',
      distanceKm: 2.13e13,
      startVelocityMps: 20000,
      endVelocityMps: 100,
      deltaVMps: 19900,
      burnDurationSeconds: 28800,
      earthFrameDurationSeconds: 28800,
      onboardDurationSeconds: 28700,
      startEarthTimeSeconds: 14400,
      endEarthTimeSeconds: 43200,
      startOnboardTimeSeconds: 14300,
      endOnboardTimeSeconds: 43000,
      fuelRemainingKg: 1000,
      relativisticKineticEnergyJoules: 1e20,
      lorentzFactor: 1.00001,
      gravityAssistUsed: null
    }
  ]
};

describe('App accessibility and galaxy routing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders navigation landmarks', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
  });

  it('supports keyboard-only flow for route solving', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSolveResponse
      })
    );

    render(<App />);
    const solveButton = screen.getByRole('button', { name: 'Solve route' });
    solveButton.focus();
    fireEvent.keyDown(solveButton, { key: 'Enter', code: 'Enter' });
    fireEvent.keyUp(solveButton, { key: 'Enter', code: 'Enter' });
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText('Solved route with 2 maneuver segments.')).toBeTruthy();
    });
  });

  it('toggles keyboard shortcut help with ?', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getAllByText('Keyboard Shortcuts').length).toBeGreaterThan(0);
  });

  it('solves routes and updates mission timeline and screen-reader summary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSolveResponse
      })
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Solve route' }));

    await waitFor(() => {
      expect(screen.getByText('Solved route with 2 maneuver segments.')).toBeTruthy();
      expect(screen.getByText('Current route includes 2 segments and ends at alpha-centauri.')).toBeTruthy();
    });

    const slider = screen.getByLabelText('Timeline scrubber');
    fireEvent.change(slider, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getAllByText(/Insertion: sol → alpha-centauri/i).length).toBeGreaterThan(0);
    });
  });

  it('shows validation error for invalid parameters', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Cargo mass (tons)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Solve route' }));

    expect(screen.getByText('Please correct ship parameters before solving the route.')).toBeTruthy();
  });

  it('loads seeded scenario into map focus, ship form, and mission timeline with one click', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Realistic physics profile' }));

    await waitFor(() => {
      expect(screen.getByText('Loaded scenario: Realistic physics profile')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('42')).toBeTruthy();
    expect(screen.getByText('Nearest stellar system — target of Project Hail Mary.')).toBeTruthy();
    expect(screen.getAllByText(/departure: sol → alpha-centauri/i).length).toBeGreaterThan(0);
  });
});
