import React, { useState, useMemo } from 'react';
import { CandidateRankingItem } from '../../types/candidates';
import {
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Plus,
  Scale,
  Trash2,
  ArrowUpDown,
  CheckSquare,
  Square,
} from 'lucide-react';

export interface CandidateLeaderboardTableProps {
  candidates: CandidateRankingItem[];
  selectedCandidate: CandidateRankingItem | null;
  onSelectCandidate: (candidate: CandidateRankingItem) => void;
  onOpenDossier: (candidateId: string) => void;
  onOpenComparison?: (candidateIds: string[]) => void;
  onProposeCandidate?: () => void;
  onDeleteCandidate?: (candidateId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  rankableOnly: boolean;
  onRankableOnlyChange: (rankableOnly: boolean) => void;
  availableCities: string[];
  availableCategories: string[];
}

type SortField = 'rank' | 'score' | 'demand' | 'service_gap' | 'road' | 'distance';
type SortDirection = 'asc' | 'desc';

export const CandidateLeaderboardTable: React.FC<CandidateLeaderboardTableProps> = ({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  onOpenDossier,
  onOpenComparison,
  onProposeCandidate,
  onDeleteCandidate,
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  selectedCategory,
  onCategoryChange,
  rankableOnly,
  onRankableOnlyChange,
  availableCities,
  availableCategories,
}) => {
  // Multi-select for comparison (2 to 5 items)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Candidate selection for comparison
  const toggleCompare = (candidateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(candidateId)) {
        return prev.filter((id) => id !== candidateId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, candidateId];
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  // Filter & Sort candidates
  const processedCandidates = useMemo(() => {
    const filtered = candidates.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCity = c.city.toLowerCase().includes(q);
        const matchCorridor = c.highway_corridor.toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchCorridor) return false;
      }
      if (selectedCity && c.city !== selectedCity) return false;
      if (selectedCategory && c.category !== selectedCategory) return false;
      if (rankableOnly && !c.is_rankable) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let valA: number | null = null;
      let valB: number | null = null;

      switch (sortField) {
        case 'rank':
          valA = a.rank ?? 999;
          valB = b.rank ?? 999;
          break;
        case 'score':
          valA = a.final_score ?? -1;
          valB = b.final_score ?? -1;
          break;
        case 'demand':
          valA = a.demand_score ?? -1;
          valB = b.demand_score ?? -1;
          break;
        case 'service_gap':
          valA = a.service_gap_score ?? -1;
          valB = b.service_gap_score ?? -1;
          break;
        case 'road':
          valA = a.road_accessibility_score ?? -1;
          valB = b.road_accessibility_score ?? -1;
          break;
        case 'distance':
          valA = a.distance_score ?? -1;
          valB = b.distance_score ?? -1;
          break;
      }

      if (valA === valB) return 0;
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [candidates, searchQuery, selectedCity, selectedCategory, rankableOnly, sortField, sortDirection]);

  const getConfidenceBadge = (tier: string, completeness: number) => {
    if (tier === 'High') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-2.5 h-2.5" />
          High ({completeness}%)
        </span>
      );
    }
    if (tier === 'Moderate') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Moderate ({completeness}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-2.5 h-2.5" />
        Low ({completeness}%)
      </span>
    );
  };

  const getScoreBadge = (score: number | null, isRankable: boolean) => {
    if (!isRankable || score === null) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
          Not Rankable
        </span>
      );
    }
    if (score >= 85) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-extrabold text-teal-400">{score.toFixed(1)}</span>
          <span className="text-[10px] text-teal-500/80">/100</span>
        </div>
      );
    }
    if (score >= 70) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-extrabold text-blue-400">{score.toFixed(1)}</span>
          <span className="text-[10px] text-blue-500/80">/100</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-extrabold text-amber-400">{score.toFixed(1)}</span>
        <span className="text-[10px] text-amber-500/80">/100</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      
      {/* Top Action & Filter Ribbon */}
      <div className="p-4 bg-slate-900/95 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate, GIDC, industrial park, or corridor..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* City Filter */}
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Gujarat Cities</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          {/* Sort By Select */}
          <select
            value={sortField}
            onChange={(e) => handleSort(e.target.value as SortField)}
            className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="rank">Sort by: Rank</option>
            <option value="score">Sort by: Suitability Score</option>
            <option value="demand">Sort by: Estimated Demand</option>
            <option value="service_gap">Sort by: Service Gap</option>
            <option value="road">Sort by: Road Access</option>
            <option value="distance">Sort by: Distance</option>
          </select>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Rankable Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rankableOnly}
              onChange={(e) => onRankableOnlyChange(e.target.checked)}
              className="rounded border-slate-600 text-teal-500 focus:ring-0"
            />
            <span>Rankable Only ({candidates.filter((c) => c.is_rankable).length})</span>
          </label>

          {/* Propose Location Trigger */}
          {onProposeCandidate && (
            <button
              type="button"
              onClick={onProposeCandidate}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Propose Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating / Pinned Comparison Bar when candidates are selected */}
      {selectedForCompare.length > 0 && (
        <div className="px-4 py-2.5 bg-teal-950/60 border-b border-teal-500/30 flex items-center justify-between text-xs text-teal-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-teal-400" />
            <span className="font-semibold">
              {selectedForCompare.length} candidates selected for side-by-side trade-off matrix (min 2, max 5).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selectedForCompare.length < 2}
              onClick={() => onOpenComparison && onOpenComparison(selectedForCompare)}
              className="px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Compare Selected ({selectedForCompare.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3 w-10 text-center" title="Select to compare">
                <span className="sr-only">Compare</span>
              </th>
              <th
                onClick={() => handleSort('rank')}
                className="py-3 px-3 w-16 cursor-pointer hover:text-teal-400 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Rank</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Candidate Location</th>
              <th className="py-3 px-4">Category</th>
              <th
                onClick={() => handleSort('score')}
                className="py-3 px-4 cursor-pointer hover:text-teal-400 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Overall Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Criteria Sub-Scores</th>
              <th className="py-3 px-4">Nearest Station</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {processedCandidates.map((c) => {
              const isSelected = selectedCandidate?.candidate_id === c.candidate_id;
              const isChecked = selectedForCompare.includes(c.candidate_id);

              return (
                <tr
                  key={c.candidate_id}
                  onClick={() => onSelectCandidate(c)}
                  className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-950/20 border-l-2 border-teal-500' : ''
                  }`}
                >
                  {/* Compare Checkbox */}
                  <td className="py-3 px-3 text-center" onClick={(e) => toggleCompare(c.candidate_id, e)}>
                    <button
                      type="button"
                      className="p-1 rounded text-slate-400 hover:text-teal-400"
                      title={isChecked ? 'Remove from comparison' : 'Add to comparison'}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-teal-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>
                  </td>

                  {/* Rank */}
                  <td className="py-3 px-3 font-mono font-bold">
                    {c.is_rankable ? (
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                          c.rank === 1
                            ? 'bg-[#CA6702]/20 text-amber-400 border border-[#CA6702]/40 font-extrabold shadow-sm'
                            : c.rank === 2
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                            : c.rank === 3
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{c.rank}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal">-</span>
                    )}
                  </td>

                  {/* Candidate Name & Location */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>{c.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{c.city}, {c.district}</span>
                      <span>•</span>
                      <span className="text-teal-400/90">{c.highway_corridor}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60 capitalize">
                      {c.category.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Overall Score */}
                  <td className="py-3 px-4">
                    {getScoreBadge(c.final_score, c.is_rankable)}
                  </td>

                  {/* Sub-Scores Mini Matrix */}
                  <td className="py-3 px-4">
                    {c.is_rankable ? (
                      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center max-w-[170px]">
                        <div className="bg-slate-800/80 px-1 py-0.5 rounded text-teal-300" title="Demand Score (35%)">
                          D:{c.demand_score !== null ? c.demand_score : '-'}
                        </div>
                        <div className="bg-slate-800/80 px-1 py-0.5 rounded text-blue-300" title="Service Gap Score (30%)">
                          G:{c.service_gap_score !== null ? c.service_gap_score : '-'}
                        </div>
                        <div className="bg-slate-800/80 px-1 py-0.5 rounded text-indigo-300" title="Road Score (20%)">
                          R:{c.road_accessibility_score !== null ? c.road_accessibility_score : '-'}
                        </div>
                        <div className="bg-slate-800/80 px-1 py-0.5 rounded text-cyan-300" title="Distance Score (15%)">
                          S:{c.distance_score !== null ? c.distance_score : '-'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px] italic">Insufficient data</span>
                    )}
                  </td>

                  {/* Nearest Station */}
                  <td className="py-3 px-4 text-slate-300 text-[11px]">
                    {c.nearest_station ? (
                      <div>
                        <div className="font-medium text-slate-200 truncate max-w-[150px]">
                          {c.nearest_station.station_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ~{c.nearest_station.driving_road_distance_km ?? c.nearest_station.straight_line_distance_km} km road ({c.nearest_station.straight_line_distance_km} km air)
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Confidence Tier */}
                  <td className="py-3 px-4">
                    {getConfidenceBadge(c.confidence_tier, c.data_completeness_pct)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCandidate(c);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition-colors"
                        title="View on Gujarat Map"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteCandidate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete candidate "${c.name}"?`)) {
                              onDeleteCandidate(c.candidate_id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete candidate location"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossier(c.candidate_id);
                        }}
                        className="px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-semibold text-[11px] flex items-center gap-1 border border-teal-500/20 transition-colors"
                      >
                        <span>Dossier</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};