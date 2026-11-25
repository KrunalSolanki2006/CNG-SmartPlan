import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CandidateEvaluationSection } from '../components/evaluation/CandidateEvaluationSection';
import { ExistingStationMapSection } from '../components/map/ExistingStationMapSection';
import { ProposedEvaluationProvider } from '../context/ProposedEvaluationContext';
import {
  GujaratStationModel,
  NearbyStationsResponse,
} from '../types/candidates';
import * as mapsApi from '../api/maps';
import * as candidatesApi from '../api/candidates';

let capturedMapClickHandler: ((e: { latlng: { lat: number; lng: number } }) => void) | null = null;

vi.mock('react-leaflet', async () => {
  return {
    MapContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-leaflet-map">{children}</div>
    ),
    TileLayer: () => null,
    Marker: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-leaflet-marker">{children}</div>
    ),
    Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Circle: ({ radius }: { radius: number }) => (
      <div data-testid="mock-leaflet-circle" data-radius={radius} />
    ),
    useMap: () => ({
      flyTo: vi.fn(),
      setView: vi.fn(),
    }),
    useMapEvents: (handlers: { click?: (e: { latlng: { lat: number; lng: number } }) => void }) => {
      capturedMapClickHandler = handlers.click || null;
      return null;
    },
  };
});

const mockStations: GujaratStationModel[] = [
  {
    station_id: 'AMD001',
    station_name: 'Visat Automobile',
    operator: 'Gujarat Gas Limited',
    brand: 'Gujarat Gas',
    address: 'Visat Cross Roads, Chandkheda, Ahmedabad',
    locality: 'Chandkheda',
    city: 'Ahmedabad',
    district: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380005',
    latitude: 23.1157,
    longitude: 72.5878,
    place_id: 'place_amd001',
    rating: 4.2,
    reviews_count: 482,
    verification_status: 'Verified Operating CNG',
    cng_dispensing_confirmed: true,
    data_source: 'official_cgd_directory',
    source_url: null,
    retrieved_at: '2026-10-29T10:00:00Z',
    last_verified_at: '2026-11-03T18:00:00Z',
    notes: 'Verified station',
    cng_classification: 'VERIFIED_OPERATING_CNG',
  },
  {
    station_id: 'POT001',
    station_name: 'Unverified Potential Petrol Pump',
    operator: 'Unknown',
    brand: 'Unknown',
    address: 'Unverified Lead',
    locality: 'Vastrapur',
    city: 'Ahmedabad',
    district: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    latitude: 23.035,
    longitude: 72.528,
    place_id: null,
    rating: null,
    reviews_count: null,
    verification_status: 'Potential CNG',
    cng_dispensing_confirmed: false,
    data_source: 'serpapi_google_maps',
    source_url: null,
    retrieved_at: '2026-11-01T10:00:00Z',
    last_verified_at: null,
    notes: 'Unverified',
    cng_classification: 'POTENTIAL_CNG',
  },
];

