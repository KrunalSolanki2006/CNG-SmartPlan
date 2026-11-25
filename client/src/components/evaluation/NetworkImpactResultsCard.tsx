import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Layers,
} from 'lucide-react';
import {
  NetworkImpactSimulationResponse,
  OverallAssessmentLabel,
} from '../../types/candidates';

export interface NetworkImpactResultsCardProps {
  simulation: NetworkImpactSimulationResponse;
}

function getAssessmentBadgeStyle(label: OverallAssessmentLabel): string {
  switch (label) {
    case 'Potential Coverage Gap':
      return 'bg-[#0A9396]/15 text-[#005F73] border-[#0A9396]/40';
    case 'Potential Network Expansion Opportunity':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    case 'Moderate Geographical Overlap':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'High Existing Station Density':
      return 'bg-amber-100 text-amber-900 border-amber-400';
    case 'Insufficient Data':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export const NetworkImpactResultsCard: React.FC<NetworkImpactResultsCardProps> = ({
  simulation,
}) => {
  const { geographical_metrics: gm, diversion_assessment: da, proposed_station } = simulation;

  return (
    <div className="rounded-2xl bg-[#0B1320] text-slate-100 p-4 border border-slate-800 shadow-md space-y-4 text-xs">
      {/* Header & Overall Assessment */}
      <div className="flex flex-col gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#5EEAD4]" />
            <span className="font-bold text-sm text-white">Network Impact Simulation</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Radius: {simulation.radius_km} km
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400">Overall Location Assessment</span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border bg-white ${getAssessmentBadgeStyle(
              simulation.overall_assessment
            )}`}
          >
            {simulation.overall_assessment}
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          {simulation.assessment_summary}
        </p>
      </div>

      {/* Calculated Geographical Metrics */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5EEAD4]">
            Calculated Geographical Metrics
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Haversine • {gm.total_verified_stations_checked} Verified Stations
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400">Verified Stations in Radius</div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {gm.nearby_verified_count}
            </div>
            <div className="text-[10px] text-slate-400">within {simulation.radius_km} km</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400">Nearest Existing Station</div>
            {gm.nearest_station ? (
              <>
                <div className="text-lg font-bold font-mono text-[#5EEAD4] mt-0.5">
                  {gm.nearest_station.distance_km.toFixed(2)} km
                </div>
                <div className="text-[10px] text-slate-300 truncate" title={gm.nearest_station.station_name}>
                  {gm.nearest_station.station_name}
                </div>
              </>
            ) : (
              <div className="text-xs font-semibold text-slate-400 mt-1">Insufficient Data</div>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400">Farthest Nearby (in Radius)</div>
            {gm.farthest_nearby_station ? (
              <>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {gm.farthest_nearby_station.distance_km.toFixed(2)} km
                </div>
                <div className="text-[10px] text-slate-300 truncate" title={gm.farthest_nearby_station.station_name}>
                  {gm.farthest_nearby_station.station_name}
                </div>
              </>
            ) : (
              <div className="text-[11px] text-slate-400 mt-1">None within {simulation.radius_km} km</div>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400">Geographical Coverage Gain</div>
            <div className="text-base font-bold text-[#5EEAD4] mt-0.5">
              {gm.coverage_improvement_level}
            </div>
            <div className="text-[10px] text-slate-400">
              Overlap: <span className="text-slate-200 font-semibold">{gm.overlap_level}</span>
            </div>
          </div>
        </div>

        {/* Coverage & Overlap Summaries */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5 text-[11px]">
          <div className="flex items-start gap-2">
            <Compass className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0 mt-0.5" />
            <span className="text-slate-300">
              <strong className="text-white">Coverage Improvement:</strong> {gm.coverage_improvement_summary}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-slate-300">
              <strong className="text-white">Existing Station Overlap:</strong> {gm.overlap_summary}
            </span>
          </div>
        </div>
      </div>

      {/* User-Entered Capacity Reference (if provided) */}
      {proposed_station.expected_daily_capacity_kg != null && (
        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Proposed Design Capacity (User Input)</span>
          <span className="font-mono font-bold text-white">
            {proposed_station.expected_daily_capacity_kg.toLocaleString()} kg/day
          </span>
        </div>
      )}

      {/* Honest Model / Customer Diversion Disclosure */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Customer Diversion / Sales Model</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold text-[10px] border border-amber-500/30">
            {da.status}
          </span>
        </div>
        <p className="text-[11px] text-amber-100/90 leading-relaxed">
          {da.explanation}
        </p>
      </div>

      {/* Data Integrity Note */}
      <div className="flex items-start gap-1.5 text-[10px] text-slate-400 pt-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#0A9396] shrink-0 mt-0.5" />
        <span>{simulation.data_integrity_note}</span>
      </div>
    </div>
  );
};
