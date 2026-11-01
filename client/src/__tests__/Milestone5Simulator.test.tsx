import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createImpactFixture } from '../fixtures/impactFixture';
import { validateSimulatorRequest } from '../hooks/useImpactSimulator';
import { SimulatorPage } from '../pages/SimulatorPage';
import { SimulatorInputsPanel } from '../components/simulator/SimulatorInputsPanel';
import { SimulatorResultsCards } from '../components/simulator/SimulatorResultsCards';
import { SimulatorFormulasPanel } from '../components/simulator/SimulatorFormulasPanel';
import { SimulatorGeographicDisclosure } from '../components/simulator/SimulatorGeographicDisclosure';
import { FixtureProvider } from '../context/FixtureContext';
import { ImpactSimulatorRequest } from '../types/api';
import App from '../App';

describe('Milestone 5 - New-Station Impact Simulator Acceptance Tests', () => {
  beforeEach(() => {
    localStorage.setItem('cng_smartplan_use_fixtures', 'true');
  });

  /* AT-I01, AT-I02, AT-I03: Canonical Formulas Verification */
  describe('Canonical Formulas & Mathematical Precision', () => {
    it('AT-I01: evaluates proposed demand formula correctly (1750.0 kg/day)', () => {
      const fixture = createImpactFixture({
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 0.35,
        accessibility_demand_kg_per_day: 0,
      });

      expect(fixture.results.proposed_station_demand_kg_per_day).toBeCloseTo(1750.0, 2);
    });

    it('AT-I02: evaluates diverted demand formula correctly (1050.0 kg/day)', () => {
      const fixture = createImpactFixture({
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 0.35,
        diversion_proportion: 0.60,
        accessibility_demand_kg_per_day: 0,
      });

      expect(fixture.results.estimated_diverted_demand_kg_per_day).toBeCloseTo(1050.0, 2);
    });

    it('AT-I03: evaluates net additional network demand formula correctly (700.0 kg/day)', () => {
      const fixture = createImpactFixture({
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 0.35,
        diversion_proportion: 0.60,
        accessibility_demand_kg_per_day: 0,
      });

      expect(fixture.results.net_additional_network_demand_kg_per_day).toBeCloseTo(700.0, 2);
    });

    it('accounts for accessibility-generated demand when provided', () => {
      const fixture = createImpactFixture({
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 0.35, // 1750
        diversion_proportion: 0.50,
        accessibility_demand_kg_per_day: 250, // total proposed = 2000
      });

      expect(fixture.results.proposed_station_demand_kg_per_day).toBeCloseTo(2000.0, 2);
      expect(fixture.results.estimated_diverted_demand_kg_per_day).toBeCloseTo(1000.0, 2);
      expect(fixture.results.net_additional_network_demand_kg_per_day).toBeCloseTo(1000.0, 2);
    });
  });

  /* AT-I04: Input Validation Defense */
  describe('AT-I04: Validation Defense', () => {
    it('rejects capture_proportion > 1.0', () => {
      const error = validateSimulatorRequest({
        proposed_latitude: 23.05,
        proposed_longitude: 72.60,
        catchment_radius_km: 3.0,
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 1.5,
        diversion_proportion: 0.60,
      });

      expect(error).toContain('Capture proportion must be between 0.0 and 1.0');
    });

    it('rejects negative or zero catchment demand', () => {
      const error = validateSimulatorRequest({
        proposed_latitude: 23.05,
        proposed_longitude: 72.60,
        catchment_radius_km: 3.0,
        catchment_demand_kg_per_day: 0,
        capture_proportion: 0.35,
        diversion_proportion: 0.60,
      });

      expect(error).toContain('Assumed catchment demand must be greater than 0 kg/day');
    });

    it('rejects out-of-range catchment radius', () => {
      const error = validateSimulatorRequest({
        proposed_latitude: 23.05,
        proposed_longitude: 72.60,
        catchment_radius_km: 65.0,
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 0.35,
        diversion_proportion: 0.60,
      });

      expect(error).toContain('Catchment radius must be between 0.1 km and 50.0 km');
    });

    it('passes for contract benchmark parameters', () => {
      const error = validateSimulatorRequest({
        proposed_latitude: 23.05,
        proposed_longitude: 72.60,
        catchment_radius_km: 3.0,
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 0.35,
        diversion_proportion: 0.60,
        accessibility_demand_kg_per_day: 0,
      });

      expect(error).toBeNull();
    });
  });

  /* AT-I05: Geographic Analysis Unavailable Notice */
  describe('AT-I05: Geographic Disclosure', () => {
    it('displays spatial analysis unavailable badge and reason', () => {
      const fixture = createImpactFixture();
      render(<SimulatorGeographicDisclosure data={fixture} />);

      expect(screen.getByText('Nearby Station Spatial Allocation')).toBeInTheDocument();
      expect(screen.getByText('Unavailable (AT-I05)')).toBeInTheDocument();
      expect(screen.getByText(/No stations have independently verified coordinates/i)).toBeInTheDocument();
      expect(screen.getByText(/Why is station-by-station diversion withheld\?/i)).toBeInTheDocument();
    });

    it('displays scenario assumptions and decision boundaries warnings', () => {
      const fixture = createImpactFixture();
      render(<SimulatorGeographicDisclosure data={fixture} />);

      expect(screen.getByText(/Illustrative scenario calculation only/i)).toBeInTheDocument();
      expect(screen.getByText(/Results are not evidence-backed predictions/i)).toBeInTheDocument();
      expect(screen.getByText(/Decision-Support Notice/i)).toBeInTheDocument();
    });
  });

  /* AT-I06: Plain Language Formulas in UI */
  describe('AT-I06: Formula Explanations in UI', () => {
    it('displays all three canonical formulas with evaluated numbers', () => {
      const fixture = createImpactFixture();
      render(<SimulatorFormulasPanel data={fixture} />);

      expect(screen.getByText('1. Proposed Demand')).toBeInTheDocument();
      expect(screen.getByText('2. Diverted Demand')).toBeInTheDocument();
      expect(screen.getByText('3. Net Additional Demand')).toBeInTheDocument();

      expect(screen.getByText('(catchment_demand × capture) + accessibility_demand')).toBeInTheDocument();
      expect(screen.getByText('proposed_demand × diversion_proportion')).toBeInTheDocument();
      expect(screen.getByText('proposed_demand − diverted_demand')).toBeInTheDocument();

      // Evaluated values
      expect(screen.getByText(/\(5000 × 0.35\) \+ 0 = 1750.0 kg\/day/)).toBeInTheDocument();
      expect(screen.getByText(/1750.0 × 0.6 = 1050.0 kg\/day/)).toBeInTheDocument();
      expect(screen.getByText(/1750.0 − 1050.0 = 700.0 kg\/day/)).toBeInTheDocument();
    });
  });

  /* Component Unit Tests */
  describe('Simulator Results Cards', () => {
    it('renders animated cards with proposed, diverted, and net demand numbers', () => {
      const fixture = createImpactFixture();
      render(<SimulatorResultsCards data={fixture} />);

      expect(screen.getByText('Proposed Station Demand')).toBeInTheDocument();
      expect(screen.getByText('Diverted Customer Demand')).toBeInTheDocument();
      expect(screen.getByText('Net Additional Network Demand')).toBeInTheDocument();
      expect(screen.getByText(/Cannibalization 60%/i)).toBeInTheDocument();
      expect(screen.getByText(/Net Expansion 40%/i)).toBeInTheDocument();
    });
  });

  describe('Simulator Inputs Panel', () => {
    it('allows changing inputs and clicking presets', async () => {
      const user = userEvent.setup();
      let currentInputs: ImpactSimulatorRequest = {
        proposed_latitude: 23.05,
        proposed_longitude: 72.60,
        catchment_radius_km: 3.0,
        catchment_demand_kg_per_day: 5000,
        capture_proportion: 0.35,
        diversion_proportion: 0.60,
        accessibility_demand_kg_per_day: 0,
      };

      const handleChange = (newInputs: ImpactSimulatorRequest) => {
        currentInputs = newInputs;
      };

      const handleSubmit = vi.fn();
      const handleReset = vi.fn();

      render(
        <SimulatorInputsPanel
          inputs={currentInputs}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onReset={handleReset}
          isLoading={false}
        />
      );

      // Verify benchmark values in inputs
      expect(screen.getByLabelText('Catchment radius in km')).toHaveValue(3.0);
      expect(screen.getByLabelText('Assumed catchment demand in kg per day')).toHaveValue(5000);

      // Click preset
      const urbanPreset = screen.getByText('Urban High-Density Corridor');
      await user.click(urbanPreset);
      expect(currentInputs.catchment_demand_kg_per_day).toBe(8000);
      expect(currentInputs.capture_proportion).toBe(0.45);

      // Click submit
      const submitBtn = screen.getByText('Calculate Network Impact Scenario');
      await user.click(submitBtn);
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  /* Query Param Pre-fill & Full Page Integration */
  describe('Full Page Integration Flow', () => {
    it('pre-fills coordinates from URL search params (?lat=23.0350&lng=72.5280)', async () => {
      render(
        <MemoryRouter initialEntries={['/simulator?lat=23.0350&lng=72.5280']}>
          <FixtureProvider>
            <SimulatorPage />
          </FixtureProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('📍 Pre-filled from Map')).toBeInTheDocument();
      expect(screen.getByLabelText('Proposed latitude')).toHaveValue(23.035);
      expect(screen.getByLabelText('Proposed longitude')).toHaveValue(72.528);

      // Verify automatic simulation execution
      await waitFor(() => {
        expect(screen.getByText('Network Demand Impact Results')).toBeInTheDocument();
      });
    });

    it('renders complete Simulator page via App routing and executes simulation', async () => {
      const user = userEvent.setup();
      render(<App />);

      const simLinks = screen.getAllByText('Impact Simulator');
      await user.click(simLinks[0]);

      expect(screen.getAllByText('New-Station Impact Simulator').length).toBeGreaterThan(0);
      expect(screen.getByText('Signature Feature E')).toBeInTheDocument();
      expect(screen.getByText('Canonical Simulation Formulas')).toBeInTheDocument();

      // Wait for fixture calculation to populate
      await waitFor(() => {
        expect(screen.getByText('Network Demand Impact Results')).toBeInTheDocument();
        expect(screen.getByText('Demand Flow & Cannibalization Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Nearby Station Spatial Allocation')).toBeInTheDocument();
      });
    });
  });
  describe('Sensitivity Analysis Matrix & Network Totals (Defect 3.6)', () => {
    it('renders Before and After Network Totals comparison in results cards', () => {
      const fixture = createImpactFixture();
      render(<SimulatorResultsCards data={fixture} />);

      expect(screen.getByText(/Network Demand Totals: Baseline Before vs Scenario After/i)).toBeInTheDocument();
      expect(screen.getByText(/1. Current Network Baseline \(Before\)/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Net Incremental Gain/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Scenario Network Total \(After\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/14,081.2/).length).toBeGreaterThan(0);
    });

    it('renders Sensitivity Analysis Matrix with 12 combinations and supports selection', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const { SimulatorSensitivityTable } = await import('../components/simulator/SimulatorSensitivityTable');

      render(
        <SimulatorSensitivityTable
          catchmentDemand={5000}
          accessibilityDemand={0}
          currentCapture={0.35}
          currentDiversion={0.60}
          onSelectScenario={onSelect}
        />
      );

      expect(screen.getByText(/Sensitivity Analysis Matrix \(Capture vs Diversion\)/i)).toBeInTheDocument();
      expect(screen.getByText(/81% Capture/i)).toBeInTheDocument();
      expect(screen.getByText(/40% Diversion/i)).toBeInTheDocument();
      expect(screen.getByText(/60% Diversion/i)).toBeInTheDocument();
      expect(screen.getByText(/80% Diversion/i)).toBeInTheDocument();

      // Click on benchmark cell (81% cap, 60% div -> +1,620 kg/d)
      const benchmarkCell = screen.getByText(/\+1,620 kg\/d/i);
      expect(benchmarkCell).toBeInTheDocument();
      await user.click(benchmarkCell);

      expect(onSelect).toHaveBeenCalledWith(0.81, 0.60);
    });
  });

});