const mockNearby5km: NearbyStationsResponse = {
  proposed_location: {
    name: 'Vastrapur Proposed Outlet',
    location_label: 'Vastrapur',
    latitude: 23.035,
    longitude: 72.528,
    in_gujarat_bounds: true,
  },
  radius_km: 5,
  total_verified_stations_checked: 151,
  nearby_count: 1,
  nearby_stations: [
    {
      station_id: 'AMD004',
      station_name: 'Adani CNG Vastrapur Verified',
      distance_km: 1.85,
      address: 'Drive In Rd, Ahmedabad',
      locality: 'Drive In Rd',
      city: 'Ahmedabad',
      district: 'Ahmedabad',
      operator: 'Adani Gas',
      brand: 'Adani Gas',
      latitude: 23.0447,
      longitude: 72.5428,
      is_verified: true,
      data_source: 'official_cgd_directory',
      demand_data_available: false,
    },
  ],
  nearest_station: {
    station_id: 'AMD004',
    station_name: 'Adani CNG Vastrapur Verified',
    distance_km: 1.85,
    address: 'Drive In Rd, Ahmedabad',
    locality: 'Drive In Rd',
    city: 'Ahmedabad',
    district: 'Ahmedabad',
    operator: 'Adani Gas',
    brand: 'Adani Gas',
    latitude: 23.0447,
    longitude: 72.5428,
    is_verified: true,
    data_source: 'official_cgd_directory',
    demand_data_available: false,
  },
  farthest_nearby_station: {
    station_id: 'AMD004',
    station_name: 'Adani CNG Vastrapur Verified',
    distance_km: 1.85,
    address: 'Drive In Rd, Ahmedabad',
    locality: 'Drive In Rd',
    city: 'Ahmedabad',
    district: 'Ahmedabad',
    operator: 'Adani Gas',
    brand: 'Adani Gas',
    latitude: 23.0447,
    longitude: 72.5428,
    is_verified: true,
    data_source: 'official_cgd_directory',
    demand_data_available: false,
  },
  nearest_overall_station: {
    station_id: 'AMD004',
    station_name: 'Adani CNG Vastrapur Verified',
    distance_km: 1.85,
    address: 'Drive In Rd, Ahmedabad',
    locality: 'Drive In Rd',
    city: 'Ahmedabad',
    district: 'Ahmedabad',
    operator: 'Adani Gas',
    brand: 'Adani Gas',
    latitude: 23.0447,
    longitude: 72.5428,
    is_verified: true,
    data_source: 'official_cgd_directory',
    demand_data_available: false,
  },
  distance_method: 'Haversine',
  data_integrity_note: 'Verified only',
};

const mockNearby1km: NearbyStationsResponse = {
  ...mockNearby5km,
  radius_km: 1,
  nearby_count: 0,
  nearby_stations: [],
  nearest_station: null,
  farthest_nearby_station: null,
};

