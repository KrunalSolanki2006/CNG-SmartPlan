import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProposedEvaluationProvider } from '../context/ProposedEvaluationContext';
import { FixtureProvider } from '../context/FixtureContext';
import { ExistingStationMapSection } from '../components/map/ExistingStationMapSection';
import { SimulatorPage } from '../pages/SimulatorPage';
import {
  GujaratNetworkStationsResponse,
  GujaratStationModel,
  NearbyStationsResponse,
  NetworkImpactSimulationResponse,
} from '../types/candidates';
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

const verifiedStationsFixture: GujaratStationModel[] = [
  {
    station_id: 'AMD004',
    station_name: 'Adani CNG Vastrapur Verified',
    operator: 'Adani Gas',
    brand: 'Adani Gas',
    address: 'Drive In Rd, Ahmedabad',
    locality: 'Vastrapur',
    city: 'Ahmedabad',
    district: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    latitude: 23.0447,
    longitude: 72.5428,
    place_id: null,
    rating: 4.1,
    reviews_count: 100,
    verification_status: 'Verified Operating CNG',
    cng_dispensing_confirmed: true,
    data_source: 'official_cgd_directory',
    source_url: null,
    retrieved_at: '2026-10-29T10:00:00Z',
    last_verified_at: '2026-11-03T18:00:00Z',
    notes: 'Verified station',
    cng_classification: 'VERIFIED_OPERATING_CNG',
  },
];

const networkStationsResp: GujaratNetworkStationsResponse = {
  total_stations: 1,
  verified_count: 1,
  discovered_count: 0,
  requires_review_count: 0,
  verified_operating_count: 1,
  stations: verifiedStationsFixture,
  available_cities: ['Ahmedabad'],
  available_districts: ['Ahmedabad'],
};

