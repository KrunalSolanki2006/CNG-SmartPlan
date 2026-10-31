import React from 'react';
import { AlertCircle, ShieldAlert, Cpu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { EmptyState } from '../components/ui/EmptyState';

export const AlertsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header card with rules */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-[#0F172A]">
              Potential Supply-Shortfall Alerts
            </h2>
            <Badge variant="warning">Feature C</Badge>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Compares station-level forecast demand against planned available supply. Identifies potential planning shortfalls to support proactive delivery scheduling.
          </p>
        </div>
      </div>

      {/* Formula & Rule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-xs">Shortfall Formula</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-[#0F766E]">
              potential_shortfall_kg = max(0, forecast_demand_kg - planned_supply_kg)
            </div>
            <p className="text-[#64748B] text-[11px]">
              Calculated on overlapping station-date pairs. Zero shortfall when planned supply meets or exceeds demand.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-xs">Planning Shortfall vs. Stockout</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-[#64748B] space-y-1.5 leading-snug">
            <p>
              A <strong>potential planning shortfall</strong> indicates a planned supply deficit before the day commences.
            </p>
            <p>
              It does <em>not</em> confirm an actual physical stockout or line closure, which depends on real-time compressor and line-pack buffers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-xs">Future Supply Overrides</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-[#64748B] space-y-1.5 leading-snug">
            <p>
              Synthetic planned supply spans only 2024-01-01 to 2025-12-31.
            </p>
            <p>
              Forecast dates beyond 2025 require planner manual overrides via <code className="font-mono text-[11px] text-[#0F172A]">user_supply_overrides</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Container / Placeholder State */}
      <EmptyState
        icon={<AlertCircle className="w-6 h-6 text-amber-600" />}
        title="Supply Alerts Shell Established"
        description="The typed API client for POST /api/v1/supply-check is established. The multi-line supply vs. demand chart and interactive supply override tables will connect during Milestone 3 backend integration."
        badge={<DataOriginBadge origin="synthetic_demo" size="sm" />}
      />
    </div>
  );
};