describe('Candidate Evaluation & Gujarat Network Map Direct Simulate Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    capturedMapClickHandler = null;
  });

  it('Test 1, 3, 4: Autocomplete -> Create Proposed Station -> Nearby Analysis -> Direct Simulate navigates to Simulator', async () => {
    const user = userEvent.setup();

    vi.spyOn(mapsApi, 'autocompleteLocations').mockResolvedValue({
      query: 'Vastrapur',
      cached: false,
      suggestions: [
        {
          title: 'Vastrapur',
          subtitle: 'Ahmedabad, Gujarat 380015',
          suggestion_type: 'place',
          latitude: 23.035,
          longitude: 72.528,
          is_selectable_place: true,
        },
      ],
    });

    const createSpy = vi.spyOn(candidatesApi, 'createCandidate').mockResolvedValue({
      candidate_id: 'GUJ_CAN_019',
      name: 'Vastrapur Proposed Outlet',
      city: 'Ahmedabad',
      district: 'Ahmedabad',
      category: 'urban_commercial',
      address: 'Vastrapur',
      latitude: 23.035,
      longitude: 72.528,
      highway_corridor: 'Urban Arterial',
      road_type: 'State Highway',
      aadt_commercial_traffic: null,
      industrial_density_index: null,
      service_gap_radius_km: null,
      pipeline_proximity_meters: 500,
      data_completeness_pct: 75,
      missing_criteria: ['demand'],
      verification_status: 'proposed_candidate',
      source_reference: 'User Proposal',
      source_type: 'user_interactive_proposal',
      rationale: 'Proposed',
    });

    const nearbySpy = vi
      .spyOn(candidatesApi, 'fetchNearbyVerifiedStations')
      .mockImplementation(async ({ radius_km }) =>
        radius_km === 1 ? mockNearby1km : mockNearby5km
      );

    render(
      <MemoryRouter initialEntries={['/map?section=candidates']}>
        <ProposedEvaluationProvider>
          <Routes>
            <Route
              path="/map"
              element={<CandidateEvaluationSection stations={mockStations} />}
            />
            <Route
              path="/simulator"
              element={<div data-testid="simulator-destination">Navigated to Impact Simulator</div>}
            />
          </Routes>
        </ProposedEvaluationProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('mock-leaflet-marker')).toHaveLength(1);

    const searchInput = screen.getByPlaceholderText('Search proposed station location');
    await user.type(searchInput, 'Vastrapur');

    await waitFor(() => {
      expect(screen.getByText('Vastrapur')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Vastrapur'));

    expect(screen.getByLabelText('Latitude')).toHaveValue('23.03500');
    expect(screen.getByLabelText('Longitude')).toHaveValue('72.52800');

    const nameInput = screen.getByLabelText(/Proposed Station Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Vastrapur Proposed Outlet');
    await user.type(screen.getByLabelText(/Expected Daily Capacity/i), '4000');

    await user.click(screen.getByRole('button', { name: /Create Proposed Station/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Vastrapur Proposed Outlet',
          latitude: 23.035,
          longitude: 72.528,
          expected_daily_capacity_kg: 4000,
        })
      );
      expect(nearbySpy).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 23.035, lng: 72.528, radius_km: 5 })
      );
    });

    expect(await screen.findByText('Adani CNG Vastrapur Verified')).toBeInTheDocument();
    expect(screen.getByText('1.85 km')).toBeInTheDocument();

    // Radius change updates nearby stations
    await user.click(screen.getByRole('button', { name: '1 km' }));
    await waitFor(() => {
      expect(screen.getByText(/No verified stations within 1 km/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '5 km' }));
    await user.click(screen.getByRole('button', { name: /Direct Simulate/i }));

    expect(await screen.findByTestId('simulator-destination')).toBeInTheDocument();
  });

  it('Test 2: Drop Pin on Map places and repositions proposed marker', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProposedEvaluationProvider>
          <CandidateEvaluationSection stations={mockStations} />
        </ProposedEvaluationProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /Drop Pin on Map/i }));
    expect(capturedMapClickHandler).not.toBeNull();

    act(() => {
      capturedMapClickHandler?.({ latlng: { lat: 22.3039, lng: 70.8022 } });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Latitude')).toHaveValue('22.30390');
      expect(screen.getByLabelText('Longitude')).toHaveValue('70.80220');
    });

    await user.click(screen.getByRole('button', { name: /Click Map to Reposition Pin/i }));
    act(() => {
      capturedMapClickHandler?.({ latlng: { lat: 21.1702, lng: 72.8311 } });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Latitude')).toHaveValue('21.17020');
      expect(screen.getByLabelText('Longitude')).toHaveValue('72.83110');
    });
  });

  it('Test 5: Gujarat-Wide Network Map Evaluate New Station -> Direct Simulate navigates to Simulator', async () => {
    const user = userEvent.setup();
    const nearbySpy = vi
      .spyOn(candidatesApi, 'fetchNearbyVerifiedStations')
      .mockResolvedValue(mockNearby5km);

    render(
      <MemoryRouter initialEntries={['/map']}>
        <ProposedEvaluationProvider>
          <Routes>
            <Route
              path="/map"
              element={
                <ExistingStationMapSection
                  stations={mockStations}
                  selectedStation={null}
                  onSelectStation={vi.fn()}
                  availableCities={['Ahmedabad']}
                  availableDistricts={['Ahmedabad']}
                />
              }
            />
            <Route
              path="/simulator"
              element={<div data-testid="simulator-destination">Navigated to Impact Simulator</div>}
            />
          </Routes>
        </ProposedEvaluationProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /Evaluate New Station/i }));
    expect(await screen.findByText('Click Map to Place Pin')).toBeInTheDocument();

    await act(async () => {
      await capturedMapClickHandler?.({ latlng: { lat: 23.035, lng: 72.528 } });
    });

    await waitFor(() => {
      expect(nearbySpy).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 23.035, lng: 72.528, radius_km: 5 })
      );
      expect(screen.getByText('New Station Network Evaluation')).toBeInTheDocument();
      expect(screen.getAllByText('Adani CNG Vastrapur Verified').length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: /Direct Simulate/i }));
    expect(await screen.findByTestId('simulator-destination')).toBeInTheDocument();
  });
});
