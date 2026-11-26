import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverviewKPIs } from '../components/dashboard/OverviewKPIs';
import { StationInventoryTable } from '../components/dashboard/StationInventoryTable';
import { ForecastSummaryCard } from '../components/dashboard/ForecastSummaryCard';
import { DataQualityFlagsBanner } from '../components/dashboard/DataQualityFlagsBanner';
import { OVERVIEW_FIXTURE } from '../fixtures/overviewFixture';
import { STATIONS_FIXTURE } from '../fixtures/stationsFixture';

import { MemoryRouter } from 'react-router-dom';

describe('Milestone 2 Operations Dashboard & Data Quality Components', () => {
  describe('OverviewKPIs', () => {
    it('renders all 4 contract KPI values with semantic badges', () => {
      render(<OverviewKPIs data={OVERVIEW_FIXTURE} isLoading={false} />);

      // KPI 1: Station inventory
      expect(screen.getByText('Station Inventory')).toBeInTheDocument();
      expect(screen.getAllByText('151').length).toBeGreaterThan(0);
      expect(screen.getByText('Active')).toBeInTheDocument();

      // KPI 2: Map verified pins (151)
      expect(screen.getByText('Map Verified Pins')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();

      // KPI 3: Mean daily demand
      expect(screen.getByText('Network Mean Daily Total (151 stations)')).toBeInTheDocument();
      expect(screen.getByText('1,98,450.0')).toBeInTheDocument();
      expect(screen.getByText('Baseline')).toBeInTheDocument();

      // KPI 4: Supply shortfall station-days
      expect(screen.getByText('Constrained-Supply Planning Days')).toBeInTheDocument();
      expect(screen.getByText('18,244')).toBeInTheDocument();
      expect(screen.getByText('Shortfall')).toBeInTheDocument();
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
      expect(screen.getByText(/Latitude \/ Longitude: 23\.1157, 72\.5878/i)).toBeInTheDocument();
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

      expect(screen.getByText('Data Provenance & Verification Audit')).toBeInTheDocument();
      expect(screen.getByText('11 Verified (Study Area)')).toBeInTheDocument();
      expect(screen.getByText('Calibrated Baseline Model')).toBeInTheDocument();
      expect(screen.getByText('Modeled Baseline Schedule')).toBeInTheDocument();
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
      expect(screen.getByText('151 Stations')).toBeInTheDocument();
    });
  });
});
