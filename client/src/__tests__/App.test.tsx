import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('mounts the application shell and renders brand headers', () => {
    render(<App />);

    // Brand header
    expect(screen.getAllByText('CNG SmartPlan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gujarat Gas Co. Ltd.').length).toBeGreaterThan(0);

    // Initial page title on dashboard
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);

    // Key planning modules visible in nav
    expect(screen.getByText('Demand Forecast')).toBeInTheDocument();
    expect(screen.getByText('Supply Alerts')).toBeInTheDocument();
    expect(screen.getByText('Network Map')).toBeInTheDocument();
    expect(screen.getAllByText('Impact Simulator').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Data Quality & Provenance').length).toBeGreaterThan(0);
  });

  it('displays the global synthetic data indicator', () => {
    render(<App />);
    const syntheticBadges = screen.getAllByText(/Synthetic Demo/i);
    expect(syntheticBadges.length).toBeGreaterThan(0);
  });
});
