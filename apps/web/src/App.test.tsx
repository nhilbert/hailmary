import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import './i18n';

const mockSolveResponse = {
  routeId: 'r-1',
  totalDurationHours: 12,
  totalDeltaV: 40,
  segments: [
    {
      id: 'seg-1',
      fromStarId: 'sol',
      toStarId: 'alpha-centauri',
      phase: 'departure',
      durationHours: 4,
      deltaV: 12
    },
    {
      id: 'seg-2',
      fromStarId: 'alpha-centauri',
      toStarId: 'sirius',
      phase: 'transfer',
      durationHours: 8,
      deltaV: 28
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

  it('toggles keyboard shortcut help with ?', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getAllByText('Keyboard Shortcuts').length).toBeGreaterThan(0);
  });

  it('solves routes and updates mission timeline', async () => {
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
    });

    const slider = screen.getByLabelText('Timeline scrubber');
    fireEvent.change(slider, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getAllByText(/transfer: alpha-centauri → sirius/i).length).toBeGreaterThan(0);
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
    expect(screen.getByText('Nearest stellar system with high refuel infrastructure density.')).toBeTruthy();
    expect(screen.getAllByText(/departure: sol → alpha-centauri/i).length).toBeGreaterThan(0);
  });
});
