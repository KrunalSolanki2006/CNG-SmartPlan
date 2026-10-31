import React from 'react';
import { Calculator, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { ImpactSimulatorResponse } from '../../types/api';

interface SimulatorFormulasPanelProps {
  data: ImpactSimulatorResponse | null;
}

export const SimulatorFormulasPanel: React.FC<SimulatorFormulasPanelProps> = ({ data }) => {
  const assumptions = data?.assumptions;
  const results = data?.results;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#0F766E]" />
            <CardTitle className="text-sm">Canonical Simulation Formulas</CardTitle>
          </div>
          <span className="text-[11px] text-[#64748B] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Transparent rule-based calculation (AT-I06)
          </span>
        </div>
        <CardDescription>
          All results derived directly from user-supplied planning assumptions via backend API calculations:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Formula 1: Proposed Demand */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wide block mb-1">
                1. Proposed Demand
              </span>
              <p className="font-mono text-xs text-[#0F172A] mb-1 font-semibold">
                (catchment_demand × capture) + accessibility_demand
              </p>
              <p className="text-[11px] text-[#64748B] mb-2 leading-relaxed">
                Total CNG throughput attracted by the proposed station (kg/day).
              </p>
            </div>

            {assumptions && results && (
              <div className="pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-700 bg-white p-2 rounded">
                <span>Evaluated:</span>
                <p className="text-[#0F766E] font-semibold">
                  ({assumptions.catchment_demand_kg_per_day} × {assumptions.capture_proportion}) + {assumptions.accessibility_demand_kg_per_day ?? 0} = {results.proposed_station_demand_kg_per_day.toFixed(1)} kg/day
                </p>
              </div>
            )}
          </div>

          {/* Formula 2: Diverted Demand */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide block mb-1">
                2. Diverted Demand
              </span>
              <p className="font-mono text-xs text-[#0F172A] mb-1 font-semibold">
                proposed_demand × diversion_proportion
              </p>
              <p className="text-[11px] text-[#64748B] mb-2 leading-relaxed">
                Volume cannibalized from existing operating network stations (kg/day).
              </p>
            </div>

            {assumptions && results && (
              <div className="pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-700 bg-white p-2 rounded">
                <span>Evaluated:</span>
                <p className="text-amber-800 font-semibold">
                  {results.proposed_station_demand_kg_per_day.toFixed(1)} × {assumptions.diversion_proportion} = {results.estimated_diverted_demand_kg_per_day.toFixed(1)} kg/day
                </p>
              </div>
            )}
          </div>

          {/* Formula 3: Net Additional Demand */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide block mb-1">
                3. Net Additional Demand
              </span>
              <p className="font-mono text-xs text-[#0F172A] mb-1 font-semibold">
                proposed_demand − diverted_demand
              </p>
              <p className="text-[11px] text-[#64748B] mb-2 leading-relaxed">
                Genuinely new incremental sales added to the overall network (kg/day).
              </p>
            </div>

            {results && (
              <div className="pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-700 bg-white p-2 rounded">
                <span>Evaluated:</span>
                <p className="text-emerald-800 font-semibold">
                  {results.proposed_station_demand_kg_per_day.toFixed(1)} − {results.estimated_diverted_demand_kg_per_day.toFixed(1)} = {results.net_additional_network_demand_kg_per_day.toFixed(1)} kg/day
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
