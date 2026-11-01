import React from 'react';
import { Fuel, ArrowRightLeft, TrendingUp, Sparkles } from 'lucide-react';
import { AnimatedCounter } from '../reactbits/AnimatedCounter';
import { Badge } from '../ui/Badge';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { ImpactSimulatorResponse } from '../../types/api';

interface SimulatorResultsCardsProps {
  data: ImpactSimulatorResponse;
}

export const SimulatorResultsCards: React.FC<SimulatorResultsCardsProps> = ({ data }) => {
  const { results, assumptions } = data;

  const proposed = results.proposed_station_demand_kg_per_day;
  const diverted = results.estimated_diverted_demand_kg_per_day;
  const netAdditional = results.net_additional_network_demand_kg_per_day;

  const diversionPct = proposed > 0 ? Math.round((diverted / proposed) * 100) : 0;
  const netPct = proposed > 0 ? Math.round((netAdditional / proposed) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0F766E]" />
          <h3 className="font-bold text-sm text-[#0F172A] uppercase tracking-wider">
            Network Demand Impact Results
          </h3>
          <DataOriginBadge origin={data.data_origin} size="sm" />
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Radius: {assumptions.catchment_radius_km} km | Catchment: {assumptions.catchment_demand_kg_per_day.toLocaleString()} kg/day
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Proposed Station Demand */}
        <div className="rounded-card bg-white p-5 border border-slate-200 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0F766E]" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wide flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5" />
                Proposed Station Demand
              </span>
              <Badge variant="teal" size="sm">
                Capture {(assumptions.capture_proportion * 100).toFixed(0)}%
              </Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-[#0F172A]">
                  <AnimatedCounter value={proposed} decimals={1} />
                </span>
                <span className="text-xs text-slate-500 font-medium">kg/day</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total CNG throughput expected to be pumped at the proposed outlet.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
            <span>Market capture: {(assumptions.catchment_demand_kg_per_day * assumptions.capture_proportion).toFixed(1)}</span>
            <span>+ Access: {(assumptions.accessibility_demand_kg_per_day ?? 0).toFixed(1)}</span>
          </div>
        </div>

        {/* Metric 2: Diverted Demand */}
        <div className="rounded-card bg-white p-5 border border-slate-200 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Diverted Customer Demand
              </span>
              <Badge variant="warning" size="sm">
                Cannibalization {diversionPct}%
              </Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-amber-900">
                  <AnimatedCounter value={diverted} decimals={1} />
                </span>
                <span className="text-xs text-slate-500 font-medium">kg/day</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Portion cannibalized from existing operating CNG stations in the vicinity.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
            <span>Cannibalized rate:</span>
            <span className="text-amber-800 font-bold">{(assumptions.diversion_proportion * 100).toFixed(0)}% of station sales</span>
          </div>
        </div>

        {/* Metric 3: Net Additional Network Demand */}
        <div className="rounded-card bg-white p-5 border border-slate-200 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Net Additional Network Demand
              </span>
              <Badge variant="success" size="sm">
                Net Expansion {netPct}%
              </Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-emerald-900">
                  <AnimatedCounter value={netAdditional} decimals={1} />
                </span>
                <span className="text-xs text-slate-500 font-medium">kg/day</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Genuinely incremental new demand added to the overall Ahmedabad network.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
            <span>Incremental network gain:</span>
            <span className="text-emerald-700 font-bold">+{netPct}% new volume</span>
          </div>
        </div>
      </div>
    </div>
  );
};
