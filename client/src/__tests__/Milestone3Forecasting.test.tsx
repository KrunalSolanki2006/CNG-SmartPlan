import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StationSelector } from '../components/forecast/StationSelector';
import { ForecastChart } from '../components/forecast/ForecastChart';
import { ForecastControlPanel } from '../components/forecast/ForecastControlPanel';
import { ForecastMetricsPanel } from '../components/forecast/ForecastMetricsPanel';
import { ForecastReliabilityCard } from '../components/forecast/ForecastReliabilityCard';
import { ForecastDataTable } from '../components/forecast/ForecastDataTable';
import { ForecastStatusBanner } from '../components/forecast/ForecastStatusBanner';
import { ForecastSummaryMetrics } from '../components/forecast/ForecastSummaryMetrics';
import { NetworkForecastSummaryCard } from '../components/forecast/NetworkForecastSummaryCard';
import { HourlyProfileChart } from '../components/hourly/HourlyProfileChart';
import { SupplyAlertChart } from '../components/alerts/SupplyAlertChart';
import { SupplySummaryCards } from '../components/alerts/SupplySummaryCards';
import { SupplyOverrideForm } from '../components/alerts/SupplyOverrideForm';
import { SupplyComparisonTable } from '../components/alerts/SupplyComparisonTable';
import { ForecastPage } from '../pages/ForecastPage';
import { AlertsPage } from '../pages/AlertsPage';
import { FixtureProvider } from '../context/FixtureContext';
import { STATIONS_FIXTURE } from '../fixtures/stationsFixture';
import { FORECAST_FIXTURE_AMD001_7D, NETWORK_FORECAST_SUMMARY_FIXTURE } from '../fixtures/forecastFixture';
import { SUPPLY_CHECK_FIXTURE_AMD001_7D } from '../fixtures/supplyFixture';
import { HOURLY_FIXTURE_AMD001 } from '../fixtures/hourlyFixture';

