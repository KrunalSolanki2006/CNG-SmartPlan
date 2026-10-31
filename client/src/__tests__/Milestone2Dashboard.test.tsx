import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverviewKPIs } from '../components/dashboard/OverviewKPIs';
import { StationInventoryTable } from '../components/dashboard/StationInventoryTable';
import { ForecastSummaryCard } from '../components/dashboard/ForecastSummaryCard';
import { DataQualityFlagsBanner } from '../components/dashboard/DataQualityFlagsBanner';
import { DataQualityPage } from '../pages/DataQualityPage';
import { OVERVIEW_FIXTURE } from '../fixtures/overviewFixture';
import { STATIONS_FIXTURE } from '../fixtures/stationsFixture';
import { FixtureProvider } from '../context/FixtureContext';

import { MemoryRouter } from 'react-router-dom';

describe('Milestone 2 Operations Dashboard & Data Quality Components', () => {
  describe('OverviewKPIs', () => {
    it('renders all 4 contract KPI values with semantic badges', () => {
      render(<OverviewKPIs data={OVERVIEW_FIXTURE} isLoading={false} />);

      // KPI 1: Station inventory
      expect(screen.getByText('Station Inventory')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/eligible for simulation/i)).toBeInTheDocument();

      // KPI 2: Map verified pins (0)
      expect(screen.getByText('Map Verified Pins')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 12 Mapped/i)).toBeInTheDocument();

      // KPI 3: Mean daily demand
      expect(screen.getByText('Mean Daily Demand')).toBeInTheDocument();
      expect(screen.getByText('14,081.2')).toBeInTheDocument();

      // KPI 4: Supply shortfall station-days
      expect(screen.getByText('Supply Shortfalls')).toBeInTheDocument();
      expect(screen.getByText('1,628')).toBeInTheDocument();
      expect(screen.getByText('Not Stockout')).toBeInTheDocument();
    });

    it('renders loading skeletons when isLoading is true', () => {
      const { container } = render(<OverviewKPIs data={null} isLoading={true} />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('StationInventoryTable', () => {
    it('renders directory records and supports filtering', async () => {
      const user = userEvent.setup();

      render(
        <StationInventoryTable
          data={STATIONS_FIXTURE}
          isLoading={false}
          error={null}
        />
      );

      // Verify stations rendered
      expect(screen.getByText('Visat Automobile')).toBeInTheDocument();
      expect(screen.getByText('AMD001')).toBeInTheDocument();

      // Test search filtering
      const searchInput = screen.getByLabelText('Search station directory');
      await user.type(searchInput, 'AMD004');

      expect(screen.getByText('Mahalakshmi Motor Service')).toBeInTheDocument();
      expect(screen.queryByText('Visat Automobile')).not.toBeInTheDocument();

      // Clear search
      await user.clear(searchInput);
      expect(screen.getByText('Visat Automobile')).toBeInTheDocument();

      // Test study area filter: uncertain
      const studyAreaSelect = screen.getByLabelText('Filter by study area status');
      await user.selectOptions(studyAreaSelect, 'uncertain');

      expect(screen.getByText('Kanha Petroleum')).toBeInTheDocument();
      expect(screen.queryByText('Visat Automobile')).not.toBeInTheDocument();
    });

    it('opens detailed inspection modal with null coordinate audit', async () => {
      const user = userEvent.setup();

      render(
        <StationInventoryTable
          data={STATIONS_FIXTURE}
          isLoading={false}
          error={null}
        />
      );

      const inspectBtns = screen.getAllByRole('button', { name: /View details for/i });
      await user.click(inspectBtns[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Latitude \/ Longitude: NULL/i)).toBeInTheDocument();
      expect(screen.getByText(/Eligible for Map Pin:/i)).toBeInTheDocument();
    });
  });

  describe('DataQualityFlagsBanner', () => {
    it('displays explicit integrity audit flags for coordinates, sales, supply, holidays', () => {
      render(
        <DataQualityFlagsBanner
          flags={OVERVIEW_FIXTURE.data_quality_flags}
          hourly={OVERVIEW_FIXTURE.hourly_summary}
        />
      );

      expect(screen.getByText('Live Data Provenance & Verification Audit')).toBeInTheDocument();
      expect(screen.getByText('False (0 Verified)')).toBeInTheDocument();
      expect(screen.getAllByText('False (100% Synthetic)').length).toBe(2);
      expect(screen.getByText('Blank (8,041 Unassigned)')).toBeInTheDocument();
      expect(screen.getByText(/AMD001, AMD004, AMD008/)).toBeInTheDocument();
    });
  });

  describe('ForecastSummaryCard', () => {
    it('displays horizon and stations forecasted', () => {
      render(
        <MemoryRouter>
          <ForecastSummaryCard summary={OVERVIEW_FIXTURE.forecast_summary} />
        </MemoryRouter>
      );
      expect(screen.getByText('7-Day Forecast Pipeline')).toBeInTheDocument();
      expect(screen.getByText('7 Days')).toBeInTheDocument();
      expect(screen.getByText('11 Stations')).toBeInTheDocument();
    });
  });

  describe('DataQualityPage', () => {
    it('renders technical validation vs real completeness distinction and 8 gaps', async () => {
      localStorage.setItem('cng_smartplan_use_fixtures', 'true');

      render(
        <FixtureProvider>
          <DataQualityPage />
        </FixtureProvider>
      );

      expect(screen.getAllByText('Data Quality & Provenance Ledger').length).toBeGreaterThan(0);
      expect(
        screen.getByText(/Technical Validation \(PASS\) vs\. Real-World Completeness \(INCOMPLETE\)/i)
      ).toBeInTheDocument();

      // Wait for async fixture load
      expect(await screen.findByText('150.55 kg/day')).toBeInTheDocument();
      expect(screen.getByText('189.69 kg/day')).toBeInTheDocument();
      expect(screen.getByText('11.41%')).toBeInTheDocument();

      // Check gaps table
      expect(screen.getByText('Documented Data Gaps Register')).toBeInTheDocument();
      expect(screen.getByText('Verified station coordinates')).toBeInTheDocument();
      expect(screen.getByText('Official holiday calendar 2024-2025')).toBeInTheDocument();

      // Check external links security
      const links = screen.getAllByRole('link');
      links.forEach((l) => {
        expect(l).toHaveAttribute('target', '_blank');
        expect(l).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });
});