const nearbyVastrapur: NearbyStationsResponse = {
  proposed_location: {
    name: 'Vastrapur New Station',
    location_label: 'Vastrapur, Ahmedabad',
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
      locality: 'Vastrapur',
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
    locality: 'Vastrapur',
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
  farthest_nearby_station: null,
  nearest_overall_station: null,
  distance_method: 'Haversine',
  data_integrity_note: 'Verified only',
};

const simulationVastrapur: NetworkImpactSimulationResponse = {
  proposed_station: {
    name: 'Vastrapur New Station',
    location_label: 'Gujarat Map Pin (23.0350°N, 72.5280°E)',
    latitude: 23.035,
    longitude: 72.528,
    expected_daily_capacity_kg: 4500,
    in_gujarat_bounds: true,
  },
  radius_km: 5,
  candidate_id: null,
  overall_assessment: 'Moderate Geographical Overlap',
  assessment_summary: 'Moderate Geographical Overlap: 1 verified station operates within 5 km (nearest at 1.85 km).',
  geographical_metrics: {
    nearby_verified_count: 1,
    total_verified_stations_checked: 151,
    nearest_station: nearbyVastrapur.nearest_station,
    nearest_within_radius: nearbyVastrapur.nearest_station,
    farthest_nearby_station: nearbyVastrapur.nearest_station,
    average_nearby_distance_km: 1.85,
    coverage_improvement_level: 'Moderate',
    coverage_improvement_summary: 'Provides moderate local fill-in coverage.',
    overlap_level: 'Moderate',
    overlap_summary: '1 verified station within 5 km; nearest existing station is 1.85 km away.',
  },
  nearby_stations: nearbyVastrapur.nearby_stations,
  diversion_assessment: {
    status: 'Estimated (Scenario-Based)',
    available: true,
    spatial_overlap_risk: 'Moderate',
    explanation: 'Scenario-based diversion estimated across 1 nearby Ahmedabad station with synthetic historical baselines.',
    demand_data_origin: 'synthetic_demo',
    stations_with_demand_data: 1,
    stations_without_demand_data: 0,
  },
  station_impact_rows: [
    {
      station_id: 'AMD001',
      station_name: 'Adani CNG Vastrapur Verified',
      city: 'Ahmedabad',
      operator: 'Adani Total Gas',
      distance_km: 1.85,
      is_nearest: true,
      has_sales_data: true,
      sales_data_classification: 'Actual historical data',
      current_daily_sales_kg: 1531.3,
      forecasted_daily_demand_kg: 1607.9,
      estimated_diversion_share: 0.139,
      estimated_sales_loss_kg: 212.9,
      remaining_daily_sales_kg: 1318.4,
      reduction_pct: 13.9,
      loss_classification: 'Model-based estimate',
      capacity_available: false,
      daily_capacity_kg: null,
      status_label: 'VERIFIED',
    },
  ],
  demand_estimate: {
    available: true,
    status: 'Estimated (Scenario-Based)',
    data_origin: 'synthetic_demo',
    methodology: 'Distance-decay diversion & coverage-gap model using synthetic_daily_sales.csv.',
    nearest_station_name: 'Adani CNG Vastrapur Verified',
    nearest_station_distance_km: 1.85,
    nearby_with_sales_count: 1,
    nearby_total_count: 1,
    avg_nearby_daily_sales_kg: 1531.3,
    potential_daily_demand_kg: 327.0,
    potential_daily_sales_kg: 327.0,
    potential_monthly_sales_kg: 9810.0,
    diverted_from_nearby_kg: 212.9,
    incremental_coverage_gain_kg: 114.1,
    capacity_provided_kg: 4500,
    capacity_utilization_pct: 7.3,
    capacity_status: '7.3% of provided 4,500 kg/day capacity',
    demand_classification: 'Model-based estimate',
    sales_classification: 'Model-based estimate',
    assumptions: ['Maximum single-station diversion capped at 35% with quadratic decay.'],
    limitations: ['Baseline sales derived from synthetic Ahmedabad demo series.'],
    reason_unavailable: null,
  },
  network_sales_impact: {
    available: true,
    status: 'Calculated (Scenario-Based)',
    proposed_station_daily_sales_kg: 327.0,
    total_nearby_sales_loss_kg: 212.9,
    net_network_sales_change_kg: 114.1,
    network_sales_before_kg: 1531.3,
    network_sales_after_kg: 1645.4,
    existing_stations_sales_after_kg: 1318.4,
    net_network_impact_pct: 7.45,
    station_count_with_sales: 1,
    station_count_without_sales: 0,
    classification: 'Model-based estimate',
    note: 'Calculated across 1 nearby Ahmedabad station with synthetic sales baselines.',
    reason_unavailable: null,
  },
  beneficial_assessment: {
    outcome: 'Potentially Beneficial',
    confidence: 'Scenario-based',
    summary: 'Scenario analysis adds +114.1 kg/day (+7.45%) net network volume.',
    criteria_evaluated: ['Nearest verified spacing: 1.85 km'],
    missing_data_requirements: ['Live metered dispenser sales'],
    caveat: 'Scenario estimate only; not real metered revenue.',
  },
  metric_methodology_note: 'Distance-decay scenario model with Haversine spacing.',
  data_integrity_note: 'Proposed locations remain separate.',
  warnings: [],
};

const simulationKutchEmpty: NetworkImpactSimulationResponse = {
  proposed_station: {
    name: 'Kutch Remote Site',
    location_label: 'Gujarat Map Pin (23.9500°N, 69.5000°E)',
    latitude: 23.95,
    longitude: 69.5,
    expected_daily_capacity_kg: null,
    in_gujarat_bounds: true,
  },
  radius_km: 5,
  candidate_id: null,
  overall_assessment: 'Potential Coverage Gap',
  assessment_summary: 'Potential Coverage Gap: No verified CNG stations found within 5 km.',
  geographical_metrics: {
    nearby_verified_count: 0,
    total_verified_stations_checked: 151,
    nearest_station: {
      ...nearbyVastrapur.nearby_stations[0],
      station_name: 'Bhuj Verified Station',
      distance_km: 48.2,
    },
    nearest_within_radius: null,
    farthest_nearby_station: null,
    average_nearby_distance_km: null,
    coverage_improvement_level: 'High',
    coverage_improvement_summary: 'Extends coverage into an unserved area.',
    overlap_level: 'None',
    overlap_summary: '0 verified stations within 5 km.',
  },
  nearby_stations: [],
  diversion_assessment: {
    status: 'Insufficient Data',
    available: false,
    spatial_overlap_risk: 'None',
    explanation: 'Insufficient Data: Verified station-level sales volumes are unavailable across Gujarat.',
    demand_data_origin: 'none',
    stations_with_demand_data: 0,
    stations_without_demand_data: 0,
  },
  station_impact_rows: [],
  demand_estimate: {
    available: false,
    status: 'Insufficient Data',
    data_origin: 'none',
    methodology: 'No demand estimation attempted without baseline sales records.',
    nearest_station_name: 'Bhuj Verified Station',
    nearest_station_distance_km: 48.2,
    nearby_with_sales_count: 0,
    nearby_total_count: 0,
    avg_nearby_daily_sales_kg: null,
    potential_daily_demand_kg: null,
    potential_daily_sales_kg: null,
    potential_monthly_sales_kg: null,
    diverted_from_nearby_kg: null,
    incremental_coverage_gain_kg: null,
    capacity_provided_kg: null,
    capacity_utilization_pct: null,
    capacity_status: 'Unavailable (not provided)',
    demand_classification: 'Unavailable',
    sales_classification: 'Unavailable',
    assumptions: [],
    limitations: ['No baseline sales data available in Kutch.'],
    reason_unavailable: 'No verified stations exist within 5 km and no baseline demand data exists.',
  },
  network_sales_impact: {
    available: false,
    status: 'Insufficient Data',
    proposed_station_daily_sales_kg: null,
    total_nearby_sales_loss_kg: null,
    net_network_sales_change_kg: null,
    network_sales_before_kg: null,
    network_sales_after_kg: null,
    existing_stations_sales_after_kg: null,
    net_network_impact_pct: null,
    station_count_with_sales: 0,
    station_count_without_sales: 0,
    classification: 'Unavailable',
    note: 'Before vs After comparison requires baseline sales data.',
    reason_unavailable: 'Insufficient Data: no baseline station sales in Kutch.',
  },
  beneficial_assessment: {
    outcome: 'Inconclusive / Insufficient Data',
    confidence: 'Insufficient data',
    summary: 'Geographical coverage gap exists, but commercial demand cannot be verified.',
    criteria_evaluated: ['0 verified stations within 5 km'],
    missing_data_requirements: ['Corridor CNG sales history'],
    caveat: 'Geographical spacing alone does not guarantee commercial demand.',
  },
  metric_methodology_note: 'Geographical metrics only.',
  data_integrity_note: 'Proposed locations remain separate.',
  warnings: [],
};

describe('End-to-End Network Map -> Direct Simulate -> Impact Simulator Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    capturedMapClickHandler = null;
  });

  it('Tests 1–5: Network Map -> Add Proposed Station -> Direct Simulate -> Auto Simulation -> Back & Modify avoids stale results', async () => {
    const user = userEvent.setup();

    vi.spyOn(candidatesApi, 'fetchGujaratNetworkStations').mockResolvedValue(networkStationsResp);

    const nearbySpy = vi
      .spyOn(candidatesApi, 'fetchNearbyVerifiedStations')
      .mockImplementation(async ({ lat }) =>
        Math.abs(lat - 23.95) < 0.01
          ? { ...nearbyVastrapur, nearby_count: 0, nearby_stations: [] }
          : nearbyVastrapur
      );

    const simSpy = vi
      .spyOn(candidatesApi, 'simulateNetworkImpact')
      .mockImplementation(async ({ proposed_latitude }) =>
        Math.abs(proposed_latitude - 23.95) < 0.01
          ? simulationKutchEmpty
          : simulationVastrapur
      );

    render(
      <MemoryRouter initialEntries={['/map']}>
        <FixtureProvider>
          <ProposedEvaluationProvider>
            <Routes>
              <Route
                path="/map"
                element={
                  <ExistingStationMapSection
                    stations={verifiedStationsFixture}
                    selectedStation={null}
                    onSelectStation={vi.fn()}
                    availableCities={['Ahmedabad']}
                    availableDistricts={['Ahmedabad']}
                  />
                }
              />
              <Route path="/simulator" element={<SimulatorPage />} />
            </Routes>
          </ProposedEvaluationProvider>
        </FixtureProvider>
      </MemoryRouter>
    );

    // Test 1: Place proposed station on Network Map & enter details
    await user.click(screen.getByRole('button', { name: /Evaluate New Station/i }));
    await act(async () => {
      await capturedMapClickHandler?.({ latlng: { lat: 23.035, lng: 72.528 } });
    });

    const nameInput = await screen.findByLabelText(/Proposed Station Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Vastrapur New Station');
    await user.type(screen.getByLabelText(/Expected Daily Capacity/i), '4500');

    await user.click(screen.getByRole('button', { name: /Direct Simulate/i }));

    // Test 2 & 3: Navigates to Impact Simulator, transfers details, runs simulation automatically
    expect((await screen.findAllByText('Vastrapur New Station')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Proposed Station \(Not Operational\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('4,500 kg/day').length).toBeGreaterThan(0);
    expect(screen.getAllByText('23.03500°N, 72.52800°E').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(simSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          proposed_name: 'Vastrapur New Station',
          proposed_latitude: 23.035,
          proposed_longitude: 72.528,
          radius_km: 5,
          expected_daily_capacity_kg: 4500,
        }),
        expect.any(AbortSignal)
      );
    });

    // Test 4: All 6 Simulator Sections (Comparison, Demand Est., Nearby Impact, Network Impact, Final Assessment)
    expect(await screen.findByText('Existing vs Proposed Station Comparison')).toBeInTheDocument();
    expect(screen.getByText('New Station Demand & Sales Estimation')).toBeInTheDocument();
    expect(screen.getByText('Nearby Station Sales Impact')).toBeInTheDocument();
    expect(screen.getByText('Overall Network Impact & Before vs After Comparison')).toBeInTheDocument();
    expect(screen.getAllByText('Adani CNG Vastrapur Verified').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1.85 km').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-212.9 kg/d').length).toBeGreaterThan(0);
    expect(screen.getByTestId('beneficial-outcome-badge')).toHaveTextContent('Potentially Beneficial');
    expect(screen.getByText('Final Location Assessment')).toBeInTheDocument();
    expect(screen.getByText(/This site looks promising/i)).toBeInTheDocument();
    expect(screen.queryByText(/Model Assumptions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Data Limitations/i)).not.toBeInTheDocument();

    // Test 5: Return to Network Map, verify preserved pin, modify location, re-simulate without stale results
    await user.click(screen.getByRole('button', { name: /Back to Network Map/i }));
    expect(await screen.findByText('New Station Network Evaluation')).toBeInTheDocument();
    expect(screen.getByLabelText(/Proposed Station Name/i)).toHaveValue('Vastrapur New Station');

    // Modify proposed station location to remote Kutch coordinates
    await user.click(screen.getByRole('button', { name: /Move Pin/i }));
    await act(async () => {
      await capturedMapClickHandler?.({ latlng: { lat: 23.95, lng: 69.5 } });
    });

    const nameInput2 = screen.getByLabelText(/Proposed Station Name/i);
    await user.clear(nameInput2);
    await user.type(nameInput2, 'Kutch Remote Site');
    await user.clear(screen.getByLabelText(/Expected Daily Capacity/i));

    await user.click(screen.getByRole('button', { name: /Direct Simulate/i }));

    expect((await screen.findAllByText('Kutch Remote Site')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Potential Coverage Gap')).length).toBeGreaterThan(0);
    expect(screen.getByText(/No verified existing CNG stations found within 5 km/i)).toBeInTheDocument();
    expect(screen.getByText('0 Verified in 5 km')).toBeInTheDocument();
    expect(screen.getByTestId('beneficial-outcome-badge')).toHaveTextContent('Inconclusive / Insufficient Data');
    expect(screen.getAllByText('Bhuj Verified Station').length).toBeGreaterThan(0);
    expect(nearbySpy).toHaveBeenCalled();
  });

  it('Test 6a: Handles missing proposed station and invalid coordinates cleanly without fake results', async () => {
    render(
      <MemoryRouter initialEntries={['/simulator']}>
        <ProposedEvaluationProvider>
          <SimulatorPage />
        </ProposedEvaluationProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('No Proposed CNG Station Selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Network Map/i })).toBeInTheDocument();

    // Now test invalid coordinates via URL query params
    render(
      <MemoryRouter initialEntries={['/simulator?lat=999&lng=72.5']}>
        <ProposedEvaluationProvider>
          <SimulatorPage />
        </ProposedEvaluationProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Simulation Error')).toBeInTheDocument();
    expect(screen.getByText(/Invalid or missing coordinates/i)).toBeInTheDocument();
  });

  it('Test 6b: Handles API failure cleanly with Retry and Back actions', async () => {
    vi.spyOn(candidatesApi, 'fetchGujaratNetworkStations').mockResolvedValue(networkStationsResp);
    vi.spyOn(candidatesApi, 'fetchNearbyVerifiedStations').mockResolvedValue(nearbyVastrapur);
    vi.spyOn(candidatesApi, 'simulateNetworkImpact').mockRejectedValue(
      new Error('Backend simulation service unavailable')
    );

    render(
      <MemoryRouter initialEntries={['/simulator?lat=23.035&lng=72.528&radius=5']}>
        <ProposedEvaluationProvider>
          <SimulatorPage />
        </ProposedEvaluationProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Simulation Error')).toBeInTheDocument();
    expect(screen.getByText('Backend simulation service unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Simulation/i })).toBeInTheDocument();
  });
});
