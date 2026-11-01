import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ZeroCoordinatesBanner } from '../components/map/ZeroCoordinatesBanner';
import { ProposedLocationPanel } from '../components/map/ProposedLocationPanel';
import { NearbyStationsPanel } from '../components/map/NearbyStationsPanel';
import { MapStationSidebar } from '../components/map/MapStationSidebar';
import { MapLegend } from '../components/map/MapLegend';
import { StationMap } from '../components/map/StationMap';
import { MapPage } from '../pages/MapPage';
import { FixtureProvider } from '../context/FixtureContext';
import { STATIONS_FIXTURE } from '../fixtures/stationsFixture';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Milestone 4 Ahmedabad Map & Candidate-Location Exploration', () => {
  describe('ZeroCoordinatesBanner', () => {
    it('displays honest unavailable status, 0 verified pins, and data governance rationale', () => {
      render(
        <MemoryRouter>
          <ZeroCoordinatesBanner
            mapAvailability={STATIONS_FIXTURE.map_availability}
            totalStations={12}
            eligiblePins={0}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Production Station Pins Unavailable')).toBeInTheDocument();
      expect(screen.getByText('0 Verified Pins')).toBeInTheDocument();
      expect(screen.getByText('12 Directory Records')).toBeInTheDocument();
      expect(
        screen.getByText(/All 8 coordinate candidates are unapproved/i)
      ).toBeInTheDocument();
      expect(screen.getByText('View GAP-001 in Ledger')).toBeInTheDocument();
    });

    it('navigates to data quality page when clicking GAP-001 link', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <ZeroCoordinatesBanner
            mapAvailability={STATIONS_FIXTURE.map_availability}
            totalStations={12}
            eligiblePins={0}
          />
        </MemoryRouter>
      );

      const linkBtn = screen.getByText('View GAP-001 in Ledger');
      await user.click(linkBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/data-quality');
    });
  });

  describe('MapLegend', () => {
    it('renders all 3 map symbology items with data origins', () => {
      render(<MapLegend />);

      expect(screen.getByText('Map Symbology Legend')).toBeInTheDocument();
      expect(screen.getByText('Proposed Candidate')).toBeInTheDocument();
      expect(screen.getByText('user_entered_scenario')).toBeInTheDocument();
      expect(screen.getByText('Verified Pin (0 Plotted)')).toBeInTheDocument();
      expect(screen.getByText('Unapproved Leads')).toBeInTheDocument();
      expect(screen.getByText('Excluded from Map')).toBeInTheDocument();
    });
  });

  describe('NearbyStationsPanel', () => {
    it('displays service unavailable status and explains that nearby-station analysis cannot be performed without verified coordinates', () => {
      render(<NearbyStationsPanel proposedCoords={{ lat: 23.05, lng: 72.6 }} />);

      expect(screen.getByText('Nearby Station Distance Analysis')).toBeInTheDocument();
      expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/nearby station analysis is permanently unavailable for this data package release/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Calculating straight-line \(Haversine\) distances or network diversion against unverified secondary leads is strictly prohibited/i)
      ).toBeInTheDocument();
      expect(screen.getByText('23.0500°N, 72.6000°E')).toBeInTheDocument();
    });
  });

  describe('ProposedLocationPanel', () => {
    it('validates study area bounds and detects out-of-study-area coordinates', () => {
      const handleSetCoords = vi.fn();
      render(
        <MemoryRouter>
          <ProposedLocationPanel
            proposedCoords={{ lat: 23.05, lng: 72.6 }}
            onSetCoords={handleSetCoords}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Proposed Candidate Location')).toBeInTheDocument();
      expect(
        screen.getByText(/Coordinates fall within the provisional coordinate envelope/i)
      ).toBeInTheDocument();

      // Enter out-of-bounds latitude
      const latInput = screen.getByLabelText('Proposed station latitude');
      fireEvent.change(latInput, { target: { value: '25.5000' } });

      expect(screen.getByText(/Out-of-Study-Area Notice:/i)).toBeInTheDocument();
    });

    it('supports quick preset selection and dispatches coordinates', async () => {
      const user = userEvent.setup();
      const handleSetCoords = vi.fn();
      render(
        <MemoryRouter>
          <ProposedLocationPanel
            proposedCoords={null}
            onSetCoords={handleSetCoords}
          />
        </MemoryRouter>
      );

      const vastrapurPreset = screen.getByText(/Vastrapur \(23.0350, 72.5280\)/i);
      await user.click(vastrapurPreset);

      expect(handleSetCoords).toHaveBeenCalledWith({
        lat: 23.035,
        lng: 72.528,
      });
    });

    it('navigates to Impact Simulator with coordinates upon click', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <ProposedLocationPanel
            proposedCoords={{ lat: 23.05, lng: 72.6 }}
            onSetCoords={vi.fn()}
          />
        </MemoryRouter>
      );

      const sendBtn = screen.getByRole('button', { name: /Send to Simulator/i });
      await user.click(sendBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/simulator?lat=23.0500&lng=72.6000');
    });
  });

  describe('MapStationSidebar', () => {
    it('renders all 12 directory stations with Coordinates NULL and pin excluded badges', () => {
      render(
        <MapStationSidebar
          stations={STATIONS_FIXTURE.stations}
          isLoading={false}
          selectedStation={null}
          onSelectStation={vi.fn()}
        />
      );

      expect(screen.getByText('Station Inventory Register')).toBeInTheDocument();
      expect(screen.getByText('12 Directory Records')).toBeInTheDocument();
      expect(screen.getAllByText('Coordinates: NULL').length).toBe(12);
      expect(screen.getAllByText('Pin Excluded').length).toBe(12);
      expect(screen.getByText('Visat Automobile')).toBeInTheDocument();
    });

    it('filters stations by search and study area status', async () => {
      const user = userEvent.setup();
      render(
        <MapStationSidebar
          stations={STATIONS_FIXTURE.stations}
          isLoading={false}
          selectedStation={null}
          onSelectStation={vi.fn()}
        />
      );

      // Filter by uncertain
      await user.click(screen.getByRole('button', { name: /Uncertain \(1\)/i }));
      expect(screen.getByText('Kanha Petroleum')).toBeInTheDocument();
      expect(screen.queryByText('Visat Automobile')).not.toBeInTheDocument();

      // Search input
      const searchInput = screen.getByLabelText('Search map directory stations');
      await user.type(searchInput, 'HP Auto Care');
      // Kanha won't match
      expect(screen.queryByText('Kanha Petroleum')).not.toBeInTheDocument();
    });
  });

  describe('StationMap Component', () => {
    it('renders Leaflet container and complies with zero verified pins rule', () => {
      const { container } = render(
        <StationMap
          stations={STATIONS_FIXTURE.stations}
          proposedCoords={{ lat: 23.05, lng: 72.6 }}
          onSelectProposedLocation={vi.fn()}
          selectedStation={null}
        />
      );

      // Verify Leaflet container mounted
      expect(container.querySelector('.leaflet-container')).toBeInTheDocument();

      // Verify OSM attribution present
      expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();

      // In current dataset (0 verified), exactly 0 verified pins must be rendered
      const verifiedPins = container.querySelectorAll('.custom-verified-pin');
      expect(verifiedPins.length).toBe(0);

      // 1 proposed candidate pin should be rendered
      const proposedPins = container.querySelectorAll('.custom-proposed-pin');
      expect(proposedPins.length).toBe(1);
    });
  });

  describe('Full Page Integration Flow (MapPage)', () => {
    it('renders MapPage with dev fixtures enabled and maintains navigation assertions', () => {
      localStorage.setItem('cng_smartplan_use_fixtures', 'true');

      render(
        <MemoryRouter>
          <FixtureProvider>
            <MapPage />
          </FixtureProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Ahmedabad CNG Network Map')).toBeInTheDocument();
      expect(screen.getByText('Dev Fixtures Active')).toBeInTheDocument();
      expect(screen.getByText('Production Station Pins Unavailable')).toBeInTheDocument();
      expect(screen.getByText('0 Verified Pins')).toBeInTheDocument();
      expect(screen.getByText('Proposed Candidate Location')).toBeInTheDocument();
      expect(screen.getByText('Nearby Station Distance Analysis')).toBeInTheDocument();
    });
  });
});
