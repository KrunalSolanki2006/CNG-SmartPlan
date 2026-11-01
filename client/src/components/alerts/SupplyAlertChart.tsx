import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SupplyComparisonPoint } from '../../types/api';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { Skeleton } from '../ui/Skeleton';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface SupplyAlertChartProps {
  comparison: SupplyComparisonPoint[];
  isLoading: boolean;
  stationId: string;
}

export const SupplyAlertChart: React.FC<SupplyAlertChartProps> = ({
  comparison,
  isLoading,
  stationId,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[340px] w-full" />
      </div>
    );
  }

  if (comparison.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 border border-[#DCE4E8] shadow-card text-center text-xs text-slate-500">
        No supply comparison points available for {stationId}. Run a supply check above.
      </div>
    );
  }

  const missingSupplyCount = comparison.filter((c) => c.planned_supply_kg === null).length;

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Forecast Demand vs. Planned Available Supply ({stationId})
            </h3>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Same-date evaluation: Shortfall occurs when forecast demand exceeds planned supply
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Unit:</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-800 text-[11px]">
            kg / day
          </span>
        </div>
      </div>

      {/* Post-2025 Missing Supply Warning */}
      {missingSupplyCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 leading-snug">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Future Supply Notice:</strong> {missingSupplyCount} date(s) in this horizon lack synthetic planned supply (which terminates on 2025-12-31). Use the <em>Supply Override Form</em> below to input user-entered supply targets.
          </div>
        </div>
      )}

      {/* Recharts Multi-Series Container */}
      <div className="w-full h-[340px] select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={comparison}
            margin={{ top: 12, right: 16, bottom: 20, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tickFormatter={(val: string) => {
                const parts = val.split('-');
                return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
              }}
            />

            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tickFormatter={(val: number) => `${Math.round(val).toLocaleString()}`}
              domain={[0, 'auto']}
              label={{
                value: 'kg / day',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#64748B',
                offset: 5,
              }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as SupplyComparisonPoint;
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[220px]">
                    <div className="font-bold border-b border-slate-700 pb-1 text-slate-200 flex justify-between items-center">
                      <span>Date: {label}</span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {point.supply_data_origin.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Forecast Demand:
                      </span>
                      <span className="font-mono font-bold">
                        {point.forecast_demand_kg.toLocaleString()} kg/day
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-teal-400">
                        <span className="w-2 h-2 rounded-full bg-[#0F766E] inline-block" />
                        Planned Supply:
                      </span>
                      <span className="font-mono font-bold">
                        {point.planned_supply_kg !== null
                          ? `${point.planned_supply_kg.toLocaleString()} kg/day`
                          : 'Unavailable (Post-2025)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <span className="flex items-center gap-1.5 text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        Potential Shortfall:
                      </span>
                      <span className="font-mono font-bold text-red-300">
                        {point.potential_shortfall_kg !== null
                          ? `${point.potential_shortfall_kg.toLocaleString()} kg/day`
                          : '—'}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {/* Potential Shortfall Bar (Red) */}
            <Bar
              dataKey="potential_shortfall_kg"
              name="Potential Shortfall (kg/day)"
              fill="#DC2626"
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />

            {/* Forecast Demand Line (Blue) */}
            <Line
              type="monotone"
              dataKey="forecast_demand_kg"
              name="Forecast Demand"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563EB' }}
            />

            {/* Planned Available Supply Line (Teal) */}
            <Line
              type="monotone"
              dataKey="planned_supply_kg"
              name="Planned Available Supply"
              stroke="#0F766E"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#0F766E' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Clarification banner */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-[#64748B]">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Planning shortfalls represent a theoretical supply deficit against forecasted demand. They do not confirm physical station outages or pump queues.
        </span>
      </div>
    </div>
  );
};
