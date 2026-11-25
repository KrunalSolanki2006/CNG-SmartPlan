import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DirectionsResponse } from '../types/maps';
import {
  CandidateRankingItem,
  CandidateRankingsResponse,
  CandidateDossierResponse,
  GujaratStationModel,
  ScoringWeightsConfig,
  DiscoveryDiagnosticsModel,
  CandidateLocationModel,
} from '../types/candidates';
import {
  fetchCandidateRankings,
  fetchCandidateDossier,
  recalculateRankings,
  fetchGujaratNetworkStations,
  deleteCandidate,
} from '../api/candidates';
import { ExistingStationMapSection } from '../components/map/ExistingStationMapSection';
import { GujaratCandidateMap } from '../components/candidates/GujaratCandidateMap';
import {
  WeightsTuningPanel,
  DEFAULT_WEIGHTS,
} from '../components/candidates/WeightsTuningPanel';
import { CandidateLeaderboardTable } from '../components/candidates/CandidateLeaderboardTable';
import { CandidateDossierModal } from '../components/candidates/CandidateDossierModal';
import { DiscoveryDiagnosticsModal } from '../components/map/DiscoveryDiagnosticsModal';
import { AddCandidateModal } from '../components/candidates/AddCandidateModal';
import { CandidateComparisonModal } from '../components/candidates/CandidateComparisonModal';
import { ProposedLocationPanel } from '../components/map/ProposedLocationPanel';
import { DirectionsPanel } from '../components/map/DirectionsPanel';
import { MotionSection } from '../components/ui/MotionContainer';
import {
  Fuel,
  Target,
  Building2,
  CheckCircle2,
  Route,
  Columns,
} from 'lucide-react';

