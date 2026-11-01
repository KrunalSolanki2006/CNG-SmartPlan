import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Navigation Flow', () => {
  beforeEach(() => {
    localStorage.setItem('cng_smartplan_use_fixtures', 'true');
  });

  it('navigates to Forecast page and verifies shell contents', async () => {
    const user = userEvent.setup();
    render(<App />);

    const forecastLink = screen.getByText('Demand Forecast');
    await user.click(forecastLink);

    expect(screen.getAllByText('Station-Level Demand Forecasting').length).toBeGreaterThan(0);
    expect(screen.getByText('Chronological Train/Test Split')).toBeInTheDocument();
  });

  it('navigates to Supply Alerts page and verifies formula description', async () => {
    const user = userEvent.setup();
    render(<App />);

    const alertsLink = screen.getByText('Supply Alerts');
    await user.click(alertsLink);

    expect(screen.getAllByText('Potential Supply-Shortfall Alerts').length).toBeGreaterThan(0);
    expect(screen.getByText(/potential_shortfall_kg = max\(0, forecast_demand_kg - planned_supply_kg\)/i)).toBeInTheDocument();
  });

  it('navigates to Map page and verifies unavailable state', async () => {
    const user = userEvent.setup();
    render(<App />);

    const mapLink = screen.getByText('Network Map');
    await user.click(mapLink);

    expect(screen.getAllByText('Ahmedabad CNG Network Map').length).toBeGreaterThan(0);
    expect(screen.getByText('Production Station Pins Unavailable')).toBeInTheDocument();
    expect(screen.getByText('0 Verified Pins')).toBeInTheDocument();
  });

  it('navigates to Simulator page and verifies 3 canonical formulas', async () => {
    const user = userEvent.setup();
    render(<App />);

    const simulatorLink = screen.getByText('Impact Simulator');
    await user.click(simulatorLink);

    expect(screen.getAllByText('New-Station Impact Simulator').length).toBeGreaterThan(0);
    expect(screen.getByText('1. Proposed Demand')).toBeInTheDocument();
    expect(screen.getByText('2. Diverted Demand')).toBeInTheDocument();
    expect(screen.getByText('3. Net Additional Demand')).toBeInTheDocument();
  });

  it('navigates to Data Quality page and verifies documented data gaps', async () => {
    const user = userEvent.setup();
    render(<App />);

    const qualityLink = screen.getByText('Data Quality & Provenance');
    await user.click(qualityLink);

    expect(screen.getAllByText('Data Quality & Provenance Ledger').length).toBeGreaterThan(0);
    expect(await screen.findByText('Documented Data Gaps Register')).toBeInTheDocument();
    expect(screen.getByText('Verified station coordinates')).toBeInTheDocument();
  });
});
