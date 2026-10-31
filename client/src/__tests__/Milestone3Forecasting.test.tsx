import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StationSelector } from '../components/forecast/StationSelector';
import { ForecastControlPanel } from '../components/forecast/ForecastControlPanel';
import { ForecastMetricsPanel } from '../components/forecast/ForecastMetricsPanel';
import { ForecastReliabilityCard } from '../components/forecast/ForecastReliabilityCard';
import { ForecastDataTable } from '../components/forecast/ForecastDataTable';
import { HourlyProfileChart } from '../components/hourly/HourlyProfileChart';
import { SupplyAlertChart } from '../components/alerts/SupplyAlertChart';
import { SupplySummaryCards } from '../components/alerts/SupplySummaryCards';
import { SupplyOverrideForm } from '../components/alerts/SupplyOverrideForm';
import { SupplyComparisonTable } from '../components/alerts/SupplyComparisonTable';
import { ForecastPage } from '../pages/ForecastPage';
import { AlertsPage } from '../pages/AlertsPage';
import { FixtureProvider } from '../context/FixtureContext';
import { STATIONS_FIXTURE } from '../fixtures/stationsFixture';
import { FORECAST_FIXTURE_AMD001_7D } from '../fixtures/forecastFixture';
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
    it('supports horizon presets, custom numeric input (1-30), model selection, and baseline toggle', async () => {
      const user = userEvent.setup();
      const handleChangeHorizon = vi.fn();
      const handleChangeModel = vi.fn();
      const handleToggleBaseline = vi.fn();
      const handleChangeAgg = vi.fn();
      const handleRun = vi.fn();

      render(
        <ForecastControlPanel
          horizonDays={7}
          onChangeHorizon={handleChangeHorizon}
          model="holt_winters"
          onChangeModel={handleChangeModel}
          includeBaseline={true}
          onToggleBaseline={handleToggleBaseline}
          aggregation="daily"
          onChangeAggregation={handleChangeAgg}
          isLoading={false}
          onRunForecast={handleRun}
        />
      );

      // Test 14d and 30d buttons
      await user.click(screen.getByText('14d'));
      expect(handleChangeHorizon).toHaveBeenCalledWith(14);

      await user.click(screen.getByText('30d'));
      expect(handleChangeHorizon).toHaveBeenCalledWith(30);

      // Test custom input
      const customInput = screen.getByLabelText('Custom forecast horizon in days');
      fireEvent.change(customInput, { target: { value: '21' } });
      expect(handleChangeHorizon).toHaveBeenCalledWith(21);

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

  describe('ForecastMetricsPanel & ReliabilityCard', () => {
    it('renders chronological train/test dates, baseline error metrics, and synthetic qualifier', () => {
      render(
        <ForecastMetricsPanel
          evaluation={FORECAST_FIXTURE_AMD001_7D.evaluation}
          trainPeriod={FORECAST_FIXTURE_AMD001_7D.train_period}
          testPeriod={FORECAST_FIXTURE_AMD001_7D.test_period}
          modelUsed="holt_winters"
        />
      );

      // Chronological split
      expect(screen.getByText('2024-01-01 to 2025-10-02')).toBeInTheDocument();
      expect(screen.getByText('2025-10-03 to 2025-12-31')).toBeInTheDocument();
      expect(screen.getByText('90 days')).toBeInTheDocument();

      // Error metrics
      expect(screen.getByText(/138.42 kg\/day/i)).toBeInTheDocument();
      expect(screen.getByText(/172.10 kg\/day/i)).toBeInTheDocument();
      expect(screen.getByText(/10.25%/i)).toBeInTheDocument();

      // Synthetic qualifier
      expect(
        screen.getByText(/Metrics computed from synthetic data only\. Do not claim real-world accuracy\./i)
      ).toBeInTheDocument();
    });

    it('renders data limitations register including blank holidays', () => {
      render(
        <ForecastReliabilityCard
          reliability={FORECAST_FIXTURE_AMD001_7D.reliability}
          limitations={FORECAST_FIXTURE_AMD001_7D.limitations}
        />
      );

      expect(screen.getByText(/731 Days \(2024–2025\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing \(Blank in all 8,041 rows\)/i)).toBeInTheDocument();
      expect(screen.getByText(/All training data is synthetic/i)).toBeInTheDocument();
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
      expect(screen.getByText('2026-01-01')).toBeInTheDocument();
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
      expect(screen.getByText('Dev Fixtures Active')).toBeInTheDocument();

      // Wait for fixture resolution
      expect(await screen.findByText(/Demand Trajectory & Model Forecast/i)).toBeInTheDocument();
      expect(screen.getByText('Chronological Train/Test Split')).toBeInTheDocument();
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
      expect(screen.getByText('Dev Fixtures Active')).toBeInTheDocument();

      // Wait for fixture resolution
      expect(await screen.findByText('Shortfall Frequency')).toBeInTheDocument();
      expect(screen.getByText(/Planner Supply Schedule Overrides/i)).toBeInTheDocument();
    });
  });
});
