import React from 'react';
import { createPortal } from 'react-dom';
import { CandidateDossierResponse } from '../../types/candidates';
import {
  X,
  AlertTriangle,
  FileText,
  Calculator,
  Route,
  Scale,
} from 'lucide-react';

export interface CandidateDossierModalProps {
  dossier: CandidateDossierResponse | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const CandidateDossierModal: React.FC<CandidateDossierModalProps> = ({
  dossier,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  {dossier?.candidate.candidate_id || 'CANDIDATE'}
                </span>
                <span className="text-xs text-slate-400">Gujarat Location Dossier</span>
              </div>
              <h2 className="text-lg font-bold text-white truncate max-w-xl">
                {dossier?.candidate.name || 'Loading candidate...'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading || !dossier ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Retrieving spatial evidence and audit breakdown...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Score Card */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Overall Ranking</span>
                <div className="flex items-baseline gap-2 mt-2">
                  {dossier.is_rankable ? (
                    <>
                      <span className="font-mono text-3xl font-extrabold text-teal-400">
                        {dossier.final_score}
                      </span>
                      <span className="text-xs text-slate-400">/ 100</span>
                      <span className="ml-auto font-mono text-sm font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded">
                        #{dossier.rank}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-400 font-bold text-sm">NOT RANKABLE</span>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Confidence:</span>
                  <span className="font-semibold text-slate-200">{dossier.confidence_tier}</span>
                </div>
              </div>

              {/* Demand Proxy */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Commercial Traffic (AADT)</span>
                <div className="mt-2 font-mono text-2xl font-bold text-white">
                  {dossier.candidate.aadt_commercial_traffic
                    ? `${dossier.candidate.aadt_commercial_traffic.toLocaleString()} PCU/d`
                    : 'N/A'}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Corridor:</span>
                  <span className="font-semibold text-teal-400 truncate max-w-[120px]">
                    {dossier.candidate.highway_corridor}
                  </span>
                </div>
              </div>

              {/* Service Gap & Nearest Station */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Nearest Station Road Dist</span>
                <div className="mt-2 font-mono text-2xl font-bold text-teal-300">
                  {dossier.nearest_station
                    ? `~${dossier.nearest_station.driving_road_distance_km} km`
                    : 'N/A'}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Detour Ratio:</span>
                  <span className="font-semibold text-slate-200">
                    {dossier.nearest_station ? `${dossier.nearest_station.detour_ratio}x` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Pipeline Hookup Proximity */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Pipeline Proximity</span>
                <div className="mt-2 font-mono text-2xl font-bold text-white">
                  {dossier.candidate.pipeline_proximity_meters !== null
                    ? `~${dossier.candidate.pipeline_proximity_meters} m`
                    : 'N/A'}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Data Completeness:</span>
                  <span className="font-semibold text-emerald-400">
                    {dossier.data_completeness_pct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Renormalization Banner (if applied) */}
            {dossier.renormalization_applied && (
              <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-start gap-2.5">
                <Scale className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-blue-300">Transparent Weight Renormalization Applied</div>
                  <p className="text-[11px] text-blue-300/80 mt-0.5">
                    Certain non-essential criteria were unavailable for this candidate. To prevent penalizing the location with a zero score, the remaining weights were mathematically renormalized so they sum to 100%.
                  </p>
                </div>
              </div>
            )}

            {/* Unrankable Warning (if not rankable) */}
            {!dossier.is_rankable && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300">Designated as Not Rankable</div>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    {dossier.unrankable_reason}
                  </p>
                </div>
              </div>
            )}

            {/* Mathematical Scoring Breakdown Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-teal-400" />
                  <span>Evaluation Criteria & Mathematical Attribution</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Final Score = Σ (Normalized Score × Effective Weight)
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-3">Evaluation Criterion</th>
                      <th className="py-2.5 px-3">Raw Metric</th>
                      <th className="py-2.5 px-3">Normalized (0-100)</th>
                      <th className="py-2.5 px-3">Base Weight</th>
                      <th className="py-2.5 px-3">Effective Weight</th>
                      <th className="py-2.5 px-3 text-right">Points Contributed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {dossier.scoring_breakdown.map((item) => (
                      <tr key={item.criterion_key} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-medium text-slate-200">{item.criterion_name}</div>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                            {item.explanation}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.raw_value !== null ? `${item.raw_value} ${item.unit}` : <span className="text-slate-500 italic">Missing</span>}
                        </td>
                        <td className="py-2.5 px-3 text-teal-400 font-bold">
                          {item.normalized_score !== null ? item.normalized_score.toFixed(1) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {Math.round(item.base_weight * 100)}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.is_missing ? (
                            <span className="text-slate-500">0% (Excluded)</span>
                          ) : (
                            `${Math.round(item.effective_weight * 100)}%`
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {item.weighted_contribution !== null
                            ? item.weighted_contribution.toFixed(1)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spatial & Cannibalization Evidence Card */}
            {dossier.nearest_station && (
              <div className="p-4 bg-slate-800/40 border border-slate-700/80 rounded-xl space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Route className="w-4 h-4 text-teal-400" />
                  <span>Network Spatial & Cannibalization Analysis</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="text-slate-400">Nearest Operating Station:</div>
                    <div className="font-semibold text-slate-100 text-sm">
                      {dossier.nearest_station.station_name} ({dossier.nearest_station.city})
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Coordinates: {dossier.nearest_station.nearest_lat != null && dossier.nearest_station.nearest_lng != null ? `${dossier.nearest_station.nearest_lat.toFixed(4)}, ${dossier.nearest_station.nearest_lng.toFixed(4)}` : 'Recorded in Network Registry'}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Geodesic (Air) Distance:</span>
                      <span className="font-mono text-slate-200">
                        {dossier.nearest_station.straight_line_distance_km} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estimated Road Transit:</span>
                      <span className="font-mono text-teal-400 font-bold">
                        ~{dossier.nearest_station.driving_road_distance_km} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Detour Factor:</span>
                      <span className="font-mono text-slate-300">
                        {dossier.nearest_station.detour_ratio}x
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
                      <span className="text-slate-400">Cannibalization Risk:</span>
                      {dossier.nearest_station.is_network_cannibalization_risk ? (
                        <span className="text-amber-400 font-bold">High Risk (&lt; 2.0 km)</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Safe Buffer (&gt; 2.0 km)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Audit Explanation */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Auditable Decision-Support Narrative</span>
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {dossier.full_audit_explanation}
              </p>
            </div>

            {/* Data Provenance & Methodology */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold text-[11px]">Primary Source Citation</span>
                <p className="text-slate-200 font-medium">{dossier.candidate.source_reference}</p>
                <p className="text-[10px] text-slate-500">Source Type: {dossier.candidate.source_type}</p>
              </div>

              <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold text-[11px]">Station Verification Policy</span>
                <p className="text-slate-200">
                  Candidate location records are preserved strictly separate from operational station databases.
                </p>
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-500 leading-normal">
              <strong>Statutory Feasibility Disclaimer:</strong> {dossier.feasibility_disclaimer}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Seva First Innovation Challenge 2026 • PS000002 Gujarat Gas Company Limited</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
