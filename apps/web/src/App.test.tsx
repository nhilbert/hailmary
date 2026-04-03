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
      expect(screen.getByText('Current route includes 2 segments and ends at sirius.')).toBeTruthy();
    });

    const slider = screen.getByLabelText('Timeline scrubber');
    fireEvent.change(slider, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getAllByText(/Transfer: alpha-centauri → sirius/i).length).toBeGreaterThan(0);
    });
  });

  it('shows validation error for invalid parameters', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Cargo mass (tons)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Solve route' }));

    expect(screen.getByText('Please correct ship parameters before solving the route.')).toBeTruthy();
  });
});
