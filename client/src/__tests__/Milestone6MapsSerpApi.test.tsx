import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LocationAutocomplete } from '../components/map/LocationAutocomplete';
import { MapSearchBar } from '../components/map/MapSearchBar';
import { StationDetailsSheet } from '../components/map/StationDetailsSheet';
import { DirectionsPanel } from '../components/map/DirectionsPanel';
import { DiscoveredStation, DirectionsResponse } from '../types/maps';
import * as mapsApi from '../api/maps';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Milestone 6 SerpApi Google Maps Integrations', () => {
  describe('LocationAutocomplete', () => {
    it('queries autocomplete API and distinguishes selectable places from keywords', async () => {
      const user = userEvent.setup();
      const mockSelect = vi.fn();

      vi.spyOn(mapsApi, 'autocompleteLocations').mockResolvedValue({
        query: 'Navrang',
        cached: false,
        suggestions: [
          {
            title: 'Navrangpura, Ahmedabad',
            subtitle: 'Gujarat, India',
            suggestion_type: 'place',
            latitude: 23.036,
            longitude: 72.561,
            is_selectable_place: true,
          },
          {
            title: 'navrangpura cng pump',
            suggestion_type: 'keyword',
            is_selectable_place: false,
          },
        ],
      });

      render(
        <LocationAutocomplete
          onSelectLocation={mockSelect}
          centerLat={23.0225}
          centerLng={72.5714}
        />
      );

      const input = screen.getByPlaceholderText(/Search place, locality, or address in Ahmedabad/i);
      await user.type(input, 'Navrang');

      await waitFor(() => {
        expect(screen.getByText('Navrangpura, Ahmedabad')).toBeInTheDocument();
        expect(screen.getByText('Keyword')).toBeInTheDocument();
      });

      // Click selectable place
      const placeItem = screen.getByText('Navrangpura, Ahmedabad');
      await user.click(placeItem);

      expect(mockSelect).toHaveBeenCalledWith({
        lat: 23.036,
        lng: 72.561,
        label: 'Navrangpura, Ahmedabad',
      });
    });
  });

  describe('MapSearchBar', () => {
    it('handles query submission and toggles layer filters', async () => {
      const user = userEvent.setup();
      const handleSearch = vi.fn();
      const handleFilterChange = vi.fn();

      render(
        <MapSearchBar
          onSearch={handleSearch}
          isLoading={false}
          activeFilter="all"
          onFilterChange={handleFilterChange}
          discoveredCount={15}
          verifiedCount={0}
          lastQuery="CNG pump in Ahmedabad"
          isCached={true}
        />
      );

      expect(screen.getByText('All Stations (15)')).toBeInTheDocument();
      expect(screen.getByText('Discovered Candidates (15)')).toBeInTheDocument();
      expect(screen.getByText('Approved Network (0)')).toBeInTheDocument();
      expect(screen.getByText('Cached')).toBeInTheDocument();

      // Switch to discovered filter
      const discBtn = screen.getByText(/Discovered Candidates/i);
      await user.click(discBtn);
      expect(handleFilterChange).toHaveBeenCalledWith('discovered');

      // Submit new search
      const input = screen.getByPlaceholderText(/Search CNG filling stations in Ahmedabad/i);
      await user.type(input, 'Adani CNG');
      const submitBtn = screen.getByText('Discover CNG Stations');
      await user.click(submitBtn);

      expect(handleSearch).toHaveBeenCalledWith('Adani CNG');
    });
  });

  describe('StationDetailsSheet', () => {
    const mockStation: DiscoveredStation = {
      id: 'serpapi_test_1',
      station_id: 'serpapi_test_1',
      station_name: 'Adani CNG Pump Vastrapur',
      address: 'Near Vastrapur Lake, Ahmedabad',
      latitude: 23.035,
      longitude: 72.528,
      verification_status: 'unverified_candidate',
      data_source: 'serpapi_google_maps',
      rating: 4.4,
      reviews_count: 210,
      open_state: 'Open 24 hours',
      place_id: 'ChIJ_vastrapur_cng',
      is_within_study_area: true,
      discovered_at: '2026-11-03T12:00:00Z',
    };

    it('renders station metadata, quarantine policy, and triggers routing callback', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleRoute = vi.fn();

      vi.spyOn(mapsApi, 'getPlaceDetails').mockResolvedValue({
        title: 'Adani CNG Pump Vastrapur',
        rating: 4.4,
        reviews_count: 210,
        address: 'Near Vastrapur Lake, Ahmedabad',
        phone: '+91 79 1234 5678',
        open_state: 'Open 24 hours',
        hours: [{ day: 'Monday', hours: 'Open 24 hours' }],
        reviews: [
          {
            author: 'Kiran Shah',
            rating: 5,
            snippet: 'Clean station, quick filling.',
          },
        ],
      });

      render(
        <MemoryRouter>
          <StationDetailsSheet
            station={mockStation}
            onClose={handleClose}
            onCalculateRoute={handleRoute}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Adani CNG Pump Vastrapur')).toBeInTheDocument();
      expect(screen.getByText(/Quarantine Data Policy:/i)).toBeInTheDocument();
      expect(screen.getByText('Discovered Candidate')).toBeInTheDocument();

      // Trigger routing
      const routeBtn = screen.getByText('Calculate Road Directions from Candidate');
      await user.click(routeBtn);

      expect(handleRoute).toHaveBeenCalledWith({
        lat: 23.035,
        lng: 72.528,
        label: 'Adani CNG Pump Vastrapur',
      });

      // Trigger simulation navigation
      const simBtn = screen.getByText('Simulate Impact for this Location');
      await user.click(simBtn);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/simulator?lat=23.035&lng=72.528')
      );
    });
  });

  describe('DirectionsPanel', () => {
    const mockDirections: DirectionsResponse = {
      origin: { latitude: 23.05, longitude: 72.6 },
      destination: { latitude: 23.035, longitude: 72.528 },
      straight_line_distance_km: 7.5,
      road_distance_km: 10.2,
      detour_ratio: 1.36,
      primary_duration_text: '22 min',
      primary_duration_mins: 22,
      cached: false,
      routes: [
        {
          route_id: 1,
          summary: 'via 132 Feet Ring Rd',
          distance_km: 10.2,
          distance_text: '10.2 km',
          duration_mins: 22,
          duration_text: '22 min',
          steps: [
            {
              instruction: 'Head south on 132 Feet Ring Rd',
              distance: '4.5 km',
              duration: '8 min',
            },
            {
              instruction: 'Turn right towards Vastrapur',
              distance: '5.7 km',
              duration: '14 min',
            },
          ],
          polyline_coords: [
            [23.05, 72.6],
            [23.04, 72.56],
            [23.035, 72.528],
          ],
        },
      ],
    };

    it('displays comparative metrics: road distance, straight line, drive time, detour ratio and steps', async () => {
      const user = userEvent.setup();
      const handleClear = vi.fn();
      const handleSelectRoute = vi.fn();

      render(
        <DirectionsPanel
          directions={mockDirections}
          onClear={handleClear}
          selectedRouteIndex={0}
          onSelectRouteIndex={handleSelectRoute}
          originLabel="Visat Candidate"
          destinationLabel="Adani Vastrapur"
        />
      );

      expect(screen.getByText('Road Accessibility & Routing Analysis')).toBeInTheDocument();
      expect(screen.getByText('10.2 km')).toBeInTheDocument();
      expect(screen.getByText('7.5 km')).toBeInTheDocument();
      expect(screen.getByText('22 min')).toBeInTheDocument();
      expect(screen.getAllByText('1.36×').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/36% longer/i)).toBeInTheDocument();

      // Expand navigation steps
      const stepsToggle = screen.getByText(/Turn-by-Turn Navigation Directions/i);
      await user.click(stepsToggle);

      expect(screen.getByText('Head south on 132 Feet Ring Rd')).toBeInTheDocument();
      expect(screen.getByText('Turn right towards Vastrapur')).toBeInTheDocument();

      // Clear button
      const clearBtn = screen.getByTitle('Clear routing analysis');
      await user.click(clearBtn);
      expect(handleClear).toHaveBeenCalled();
    });
  });
});
