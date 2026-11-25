import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Layers,
  Award,
  TrendingUp,
  MapPin,
  Compass,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { compareCandidates } from '../../api/candidates';
import { CandidateCompareResponse } from '../../types/candidates';

interface CandidateComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCandidateIds: string[];
  onOpenDossier?: (candidateId: string) => void;
}

export const CandidateComparisonModal: React.FC<CandidateComparisonModalProps> = ({
  isOpen,
  onClose,
  selectedCandidateIds,
  onOpenDossier,
}) => {
  const [comparisonData, setComparisonData] = useState<CandidateCompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || selectedCandidateIds.length < 2) {
      setComparisonData(null);
      return;
    }

    const loadComparison = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await compareCandidates(selectedCandidateIds);
        setComparisonData(resp);
      } catch (err: any) {
        setError(err.message || 'Failed to calculate candidate comparison.');
      } finally {
        setIsLoading(false);
      }
    };

    loadComparison();
  }, [isOpen, selectedCandidateIds]);

  if (!isOpen) return null;

  const renderScoreBar = (label: string, score: number | null, colorClass: string) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {score !== null ? `${score.toFixed(1)} / 100` : 'N/A'}
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-750 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${Math.min(100, Math.max(0, score ?? 0))}%` }}
          />
        </div>
      </div>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Candidate Decision Matrix & Trade-off Analysis
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  {selectedCandidateIds.length} Candidates Selected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Side-by-side evaluation across Demand, Network Service Gap, Accessibility, and Proximity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              <p className="font-medium text-xs">Computing comparative spatial trade-offs...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Comparison Failed</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {comparisonData && !isLoading && (
            <>
              {/* Executive Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 border border-teal-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Optimization Synthesis & Trade-off Verdict
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                      {comparisonData.comparison_summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Factor Winner Badges */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Best Overall
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px] truncate mt-1">
                    {comparisonData.best_overall_candidate}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Top Demand
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px] truncate mt-1">
                    {comparisonData.highest_demand_candidate}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Largest Gap
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px] truncate mt-1">
                    {comparisonData.largest_service_gap_candidate}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <Compass className="w-3 h-3" /> Best Access
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px] truncate mt-1">
                    {comparisonData.best_accessibility_candidate}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Closest Net
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px] truncate mt-1">
                    {comparisonData.closest_to_existing_network}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Most Isolated
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px] truncate mt-1">
                    {comparisonData.most_isolated_candidate}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {comparisonData.candidates.map((cand) => {
                  const isTop = cand.candidate_id === comparisonData.best_overall_candidate;

                  return (
                    <div
                      key={cand.candidate_id}
                      className={`rounded-2xl p-4.5 border transition-all flex flex-col justify-between ${
                        isTop
                          ? 'bg-teal-500/5 dark:bg-teal-500/10 border-teal-500/40 ring-1 ring-teal-500/30'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Header & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              {cand.candidate_id}
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-2 mt-0.5">
                              {cand.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {cand.city}, {cand.district}
                            </p>
                          </div>
                          {isTop && (
                            <span className="shrink-0 p-1 rounded-lg bg-teal-500 text-white shadow-xs" title="Highest Overall Suitability">
                              <Award className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Overall Score Box */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              Suitability Score
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              {cand.final_score !== null ? (
                                <>
                                  <span className="font-mono text-xl font-extrabold text-teal-600 dark:text-teal-400">
                                    {cand.final_score.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-slate-400">/ 100</span>
                                </>
                              ) : (
                                <span className="text-xs font-bold text-slate-400">Not Rankable</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Rank</span>
                            <div className="font-mono text-base font-bold text-slate-900 dark:text-white mt-0.5">
                              {cand.rank ? `#${cand.rank}` : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Factor Score Bars */}
                        <div className="space-y-2 pt-1">
                          {renderScoreBar('Estimated Demand (35%)', cand.demand_score, 'bg-emerald-500')}
                          {renderScoreBar('Service Gap (30%)', cand.service_gap_score, 'bg-blue-500')}
                          {renderScoreBar('Road Access (20%)', cand.road_accessibility_score, 'bg-purple-500')}
                          {renderScoreBar('Proximity (15%)', cand.distance_score, 'bg-teal-500')}
                        </div>

                        {/* Proximity & Completeness */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Nearest Verified:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={cand.nearest_station_name || ''}>
                              {cand.nearest_station_name || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Distance to Station:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {cand.nearest_station_distance_km ? `${cand.nearest_station_distance_km.toFixed(1)} km` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Data Completeness:</span>
                            <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                              {cand.data_completeness_pct}% ({cand.confidence_tier})
                            </span>
                          </div>
                        </div>

                        {/* Verdict Text */}
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-700/40">
                          "{cand.summary_verdict}"
                        </p>
                      </div>

                      {/* Action to Dossier */}
                      {onOpenDossier && (
                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => onOpenDossier(cand.candidate_id)}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 flex items-center justify-center gap-1.5 transition"
                          >
                            <span>Open Detailed Dossier</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Decision matrix is calculated in real-time from verified operating stations and multi-criteria weights.
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Matrix
          </Button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};