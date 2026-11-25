import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchCandidateRankings,
  fetchCandidateDossier,
  recalculateRankings,
  fetchGujaratNetworkStations,
} from '../api/candidates';
import {
  CandidateRankingItem,
  CandidateRankingsResponse,
  CandidateDossierResponse,
  GujaratStationModel,
  ScoringWeightsConfig,
} from '../types/candidates';
import { GujaratCandidateMap } from '../components/candidates/GujaratCandidateMap';
import {
  WeightsTuningPanel,
  DEFAULT_WEIGHTS,
} from '../components/candidates/WeightsTuningPanel';
import { CandidateLeaderboardTable } from '../components/candidates/CandidateLeaderboardTable';
import { CandidateDossierModal } from '../components/candidates/CandidateDossierModal';
import {
  Award,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Building,
  Route,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const CandidateRankingPage: React.FC = () => {
  // 1. Data States
  const [rankingsData, setRankingsData] = useState<CandidateRankingsResponse | null>(null);
  const [networkStations, setNetworkStations] = useState<GujaratStationModel[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRankingItem | null>(null);
  const [dossierCandidateId, setDossierCandidateId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<CandidateDossierResponse | null>(null);

  // 2. Control States
  const [weights, setWeights] = useState<ScoringWeightsConfig>(DEFAULT_WEIGHTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rankableOnly, setRankableOnly] = useState(false);

  // 3. Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDossierLoading, setIsDossierLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer for weights recalculation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Data Load
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [rankingsResp, stationsResp] = await Promise.all([
          fetchCandidateRankings(),
          fetchGujaratNetworkStations(),
        ]);
        if (isMounted) {
          setRankingsData(rankingsResp);
          setNetworkStations(stationsResp.stations);
          if (rankingsResp.candidates.length > 0) {
            setSelectedCandidate(rankingsResp.candidates[0]);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load Gujarat candidate locations and network.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Dynamic Recalculation on Weights or Filter Change (Debounced 250ms)
  const triggerRecalculation = useCallback(
    (newWeights: ScoringWeightsConfig, city: string, cat: string, rankOnly: boolean) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsUpdating(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const resp = await recalculateRankings({
            weights: newWeights,
            city_filter: city || undefined,
            category_filter: cat || undefined,
            rankable_only: rankOnly,
          });
          setRankingsData(resp);
          // Update selected candidate reference if still present
          if (selectedCandidate) {
            const updated = resp.candidates.find(
              (c) => c.candidate_id === selectedCandidate.candidate_id
            );
            if (updated) setSelectedCandidate(updated);
          }
        } catch (err) {
          console.error('Failed to recalculate candidate scores:', err);
        } finally {
          setIsUpdating(false);
        }
      }, 250);
    },
    [selectedCandidate]
  );

  const handleWeightsChange = (newWeights: ScoringWeightsConfig) => {
    setWeights(newWeights);
    triggerRecalculation(newWeights, selectedCity, selectedCategory, rankableOnly);
  };

  const handleResetDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
    triggerRecalculation(DEFAULT_WEIGHTS, selectedCity, selectedCategory, rankableOnly);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    triggerRecalculation(weights, city, selectedCategory, rankableOnly);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    triggerRecalculation(weights, selectedCity, category, rankableOnly);
  };

  const handleRankableOnlyChange = (only: boolean) => {
    setRankableOnly(only);
    triggerRecalculation(weights, selectedCity, selectedCategory, only);
  };

  // Open Detailed Candidate Dossier Modal
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

  const handleCloseDossier = () => {
    setDossierCandidateId(null);
    setDossierData(null);
  };

  // Extract top-ranked site
  const topCandidate = rankingsData?.candidates?.find((c) => c.rank === 1);

  return (
    <div className="min-h-full space-y-6 pb-12 animate-fade-in text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30">
              Statewide Network Expansion
            </span>
            <span className="text-xs text-slate-400">PS000002 • Gujarat Gas Co. Ltd.</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Gujarat Candidate Location Ranking
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Evidence-driven Multi-Criteria Decision Analysis (MCDA) prioritizing commercial viability, network service gap coverage, and freight corridor road accessibility across Gujarat.
          </p>
        </div>

        {/* Status Tag */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">Verified Master Data Separated</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
          <p className="text-sm">Evaluating Gujarat candidates and network topography...</p>
        </div>
      ) : (
        <>
          {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Evaluated */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Candidate Sites</span>
            <span className="font-mono text-xl font-bold text-white">
              {rankingsData?.total_candidates ?? '-'} Locations
            </span>
          </div>
        </div>

        {/* Rankable Opportunities */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Rankable Sites</span>
            <span className="font-mono text-xl font-bold text-emerald-400">
              {rankingsData?.rankable_count ?? '-'} Ranked
            </span>
          </div>
        </div>

        {/* Operating Stations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Operating Network</span>
            <span className="font-mono text-xl font-bold text-blue-400">
              {networkStations.length} Stations
            </span>
          </div>
        </div>

        {/* Top Priority Site */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#CA6702]/10 border border-[#CA6702]/30 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 block">#1 Ranked Site</span>
            <span className="font-bold text-sm text-amber-300 truncate block">
              {topCandidate?.name.split('-')[0] || 'Changodar Belt'} ({topCandidate?.final_score || '92.0'})
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left/Center) + Multi-Criteria Weights Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gujarat Map Section */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              <span>Statewide Spatial Network & Candidate Distribution</span>
            </span>
            <span>Click any marker to select and inspect inter-station transit</span>
          </div>

          <GujaratCandidateMap
            candidates={rankingsData?.candidates || []}
            stations={networkStations}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={(c) => setSelectedCandidate(c)}
            onOpenDossier={(id) => handleOpenDossier(id)}
          />
        </div>

        {/* Dynamic Weight Tuning Panel */}
        <div className="lg:col-span-1 flex flex-col">
          <WeightsTuningPanel
            weights={weights}
            onWeightsChange={handleWeightsChange}
            onResetDefaults={handleResetDefaults}
            isUpdating={isUpdating}
          />
        </div>
      </div>

      {/* Candidate Leaderboard Table Section */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-teal-400" />
            <span>Candidate Location Priority Leaderboard</span>
          </span>
          <span className="text-slate-400">
            {rankingsData?.rankable_count ?? 0} Rankable • {rankingsData?.unrankable_count ?? 0} Unrankable
          </span>
        </div>

        <CandidateLeaderboardTable
          candidates={rankingsData?.candidates || []}
          selectedCandidate={selectedCandidate}
          onSelectCandidate={(c) => setSelectedCandidate(c)}
          onOpenDossier={(id) => handleOpenDossier(id)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          rankableOnly={rankableOnly}
          onRankableOnlyChange={handleRankableOnlyChange}
          availableCities={rankingsData?.available_cities || []}
          availableCategories={rankingsData?.available_categories || []}
        />
      </div>
      </>
      )}

      {/* Candidate Analytical Dossier Modal */}
      <CandidateDossierModal
        isOpen={Boolean(dossierCandidateId)}
        dossier={dossierData}
        onClose={handleCloseDossier}
        isLoading={isDossierLoading}
      />
    </div>
  );
};

export default CandidateRankingPage;
