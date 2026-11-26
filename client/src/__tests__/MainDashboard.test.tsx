import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { SupplyAlertsOverviewCard } from '../components/dashboard/SupplyAlertsOverviewCard';
import { NetworkIntelligenceExpansionSection } from '../components/dashboard/NetworkIntelligenceExpansionSection';
import { FixtureProvider } from '../context/FixtureContext';
import { DASHBOARD_OVERVIEW_FIXTURE } from '../fixtures/dashboardOverviewFixture';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-leaflet-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  CircleMarker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-verified-marker">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Main Dashboard Integration & Sections', () => {
  it('renders all 5 executive sections with backend fixture values and navigation buttons', async () => {
    localStorage.setItem('cng_smartplan_use_fixtures', 'true');
    mockNavigate.mockClear();

    render(
      <MemoryRouter>
        <FixtureProvider>
          <DashboardPage />
        </FixtureProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Verified CNG Stations')).toBeInTheDocument();
    expect(screen.getByText('Cities Covered')).toBeInTheDocument();
    expect(screen.getByText('Forecasted Network Demand')).toBeInTheDocument();
    expect(screen.getByText('Active Supply Alerts')).toBeInTheDocument();

    // Verified counts & forecast coverage
    expect(screen.getByText('151')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('151/151 Stations')).toBeInTheDocument();

    // Section headers
    expect(screen.getAllByText('Gujarat CNG Network Overview').length).toBeGreaterThan(0);
    expect(screen.getByText(/Demand Forecast Overview/i)).toBeInTheDocument();
    expect(screen.getByText('Supply Alerts & Notifications')).toBeInTheDocument();
    expect(screen.getByText('Network Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Network Expansion Insights')).toBeInTheDocument();

    // Verified markers only
    expect(screen.getAllByTestId('mock-verified-marker').length).toBe(
      DASHBOARD_OVERVIEW_FIXTURE.network_summary.verified_coordinates.length
    );

    // Navigation links
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Open Network Map/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/map');

    await user.click(screen.getByRole('button', { name: /Open Demand Forecasting/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/forecast');

    await user.click(screen.getByRole('button', { name: /Open Supply Alerts/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/alerts');

    await user.click(screen.getByRole('button', { name: /Candidate Evaluation/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/map?section=candidates');

    await user.click(screen.getByRole('button', { name: /Impact Simulator/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/simulator');
  });

  it('renders empty alert state when total_active_alerts is 0', () => {
    render(
      <MemoryRouter>
        <SupplyAlertsOverviewCard
          alerts={{
            ...DASHBOARD_OVERVIEW_FIXTURE.supply_alerts,
            total_active_alerts: 0,
            distinct_stations_affected: 0,
            critical_alerts_count: 0,
            warning_alerts_count: 0,
            recent_notifications: [],
          }}
          isLoading={false}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText(
        /No critical alerts currently\. The network is operating within the available monitored thresholds\./i
      )
    ).toBeInTheDocument();
  });

  it('renders empty candidate evaluation state when no candidates exist', () => {
    render(
      <MemoryRouter>
        <NetworkIntelligenceExpansionSection
          intelligence={DASHBOARD_OVERVIEW_FIXTURE.network_intelligence}
          expansion={{
            ...DASHBOARD_OVERVIEW_FIXTURE.expansion_insights,
            total_evaluated_candidates: 0,
            highest_ranked_candidate: null,
          }}
          isLoading={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/No candidate locations have been evaluated yet\./i)).toBeInTheDocument();
  });
});
