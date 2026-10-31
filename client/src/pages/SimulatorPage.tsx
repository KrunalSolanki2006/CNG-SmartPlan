import React from 'react';
import { Sliders, Calculator } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { EmptyState } from '../components/ui/EmptyState';

export const SimulatorPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-[#0F172A]">
              New-Station Impact Simulator
            </h2>
            <Badge variant="synthetic">Signature Feature E</Badge>
            <DataOriginBadge origin="illustrative_scenario" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Estimates customer demand capture, diversion from nearby existing stations, and net additional CNG network demand for prospective station investments.
          </p>
        </div>
      </div>

      {/* Formulas Applied Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-sm">Canonical Simulation Formulas</CardTitle>
            </div>
            <span className="text-[11px] text-[#64748B]">
              Transparent rule-based calculation
            </span>
          </div>
          <CardDescription>
            All results derived directly from user-supplied planning assumptions:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wide block mb-1">
                1. Proposed Demand
              </span>
              <p className="font-mono text-xs text-[#0F172A] mb-1">
                (catchment_demand × capture) + accessibility_demand
              </p>
              <p className="text-[11px] text-[#64748B]">
                Total CNG throughput attracted by the proposed station (kg/day).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide block mb-1">
                2. Diverted Demand
              </span>
              <p className="font-mono text-xs text-[#0F172A] mb-1">
                proposed_demand × diversion_proportion
              </p>
              <p className="text-[11px] text-[#64748B]">
                Volume cannibalized from existing operating network stations (kg/day).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide block mb-1">
                3. Net Additional Demand
              </span>
              <p className="font-mono text-xs text-[#0F172A] mb-1">
                proposed_demand − diverted_demand
              </p>
              <p className="text-[11px] text-[#64748B]">
                Genuinely new incremental sales added to the overall network (kg/day).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Container / Placeholder State */}
      <EmptyState
        icon={<Sliders className="w-6 h-6 text-[#0F766E]" />}
        title="Impact Simulator Shell Established"
        description="The typed API client for POST /api/v1/impact-simulator is ready. Interactive range sliders (radius, capture, diversion, demand), client-side range validation, and real-time scenario outputs will connect in Milestone 5."
        badge={<DataOriginBadge origin="illustrative_scenario" size="sm" />}
      />
    </div>
  );
};