export const MapPage: React.FC = () => {
  // Core Dashboard View Section: exactly TWO core features
  const [activeSection, setActiveSection] = useState<'stations' | 'candidates'>(
    () => (new URLSearchParams(window.location.search).get('section') === 'candidates' ? 'candidates' : 'stations')
  );

  // 1. Existing Network Stations State (151 verified operating stations across Gujarat)
  const [networkStations, setNetworkStations] = useState<GujaratStationModel[]>([]);
  const [selectedStation, setSelectedStation] = useState<GujaratStationModel | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [diagnosticsData, setDiagnosticsData] = useState<DiscoveryDiagnosticsModel | null>(null);

  // 2. Candidate Location Ranking State (Gujarat State)
  const [rankingsData, setRankingsData] = useState<CandidateRankingsResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRankingItem | null>(null);
  const [dossierCandidateId, setDossierCandidateId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<CandidateDossierResponse | null>(null);
  const [isDossierLoading, setIsDossierLoading] = useState(false);
  const [activeCandidateSidebarTab, setActiveCandidateSidebarTab] = useState<'analysis' | 'weights' | 'proposed'>('analysis');

  // Multi-Criteria Weights & Filters
  const [weights, setWeights] = useState<ScoringWeightsConfig>(DEFAULT_WEIGHTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rankableOnly, setRankableOnly] = useState(false);
  const [isUpdatingRankings, setIsUpdatingRankings] = useState(false);

  // Candidate Propose & Compare Modals
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(
    () => new URLSearchParams(window.location.search).has('propose')
  );
  const [addCandidateInitialCoords, setAddCandidateInitialCoords] = useState<{ lat: number; lng: number } | null>(
    () => (new URLSearchParams(window.location.search).get('coords') === '1' ? { lat: 23.015, lng: 72.355 } : null)
  );
  const [isComparisonOpen, setIsComparisonOpen] = useState(
    () => new URLSearchParams(window.location.search).has('compare')
  );
  const [compareCandidateIds, setCompareCandidateIds] = useState<string[]>(
    () => (new URLSearchParams(window.location.search).has('compare') ? ['GUJ_CAN_001', 'GUJ_CAN_002', 'GUJ_CAN_003'] : [])
  );
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(
    () => new URLSearchParams(window.location.search).has('diagnostics')
  );

  // Proposed pin coordinates for custom pin testing
  const [proposedCoords, setProposedCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 23.05,
    lng: 72.6,
  });

  // Routing State for candidate to station road simulation
  const [directions, setDirections] = useState<DirectionsResponse | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // Debounce ref for dynamic recalculation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Data Load
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [rankingsResp, stationsResp] = await Promise.all([
          fetchCandidateRankings(),
          fetchGujaratNetworkStations(),
        ]);
        if (isMounted) {
          setRankingsData(rankingsResp);
          setNetworkStations(stationsResp.stations);
          if (stationsResp.diagnostics) {
            setDiagnosticsData(stationsResp.diagnostics);
          }
          if (stationsResp.available_cities) {
            setAvailableCities(stationsResp.available_cities);
          }
          if (stationsResp.available_districts) {
            setAvailableDistricts(stationsResp.available_districts);
          } else if (rankingsResp.available_districts) {
            setAvailableDistricts(rankingsResp.available_districts);
          }
          if (rankingsResp.candidates.length > 0) {
            setSelectedCandidate(rankingsResp.candidates[0]);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load Gujarat network and candidates:', err);
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamic Live Recalculation (Debounced 250ms)
  const triggerDynamicRecalculation = useCallback(
    (newWeights: ScoringWeightsConfig, city: string, cat: string, rankOnly: boolean, district?: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsUpdatingRankings(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const resp = await recalculateRankings({
            weights: newWeights,
            city_filter: city || undefined,
            district_filter: district !== undefined ? (district || undefined) : (selectedDistrict || undefined),
            category_filter: cat || undefined,
            rankable_only: rankOnly,
          });
          setRankingsData(resp);
          if (selectedCandidate) {
            const updated = resp.candidates.find(
              (c) => c.candidate_id === selectedCandidate.candidate_id
            );
            if (updated) setSelectedCandidate(updated);
          }
        } catch (err) {
          console.error('Failed to recalculate candidate scores dynamically:', err);
        } finally {
          setIsUpdatingRankings(false);
        }
      }, 250);
    },
    [selectedCandidate, selectedDistrict]
  );

  const handleWeightsChange = (newWeights: ScoringWeightsConfig) => {
    setWeights(newWeights);
    triggerDynamicRecalculation(newWeights, selectedCity, selectedCategory, rankableOnly, selectedDistrict);
  };

  const handleResetDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
    triggerDynamicRecalculation(DEFAULT_WEIGHTS, selectedCity, selectedCategory, rankableOnly, selectedDistrict);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    triggerDynamicRecalculation(weights, city, selectedCategory, rankableOnly, selectedDistrict);
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    triggerDynamicRecalculation(weights, selectedCity, selectedCategory, rankableOnly, district);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    triggerDynamicRecalculation(weights, selectedCity, category, rankableOnly, selectedDistrict);
  };

  const handleRankableOnlyChange = (only: boolean) => {
    setRankableOnly(only);
    triggerDynamicRecalculation(weights, selectedCity, selectedCategory, only, selectedDistrict);
  };

  // Candidate Create, Delete & Compare Handlers
  const handleCandidateCreated = async (newCand: CandidateLocationModel) => {
    try {
      const [rankingsResp, stationsResp] = await Promise.all([
        fetchCandidateRankings(),
        fetchGujaratNetworkStations(),
      ]);
      setRankingsData(rankingsResp);
      setNetworkStations(stationsResp.stations);
      const match = rankingsResp.candidates.find((c) => c.candidate_id === newCand.candidate_id);
      if (match) {
        setSelectedCandidate(match);
        setActiveCandidateSidebarTab('analysis');
      }
    } catch (err) {
      console.error('Failed to refresh candidates after creation:', err);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteCandidate(candidateId);
      const [rankingsResp, stationsResp] = await Promise.all([
        fetchCandidateRankings(),
        fetchGujaratNetworkStations(),
      ]);
      setRankingsData(rankingsResp);
      setNetworkStations(stationsResp.stations);
      if (selectedCandidate?.candidate_id === candidateId) {
        setSelectedCandidate(rankingsResp.candidates[0] || null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete candidate');
    }
  };

  const handleOpenComparison = (candidateIds: string[]) => {
    setCompareCandidateIds(candidateIds);
    setIsComparisonOpen(true);
  };

  const handleMapClickForCandidate = (lat: number, lng: number) => {
    setAddCandidateInitialCoords({ lat, lng });
    setIsAddCandidateOpen(true);
  };

  const handleOpenAddCandidate = () => {
    setAddCandidateInitialCoords(null);
    setIsAddCandidateOpen(true);
  };

  const handleOpenDossier = async (candidateId: string) => {
    setDossierCandidateId(candidateId);
    setIsDossierLoading(true);
    try {
      const resp = await fetchCandidateDossier(candidateId);
      setDossierData(resp);
    } catch (err) {
      console.error('Failed to load candidate dossier:', err);
    } finally {
      setIsDossierLoading(false);
    }
  };

  const verifiedStationsCount = networkStations.filter(
    (s) =>
      s.cng_classification === 'VERIFIED_OPERATING_CNG' ||
      s.cng_classification === 'CONFIRMED_CNG'
  ).length || 151;

  const totalCandidateCount = rankingsData?.total_candidates ?? 16;
  const rankableCandidateCount = rankingsData?.rankable_count ?? 15;

  return (
    <div className="space-y-6">
      {/* Header & Planning Context */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                Geospatial Intelligence & Network Expansion
              </span>
              <span className="text-xs text-slate-500 font-medium">Gujarat Gas Company Ltd. • Gujarat State</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Gujarat CNG Network Map
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed mt-1">
              Geospatial planning environment combining GGCL network registry with Google Maps search, station positioning, and road navigation.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* Primary Section Switcher: Exactly TWO Core Features */}
      <MotionSection delay={0.08}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {/* Section 1 Button */}
          <button
            type="button"
            onClick={() => setActiveSection('stations')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'stations'
                ? 'bg-[#005F73] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Fuel className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>1. Existing CNG Station Map</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeSection === 'stations' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {verifiedStationsCount} Verified
            </span>
          </button>

          {/* Section 2 Button */}
          <button
            type="button"
            onClick={() => setActiveSection('candidates')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'candidates'
                ? 'bg-[#005F73] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Target className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>2. Candidate Location Evaluation</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeSection === 'candidates' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {rankableCandidateCount} / {totalCandidateCount} Sites
            </span>
          </button>
        </div>
      </MotionSection>

      {/* CORE FEATURE 1: Gujarat-Wide Existing CNG Station Map */}
      {activeSection === 'stations' && (
        <MotionSection delay={0.12}>
          <ExistingStationMapSection
            stations={networkStations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            availableCities={availableCities}
            availableDistricts={availableDistricts}
          />
        </MotionSection>
      )}

      {/* CORE FEATURE 2: Candidate Location Evaluation */}
      {activeSection === 'candidates' && (
        <MotionSection delay={0.12}>
          <div className="space-y-6">
            {/* Map and Analytical Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Candidate Map & Corridor Polyline */}
              <div className="lg:col-span-2 space-y-4">
                <GujaratCandidateMap
                  candidates={rankingsData?.candidates || []}
                  stations={networkStations}
                  selectedCandidate={selectedCandidate}
                  onSelectCandidate={(cand) => {
                    setSelectedCandidate(cand);
                    setActiveCandidateSidebarTab('analysis');
                  }}
                  onOpenDossier={handleOpenDossier}
                  onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                  diagnostics={diagnosticsData}
                  onMapClick={handleMapClickForCandidate}
                  onProposeCandidate={handleOpenAddCandidate}
                  selectedDistrict={selectedDistrict}
                  onDistrictChange={handleDistrictChange}
                  availableDistricts={availableDistricts}
                />

                {/* Road Navigation Polyline Panel if computed */}
                {directions && (
                  <DirectionsPanel
                    directions={directions}
                    onClear={() => setDirections(null)}
                    selectedRouteIndex={selectedRouteIndex}
                    onSelectRouteIndex={setSelectedRouteIndex}
                    originLabel={selectedCandidate?.name || 'Candidate Site'}
                    destinationLabel={selectedCandidate?.nearest_station?.station_name || 'Nearest Operating Station'}
                  />
                )}
              </div>

              {/* Right 1 Col: Candidate Evaluation Tabs */}
              <div className="space-y-4">
                {/* Sidebar Navigation Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCandidateSidebarTab('analysis')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                      activeCandidateSidebarTab === 'analysis'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Candidate Analysis
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCandidateSidebarTab('weights')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                      activeCandidateSidebarTab === 'weights'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    MCDA Weights
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCandidateSidebarTab('proposed')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                      activeCandidateSidebarTab === 'proposed'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Proposed Pin
                  </button>
                </div>

                {/* Tab 1: Selected Candidate Analytical Card */}
                {activeCandidateSidebarTab === 'analysis' && (
                  <div>
                    {selectedCandidate ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {selectedCandidate.candidate_id}
                              </span>
                              {selectedCandidate.is_rankable ? (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  Rank #{selectedCandidate.rank}
                                </span>
                              ) : (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  Unrankable
                                </span>
                              )}
                              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {selectedCandidate.category.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 mt-2 leading-snug">
                              {selectedCandidate.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {selectedCandidate.city}, {selectedCandidate.district} • {selectedCandidate.highway_corridor}
                            </p>
                          </div>
                        </div>

                        {/* Composite Score and Data Completeness */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-[10px] uppercase font-bold text-slate-500">Composite Score</div>
                            <div className="text-xl font-bold text-teal-800 font-mono mt-0.5">
                              {selectedCandidate.final_score !== null ? `${selectedCandidate.final_score.toFixed(1)} / 100` : 'N/A'}
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-[10px] uppercase font-bold text-slate-500">Data Completeness</div>
                            <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                              <span>{selectedCandidate.confidence_tier} ({selectedCandidate.data_completeness_pct}%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Sub-Criteria Breakdown */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                          <div className="text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-slate-200">
                            Criteria Sub-Scores
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Demand Proxy:</span>
                              <span className="font-mono font-bold text-slate-800">{selectedCandidate.demand_score?.toFixed(1) ?? 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Service Gap:</span>
                              <span className="font-mono font-bold text-slate-800">{selectedCandidate.service_gap_score?.toFixed(1) ?? 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Road Access:</span>
                              <span className="font-mono font-bold text-slate-800">{selectedCandidate.road_accessibility_score?.toFixed(1) ?? 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Distance Shield:</span>
                              <span className="font-mono font-bold text-slate-800">{selectedCandidate.distance_score?.toFixed(1) ?? 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Nearby Station Analysis (Core Feature 2 B) */}
                        {selectedCandidate.nearest_station && (
                          <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-xs space-y-1.5">
                            <div className="font-bold text-teal-950 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Route className="w-3.5 h-3.5 text-teal-700" />
                                <span>Nearest Operating Station:</span>
                              </span>
                              <span className="font-mono text-teal-800 font-bold">
                                {selectedCandidate.nearest_station.straight_line_distance_km} km
                              </span>
                            </div>
                            <div className="text-[11px] text-teal-900 font-semibold truncate">
                              {selectedCandidate.nearest_station.station_name}
                            </div>
                            {selectedCandidate.nearest_station.driving_road_distance_km ? (
                              <div className="text-[10.5px] text-teal-800 flex items-center justify-between pt-1 border-t border-teal-200/60">
                                <span>Road Distance: {selectedCandidate.nearest_station.driving_road_distance_km} km</span>
                                <span>Drive: {selectedCandidate.nearest_station.drive_time_text || 'Active'}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-teal-700 italic">
                                Road navigation route available via Google Directions API
                              </div>
                            )}
                          </div>
                        )}

                        {/* Geographical Coverage & Density (Core Feature 2 C) */}
                        {selectedCandidate.nearest_station?.stations_within_radius && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-500">
                              Catchment Station Density
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px]">
                              <div className="p-1 bg-white rounded border border-slate-200">
                                <span className="block text-[9px] text-slate-400">1 km</span>
                                <span className="font-bold text-slate-800">{selectedCandidate.nearest_station.stations_within_radius['1km'] || 0}</span>
                              </div>
                              <div className="p-1 bg-white rounded border border-slate-200">
                                <span className="block text-[9px] text-slate-400">3 km</span>
                                <span className="font-bold text-slate-800">{selectedCandidate.nearest_station.stations_within_radius['3km'] || 0}</span>
                              </div>
                              <div className="p-1 bg-white rounded border border-slate-200">
                                <span className="block text-[9px] text-slate-400">5 km</span>
                                <span className="font-bold text-slate-800">{selectedCandidate.nearest_station.stations_within_radius['5km'] || 0}</span>
                              </div>
                              <div className="p-1 bg-white rounded border border-slate-200">
                                <span className="block text-[9px] text-slate-400">10 km</span>
                                <span className="font-bold text-slate-800">{selectedCandidate.nearest_station.stations_within_radius['10km'] || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Honest Data & Evaluation Note */}
                        <div className="text-[10px] text-slate-500 italic leading-snug">
                          * Evaluation relies on measured AADT traffic, GIDC industrial density, and verified operating stations. Synthetic sales forecasts are not treated as demand proof.
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDossier(selectedCandidate.candidate_id)}
                            className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>View Full Analytical Dossier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenComparison([selectedCandidate.candidate_id, 'GUJ_CAN_001', 'GUJ_CAN_006'])}
                            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Columns className="w-3.5 h-3.5" />
                            <span>Compare with Benchmark Candidates</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                        Select a candidate site from the map or leaderboard below to inspect analytical evaluation metrics.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Dynamic MCDA Weights Tuning */}
                {activeCandidateSidebarTab === 'weights' && (
                  <WeightsTuningPanel
                    weights={weights}
                    onWeightsChange={handleWeightsChange}
                    onResetDefaults={handleResetDefaults}
                    isUpdating={isUpdatingRankings}
                  />
                )}

                {/* Tab 3: Proposed Pin Testing */}
                {activeCandidateSidebarTab === 'proposed' && (
                  <ProposedLocationPanel
                    proposedCoords={proposedCoords}
                    onSetCoords={setProposedCoords}
                  />
                )}
              </div>
            </div>

            {/* Candidate Priority Leaderboard Table (Core Feature 2 D & E) */}
            <CandidateLeaderboardTable
              candidates={rankingsData?.candidates || []}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={(cand) => {
                setSelectedCandidate(cand);
                setActiveCandidateSidebarTab('analysis');
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              onOpenDossier={handleOpenDossier}
              onOpenComparison={handleOpenComparison}
              onProposeCandidate={handleOpenAddCandidate}
              onDeleteCandidate={handleDeleteCandidate}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              rankableOnly={rankableOnly}
              onRankableOnlyChange={handleRankableOnlyChange}
              availableCities={availableCities.length > 0 ? availableCities : (rankingsData?.available_cities || [])}
              availableCategories={rankingsData?.available_categories || []}
            />
          </div>
        </MotionSection>
      )}

      {/* Propose Candidate Location Modal (Method 1 Autocomplete & Method 2 Pin Drop) */}
      <AddCandidateModal
        isOpen={isAddCandidateOpen}
        onClose={() => {
          setIsAddCandidateOpen(false);
          setAddCandidateInitialCoords(null);
        }}
        initialCoords={addCandidateInitialCoords}
        onCandidateCreated={handleCandidateCreated}
      />

      {/* Candidate Decision Matrix Comparison Modal (Core Feature 2 D) */}
      <CandidateComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        selectedCandidateIds={compareCandidateIds}
        onOpenDossier={(candId) => {
          setIsComparisonOpen(false);
          handleOpenDossier(candId);
        }}
      />

      {/* Full Candidate Analytical Dossier Modal (Core Feature 2 E) */}
      <CandidateDossierModal
        isOpen={!!dossierCandidateId}
        dossier={dossierData}
        onClose={() => {
          setDossierCandidateId(null);
          setDossierData(null);
        }}
        isLoading={isDossierLoading}
      />

      {/* Transparent SerpAPI Discovery Diagnostics Modal */}
      <DiscoveryDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        diagnostics={diagnosticsData}
      />
    </div>
  );
};
