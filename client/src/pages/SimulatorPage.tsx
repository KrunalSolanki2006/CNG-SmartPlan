import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  AlertCircle,
  Compass,
  Layers,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import {
  GujaratStationModel,
  NearbyVerifiedStation,
  NetworkImpactSimulationResponse,
} from '../types/candidates';
import {
  fetchGujaratNetworkStations,
  fetchNearbyVerifiedStations,
  simulateNetworkImpact,
} from '../api/candidates';
import {
  ProposedStationEvaluationState,
  useProposedEvaluation,
} from '../context/ProposedEvaluationContext';
import { Spinner } from '../components/ui/Spinner';
import { SimulatorComparisonMap } from '../components/simulator/SimulatorComparisonMap';
import { SimulatorExistingVsProposedTable } from '../components/simulator/SimulatorExistingVsProposedTable';
import { SimulatorDemandEstimationCard } from '../components/simulator/SimulatorDemandEstimationCard';
import { SimulatorNearbySalesImpactTable } from '../components/simulator/SimulatorNearbySalesImpactTable';
import { SimulatorNetworkImpactSection } from '../components/simulator/SimulatorNetworkImpactSection';
import { SimulatorFinalAssessment } from '../components/simulator/SimulatorFinalAssessment';
import { MotionSection } from '../components/ui/MotionContainer';

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export const SimulatorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { proposedEvaluation, setProposedEvaluation } = useProposedEvaluation();

  const routeState = (location.state as { proposedEvaluation?: ProposedStationEvaluationState } | null)
    ?.proposedEvaluation;

  // Resolve the active proposed station from route state, context, or URL query params
  const activeProposal = useMemo<ProposedStationEvaluationState | null>(() => {
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');

    if (routeState) {
      return routeState;
    }

    if (latStr !== null && lngStr !== null) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const radius = radiusStr ? parseFloat(radiusStr) : 5;
      if (
        proposedEvaluation &&
        Math.abs(proposedEvaluation.latitude - lat) < 1e-4 &&
        Math.abs(proposedEvaluation.longitude - lng) < 1e-4
      ) {
        return proposedEvaluation;
      }
      return {
        proposed_name: 'Proposed New CNG Station',
        latitude: lat,
        longitude: lng,
        selected_location: isValidCoordinate(lat, lng)
          ? `Selected Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`
          : 'Invalid Coordinates',
        expected_daily_capacity_kg: null,
        radius_km: !isNaN(radius) && radius >= 0.5 && radius <= 50 ? radius : 5,
        nearby_station_ids: [],
        nearby_stations: [],
        location_source: 'map_pin',
        candidate_id: null,
        source_section: 'network_map',
        updated_at: 0,
      };
    }

    return proposedEvaluation;
  }, [proposedEvaluation, routeState, searchParams]);

  // Sync route state into context if navigated directly with state
  useEffect(() => {
    if (routeState) {
      setProposedEvaluation(routeState);
    }
  }, [routeState, setProposedEvaluation]);

  const [verifiedStations, setVerifiedStations] = useState<GujaratStationModel[]>([]);
  const [nearbyStations, setNearbyStations] = useState<NearbyVerifiedStation[]>([]);
  const [simulation, setSimulation] = useState<NetworkImpactSimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedStationId, setHighlightedStationId] = useState<string | null>(null);

  const hasValidProposalCoords =
    activeProposal !== null &&
    isValidCoordinate(activeProposal.latitude, activeProposal.longitude);

  // Unique key for active proposed station so stale results are cleared whenever station changes
  const proposalKey = activeProposal
    ? `${activeProposal.latitude}|${activeProposal.longitude}|${activeProposal.radius_km}|${activeProposal.proposed_name}|${activeProposal.expected_daily_capacity_kg ?? ''}|${activeProposal.updated_at}`
    : 'none';

  const executeAutomaticSimulation = useCallback(
    async (proposal: ProposedStationEvaluationState, signal?: AbortSignal) => {
      if (!isValidCoordinate(proposal.latitude, proposal.longitude)) {
        setSimulation(null);
        setNearbyStations([]);
        setError('Invalid or missing coordinates for the proposed station.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setSimulation(null);
      setHighlightedStationId(null);

      try {
        // Load verified stations for the map (if not already loaded) and nearby stations if needed
        const stationsPromise =
          verifiedStations.length > 0
            ? Promise.resolve(verifiedStations)
            : fetchGujaratNetworkStations(undefined, signal).then((r) => r.stations);

        const nearbyPromise =
          proposal.nearby_stations && proposal.nearby_stations.length > 0
            ? Promise.resolve(proposal.nearby_stations)
            : fetchNearbyVerifiedStations(
                {
                  lat: proposal.latitude,
                  lng: proposal.longitude,
                  radius_km: proposal.radius_km,
                  name: proposal.proposed_name,
                  location_label: proposal.selected_location,
                },
                signal
              ).then((r) => r.nearby_stations);

        const simPromise = simulateNetworkImpact(
          {
            proposed_name: proposal.proposed_name,
            proposed_location_label: proposal.selected_location,
            proposed_latitude: proposal.latitude,
            proposed_longitude: proposal.longitude,
            radius_km: proposal.radius_km,
            expected_daily_capacity_kg: proposal.expected_daily_capacity_kg,
            candidate_id: proposal.candidate_id,
          },
          signal
        );

        const [stationsList, resolvedNearby, simResp] = await Promise.all([
          stationsPromise,
          nearbyPromise,
          simPromise,
        ]);

        if (signal?.aborted) return;

        setVerifiedStations(stationsList);
        // Prefer authoritative backend simulation nearby_stations list for consistency
        setNearbyStations(simResp.nearby_stations || resolvedNearby);
        setSimulation(simResp);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to run network impact simulation. Please check backend connection.';
        setError(msg);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [verifiedStations]
  );

  // Automatically execute simulation whenever proposed station arrives or changes
  useEffect(() => {
    if (!activeProposal) {
      setSimulation(null);
      setNearbyStations([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    executeAutomaticSimulation(activeProposal, controller.signal);

    return () => {
      controller.abort();
    };
    // Trigger exclusively when proposalKey changes to avoid loops and guarantee fresh run on edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalKey]);

  const handleBackToNetworkMap = () => {
    if (activeProposal?.source_section === 'candidate_evaluation') {
      navigate('/map?section=candidates');
    } else {
      navigate('/map');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Back Navigation */}
      <MotionSection delay={0.04}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A9396]" />
                Network Impact Evaluation
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Gujarat Gas Company Ltd.
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Impact Simulator
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              What happens to the existing CNG network if we establish a new station at this location?
            </p>
          </div>

          <button
            type="button"
            onClick={handleBackToNetworkMap}
            className="px-4 py-2.5 rounded-xl bg-[#0B1320] hover:bg-slate-800 text-[#5EEAD4] text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Network Map</span>
          </button>
        </div>
      </MotionSection>

      {/* Empty State: No Proposed Station Selected */}
      {!activeProposal && (
        <MotionSection delay={0.08}>
          <div className="rounded-2xl bg-white p-10 border border-slate-200 shadow-xs text-center space-y-4 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-[#0A9396] flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                No Proposed CNG Station Selected
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select or place a proposed new station location on the Gujarat-wide Network Map and click{' '}
                <strong>Direct Simulate</strong> to compare it against nearby verified CNG stations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="px-5 py-2.5 rounded-xl bg-[#0A9396] hover:bg-[#005F73] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Go to Network Map</span>
            </button>
          </div>
        </MotionSection>
      )}

      {/* Active Proposed Station Workflow */}
      {activeProposal && (
        <>
          {/* Section A: Proposed Station Overview */}
          <MotionSection delay={0.08}>
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold uppercase tracking-wide">
                      Proposed Station (Not Operational)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                      Source:{' '}
                      {activeProposal.location_source === 'google_autocomplete'
                        ? 'Google Places Search'
                        : 'Dropped Map Pin'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeProposal.proposed_name}
                  </h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{activeProposal.selected_location}</span>
                  </p>
                </div>

                {hasValidProposalCoords && (
                  <button
                    type="button"
                    onClick={() => executeAutomaticSimulation(activeProposal)}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Simulation</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Latitude & Longitude
                  </div>
                  <div className="font-mono font-semibold text-slate-900 mt-1">
                    {hasValidProposalCoords
                      ? `${activeProposal.latitude.toFixed(5)}°N, ${activeProposal.longitude.toFixed(5)}°E`
                      : 'Missing / Invalid Coordinates'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Expected Daily Capacity
                  </div>
                  <div className="font-mono font-semibold text-slate-900 mt-1">
                    {activeProposal.expected_daily_capacity_kg != null
                      ? `${activeProposal.expected_daily_capacity_kg.toLocaleString()} kg/day`
                      : 'Not specified (Optional)'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Analysis Radius
                  </div>
                  <div className="font-mono font-bold text-[#0A9396] mt-1">
                    {activeProposal.radius_km} km
                  </div>
                </div>
              </div>
            </div>
          </MotionSection>

          {/* Error State */}
          {error && (
            <MotionSection delay={0.1}>
              <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Simulation Error</span>
                </div>
                <p>{error}</p>
                <div className="flex items-center gap-2">
                  {hasValidProposalCoords && (
                    <button
                      type="button"
                      onClick={() => executeAutomaticSimulation(activeProposal)}
                      className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold cursor-pointer"
                    >
                      Retry Simulation
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBackToNetworkMap}
                    className="px-3.5 py-2 rounded-xl bg-white border border-red-200 text-red-800 font-semibold cursor-pointer"
                  >
                    Back to Network Map
                  </button>
                </div>
              </div>
            </MotionSection>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="rounded-2xl bg-white p-12 border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" />
              <p className="text-xs font-medium text-slate-600">
                Loading nearby verified stations and running network impact simulation...
              </p>
            </div>
          )}

          {/* Simulation Results (Sections B, C, D, E) */}
          {!isLoading && !error && simulation && hasValidProposalCoords && (
            <>
              {/* Section D: Network Impact Results (5 Compact Metric Cards) */}
              <MotionSection delay={0.12}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="rounded-2xl bg-white p-4 border border-slate-200 border-t-[3px] border-t-[#0A9396] shadow-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Nearby Existing Stations
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                      {simulation.geographical_metrics.nearby_verified_count}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Verified within {simulation.radius_km} km
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 border border-slate-200 border-t-[3px] border-t-blue-600 shadow-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Nearest Existing Station
                    </div>
                    <div
                      className="text-sm font-bold text-slate-900 mt-1.5 truncate"
                      title={simulation.geographical_metrics.nearest_station?.station_name || 'Insufficient Data'}
                    >
                      {simulation.geographical_metrics.nearest_station?.station_name || 'Insufficient Data'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {simulation.geographical_metrics.nearest_station
                        ? `${simulation.geographical_metrics.nearest_station.city}, ${simulation.geographical_metrics.nearest_station.district}`
                        : 'No verified station data'}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 border border-slate-200 border-t-[3px] border-t-[#0A9396] shadow-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Distance to Nearest Station
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#005F73] mt-1">
                      {simulation.geographical_metrics.nearest_station
                        ? `${simulation.geographical_metrics.nearest_station.distance_km.toFixed(2)} km`
                        : 'N/A'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Straight-line geodesic
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 border border-slate-200 border-t-[3px] border-t-emerald-600 shadow-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-emerald-600" />
                      <span>Coverage Gap Assessment</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1.5">
                      {simulation.overall_assessment}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Coverage Gain: {simulation.geographical_metrics.coverage_improvement_level}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 border border-slate-200 border-t-[3px] border-t-amber-500 shadow-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-600" />
                      <span>Overlap with Existing</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1.5">
                      {simulation.geographical_metrics.overlap_level} Overlap
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Based on verified spacing
                    </div>
                  </div>
                </div>
              </MotionSection>

              {/* Section 2: Existing vs Proposed Station Comparison */}
              <MotionSection delay={0.14}>
                <SimulatorExistingVsProposedTable simulation={simulation} />
              </MotionSection>

              {/* Section 3: New Station Demand & Sales Estimation */}
              <MotionSection delay={0.16}>
                <SimulatorDemandEstimationCard
                  demandEstimate={simulation.demand_estimate}
                  radiusKm={simulation.radius_km}
                />
              </MotionSection>

              {/* Section 4 & Map Integration: Nearby Station Sales Impact + Interactive Map */}
              <MotionSection delay={0.18}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-6">
                    <SimulatorNearbySalesImpactTable
                      impactRows={simulation.station_impact_rows}
                      nearbyStations={nearbyStations}
                      radiusKm={simulation.radius_km}
                      nearestOverallStation={simulation.geographical_metrics.nearest_station}
                      highlightedStationId={highlightedStationId}
                      onSelectStation={setHighlightedStationId}
                    />
                  </div>

                  <div className="lg:col-span-6">
                    <SimulatorComparisonMap
                      proposedName={activeProposal.proposed_name}
                      proposedLocation={activeProposal.selected_location}
                      proposedLat={activeProposal.latitude}
                      proposedLng={activeProposal.longitude}
                      radiusKm={simulation.radius_km}
                      verifiedStations={verifiedStations}
                      nearbyStations={nearbyStations}
                      stationImpactRows={simulation.station_impact_rows}
                      highlightedStationId={highlightedStationId}
                      onSelectStation={setHighlightedStationId}
                    />
                  </div>
                </div>
              </MotionSection>

              {/* Section 5: Overall Network Impact & Before vs After Comparison */}
              <MotionSection delay={0.2}>
                <SimulatorNetworkImpactSection networkImpact={simulation.network_sales_impact} />
              </MotionSection>

              {/* Section 6: Final Location Suitability Assessment */}
              <MotionSection delay={0.22}>
                <SimulatorFinalAssessment simulation={simulation} />
              </MotionSection>
            </>
          )}
        </>
      )}
    </div>
  );
};