describe('Milestone 3 Forecasting, Alerts, and Hourly Demand Components', () => {
  describe('StationSelector', () => {
    it('renders only the 11 eligible simulation stations and excludes uncertain station AMD010', () => {
      const handleSelect = vi.fn();
      render(
        <StationSelector
          stations={STATIONS_FIXTURE.stations}
          selectedStationId="AMD001"
          onSelectStation={handleSelect}
        />
      );

      // Verify eligible count
      expect(screen.getByText(/Select Forecast Station \(11 Eligible\)/i)).toBeInTheDocument();

      // AMD001 (Visat Automobile) is eligible
      expect(screen.getAllByText(/Visat Automobile/i).length).toBeGreaterThan(0);

      // AMD010 (Kanha Petroleum - in_study_area=uncertain) is not eligible for simulation
      const options = screen.getAllByRole('option');
      expect(options.length).toBe(11);
      const optionValues = options.map((opt) => (opt as HTMLOptionElement).value);
      expect(optionValues).not.toContain('AMD010');
      expect(optionValues).toContain('AMD001');
      expect(optionValues).toContain('AMD012');
    });

    it('triggers callback on station selection', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      render(
        <StationSelector
          stations={STATIONS_FIXTURE.stations}
          selectedStationId="AMD001"
          onSelectStation={handleSelect}
        />
      );

      const select = screen.getByLabelText('Select forecast station');
      await user.selectOptions(select, 'AMD004');
      expect(handleSelect).toHaveBeenCalledWith('AMD004');
    });
  });

  describe('ForecastControlPanel', () => {
    it('supports 7, 14, 30 day horizon presets, model selection, and baseline toggle', async () => {
      const user = userEvent.setup();
      const handleChangeHorizon = vi.fn();
      const handleChangeModel = vi.fn();
      const handleToggleBaseline = vi.fn();
      const handleRun = vi.fn();

      render(
        <ForecastControlPanel
          horizonDays={7}
          onChangeHorizon={handleChangeHorizon}
          model="holt_winters"
          onChangeModel={handleChangeModel}
          includeBaseline={true}
          onToggleBaseline={handleToggleBaseline}
          isLoading={false}
          onRunForecast={handleRun}
        />
      );

      // Test 14d and 30d buttons
      await user.click(screen.getByText('14 Days'));
      expect(handleChangeHorizon).toHaveBeenCalledWith(14);

      await user.click(screen.getByText('30 Days'));
      expect(handleChangeHorizon).toHaveBeenCalledWith(30);

      // Test model dropdown
      const modelSelect = screen.getByLabelText('Select forecast model');
      await user.selectOptions(modelSelect, 'rolling_mean_baseline');
      expect(handleChangeModel).toHaveBeenCalledWith('rolling_mean_baseline');

      // Test baseline toggle
      const baselineCheckbox = screen.getByLabelText(/Overlay 28d Baseline/i);
      await user.click(baselineCheckbox);
      expect(handleToggleBaseline).toHaveBeenCalledWith(false);

      // Test CTA
      await user.click(screen.getByRole('button', { name: /Generate Forecast/i }));
      expect(handleRun).toHaveBeenCalled();
    });
  });

  describe('ForecastStatusBanner & ForecastSummaryMetrics', () => {
    it('renders simulated status with 2026-11-24 cutoff and 2026-11-25 forecast period', () => {
      render(<ForecastStatusBanner forecastData={FORECAST_FIXTURE_AMD001_7D} isLoading={false} />);

      expect(screen.getByText('SIMULATED DATA — DEMONSTRATION ONLY')).toBeInTheDocument();
      expect(screen.getByText(/Historical Cutoff:/i)).toBeInTheDocument();
      expect(screen.getByText('2026-11-24')).toBeInTheDocument();
      expect(screen.getByText(/2026-11-25 to 2026-12-01/i)).toBeInTheDocument();
    });

    it('renders insufficient_data warning and avoids claiming forecast availability', () => {
      const insufficientData = {
        ...FORECAST_FIXTURE_AMD001_7D,
        forecast_status: 'insufficient_data' as const,
        target_start_date: null,
        target_end_date: null,
        forecast: [],
        baseline_forecast: [],
        forecast_avg_demand_kg: null,
        demand_trend: 'unavailable' as const,
        trend_change_pct: null,
        key_insight: 'Insufficient historical data (15 valid days available, minimum 35 required).',
      };

      render(<ForecastStatusBanner forecastData={insufficientData} isLoading={false} />);
      expect(screen.getByText('Insufficient Data')).toBeInTheDocument();
      expect(screen.getByText('Withheld')).toBeInTheDocument();

      render(<ForecastChart forecastData={insufficientData} isLoading={false} includeBaseline={true} />);
      expect(screen.getByText('Insufficient Historical Data')).toBeInTheDocument();
    });

    it('renders all 4 KPIs from API response', () => {
      render(<ForecastSummaryMetrics forecastData={FORECAST_FIXTURE_AMD001_7D} isLoading={false} />);

      expect(screen.getByText('Historical Avg Demand')).toBeInTheDocument();
      expect(screen.getByText('Forecast Avg Demand')).toBeInTheDocument();
      expect(screen.getByText('Expected Demand Trend')).toBeInTheDocument();
      expect(screen.getByText('Forecast Period')).toBeInTheDocument();
    });

    it('renders NetworkForecastSummaryCard with 151 eligible stations and simulated caveat', () => {
      render(
        <NetworkForecastSummaryCard
          summary={NETWORK_FORECAST_SUMMARY_FIXTURE}
          isLoading={false}
          error={null}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText(/Network-Level Simulated Forecast Summary/i)).toBeInTheDocument();
      expect(screen.getAllByText('151').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/2,?82,?927\.8 kg\/day/i)).toBeInTheDocument();
      expect(screen.getByText(/not a real Gujarat-wide CNG demand measurement/i)).toBeInTheDocument();
    });
  });

  describe('ForecastMetricsPanel & ReliabilityCard', () => {
    it('renders forecast details, 3-way chronological split dates, station error metrics, and synthetic qualifier', () => {
      render(
        <ForecastMetricsPanel
          evaluation={FORECAST_FIXTURE_AMD001_7D.evaluation}
          trainPeriod={FORECAST_FIXTURE_AMD001_7D.train_period}
          testPeriod={FORECAST_FIXTURE_AMD001_7D.test_period}
          modelUsed="holt_winters"
          forecastData={FORECAST_FIXTURE_AMD001_7D}
        />
      );

      expect(screen.getByText('Forecast Details')).toBeInTheDocument();
      expect(screen.getByText(/2024-01-01 to 2025-12-31/i)).toBeInTheDocument();
      expect(screen.getByText(/2026-01-01 to 2026-03-31/i)).toBeInTheDocument();
      expect(screen.getAllByText(/2026-04-01 to 2026-11-24/i).length).toBeGreaterThan(0);
      expect(screen.getByText('238 days')).toBeInTheDocument();

      // Station error metrics (AMD001)
      expect(screen.getByText(/138.42 kg\/day/i)).toBeInTheDocument();
      expect(screen.getByText(/172.10 kg\/day/i)).toBeInTheDocument();
      expect(screen.getByText(/8.15%/i)).toBeInTheDocument();

      expect(
        screen.getByText(/Do not claim real-world accuracy\./i)
      ).toBeInTheDocument();
    });

    it('renders dynamic station data audit checklist and limitations', () => {
      render(
        <ForecastReliabilityCard
          reliability={FORECAST_FIXTURE_AMD001_7D.reliability}
          limitations={FORECAST_FIXTURE_AMD001_7D.limitations}
          dataAudit={FORECAST_FIXTURE_AMD001_7D.data_audit}
          modelInfo={FORECAST_FIXTURE_AMD001_7D.model_info}
        />
      );

      expect(screen.getByText(/1059 Days \(2024-01-01 to 2026-11-24\)/i)).toBeInTheDocument();
      expect(screen.getByText(/All historical demand\/sales records are synthetic/i)).toBeInTheDocument();
      expect(screen.queryByText(/85%–115%/i)).not.toBeInTheDocument();
    });
  });

  describe('ForecastDataTable', () => {
    it('renders table rows with forecast demand in kg/day and confidence intervals', () => {
      render(
        <ForecastDataTable
          forecastPoints={FORECAST_FIXTURE_AMD001_7D.forecast}
          baselinePoints={FORECAST_FIXTURE_AMD001_7D.baseline_forecast}
          stationId="AMD001"
        />
      );

      expect(screen.getByText('Tabular Forecast Ledger (AMD001)')).toBeInTheDocument();
      expect(screen.getByText('2026-11-25')).toBeInTheDocument();
      expect(screen.getAllByText(/kg\/day/i).length).toBeGreaterThan(0);
    });
  });

  describe('HourlyProfileChart', () => {
    it('renders 24-hour diurnal profile, reconciliation check, and queue duration warning', () => {
      render(
        <HourlyProfileChart
          data={HOURLY_FIXTURE_AMD001}
          isLoading={false}
          selectedStationId="AMD001"
          onSelectStation={vi.fn()}
          selectedDate="2025-12-15"
          onSelectDate={vi.fn()}
        />
      );

      expect(
        screen.getByText('Diurnal Hourly Demand Profile (24-Hour Ahmedabad Time)')
      ).toBeInTheDocument();
      expect(screen.getByText(/Reconciles within 0.011 kg/i)).toBeInTheDocument();
      expect(screen.getByText(/Diurnal Peak Hour:/i)).toBeInTheDocument();

      // Critical Operational warning
      expect(
        screen.getByText(/Do NOT infer queue duration, dispenser wait times, or vehicle congestion counts/i)
      ).toBeInTheDocument();
    });
  });

  describe('Supply Alert Components', () => {
    it('renders canonical shortfall formula and planning shortfall distinction', () => {
      render(
        <SupplySummaryCards
          summary={SUPPLY_CHECK_FIXTURE_AMD001_7D.summary}
          totalDays={7}
        />
      );

      // Shortfall KPIs
      expect(screen.getByText('Shortfall Frequency')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Peak Day Shortfall')).toBeInTheDocument();
      expect(screen.getByText('Cumulative Deficit')).toBeInTheDocument();

      // Canonical formula
      expect(screen.getByText(/potential_shortfall_kg = max\(0, forecast_demand_kg - planned_supply_kg\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Planning shortfall \$\\ne\$ actual stockout/i)
      ).toBeInTheDocument();
    });

    it('renders supply chart and handles missing future supply warning', () => {
      render(
        <SupplyAlertChart
          comparison={SUPPLY_CHECK_FIXTURE_AMD001_7D.comparison}
          isLoading={false}
          stationId="AMD001"
        />
      );

      expect(
        screen.getByText(/Forecast Demand vs\. Planned Available Supply \(AMD001\)/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Future Supply Notice:/i)).toBeInTheDocument();
      expect(screen.getByText(/terminates on 2025-12-31/i)).toBeInTheDocument();
    });

    it('allows entering future supply overrides with user_entered_scenario tag', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      const handleRemove = vi.fn();
      const handleClear = vi.fn();

      render(
        <SupplyOverrideForm
          overrides={[{ date: '2026-01-05', supply_kg: 1800 }]}
          onAddOrUpdateOverride={handleAdd}
          onRemoveOverride={handleRemove}
          onClearOverrides={handleClear}
          minDate="2026-01-01"
        />
      );

      expect(
        screen.getByText('Planner Supply Schedule Overrides (Future Dates)')
      ).toBeInTheDocument();
      expect(screen.getByText('1 Active Override(s)')).toBeInTheDocument();
      expect(screen.getByText('2026-01-05')).toBeInTheDocument();
      expect(screen.getByText('1,800 kg')).toBeInTheDocument();

      // Add override
      const dateInput = screen.getByLabelText('Target date for supply override');
      const supplyInput = screen.getByLabelText('Planned supply in kilograms');

      await user.clear(dateInput);
      await user.type(dateInput, '2026-01-06');
      await user.clear(supplyInput);
      await user.type(supplyInput, '2000');

      await user.click(screen.getByRole('button', { name: /Add \/ Update Override/i }));

      expect(handleAdd).toHaveBeenCalledWith({
        date: '2026-01-06',
        supply_kg: 2000,
      });

      // Remove override
      await user.click(screen.getByLabelText('Remove override for 2026-01-05'));
      expect(handleRemove).toHaveBeenCalledWith('2026-01-05');
    });

    it('filters supply table rows by status', async () => {
      const user = userEvent.setup();
      render(
        <SupplyComparisonTable
          comparison={SUPPLY_CHECK_FIXTURE_AMD001_7D.comparison}
          stationId="AMD001"
        />
      );

      expect(screen.getByText('Daily Supply-Demand Balance Ledger (AMD001)')).toBeInTheDocument();

      // Filter by shortfall only
      await user.click(screen.getByRole('button', { name: /Shortfall Only/i }));
      expect(screen.getAllByText('Shortfall').length).toBeGreaterThan(0);

      // Filter by balanced only
      await user.click(screen.getByRole('button', { name: /Balanced Only/i }));
      expect(screen.getAllByText('Balanced').length).toBeGreaterThan(0);
    });
  });

  describe('Full Page Integration Flow (ForecastPage & AlertsPage)', () => {
    it('renders ForecastPage with dev fixtures enabled', async () => {
      localStorage.setItem('cng_smartplan_use_fixtures', 'true');

      render(
        <MemoryRouter>
          <FixtureProvider>
            <ForecastPage />
          </FixtureProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Station-Level Demand Forecasting')).toBeInTheDocument();
      expect(screen.getByText(/Station-level CNG demand forecasting/i)).toBeInTheDocument();

      // Wait for fixture resolution
      expect(await screen.findByText(/Historical vs\. Forecasted Demand/i)).toBeInTheDocument();
      expect(screen.getAllByText('SIMULATED DATA — DEMONSTRATION ONLY').length).toBeGreaterThan(0);
      expect(screen.getByText('Historical Avg Demand')).toBeInTheDocument();
    });

    it('renders AlertsPage with dev fixtures enabled', async () => {
      localStorage.setItem('cng_smartplan_use_fixtures', 'true');

      render(
        <MemoryRouter>
          <FixtureProvider>
            <AlertsPage />
          </FixtureProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Potential Supply-Shortfall Alerts')).toBeInTheDocument();
      expect(screen.getByText(/Compares station-level forecast demand/i)).toBeInTheDocument();

      // Wait for fixture resolution
      expect(await screen.findByText('Shortfall Frequency')).toBeInTheDocument();
      expect(screen.getByText(/Planner Supply Schedule Overrides/i)).toBeInTheDocument();
    });
  });
});
