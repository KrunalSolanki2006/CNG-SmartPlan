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
import { Skeleton } from '../ui/Skeleton';
import { AlertCircle } from 'lucide-react';

interface SupplyAlertChartProps {
  comparison: SupplyComparisonPoint[];
  isLoading: boolean;
  stationId: string;
  onApplyPresetSupply?: (targetKg: number) => void;
}

export const SupplyAlertChart: React.FC<SupplyAlertChartProps> = ({
  comparison,
  isLoading,
  stationId,
  onApplyPresetSupply,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[340px] w-full" />
      </div>
    );
  }

  if (comparison.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-xs text-center text-xs text-slate-500">
        No supply comparison points available for {stationId}. Run a supply check above.
      </div>
    );
  }

  const missingSupplyCount = comparison.filter((c) => c.planned_supply_kg === null).length;

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">
              Forecast Demand vs. Planned Available Supply ({stationId})
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Same-date evaluation: Shortfall occurs when forecast demand exceeds planned supply
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Unit:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-[11px]">
            kg / day
          </span>
        </div>
      </div>

      {/* Planned Supply Schedule Notice */}
      {missingSupplyCount > 0 && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-900 leading-snug">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-slate-900">Future Supply Notice:</strong> {missingSupplyCount} date(s) in this horizon lack allocated supply schedules (schedule terminates on 2025-12-31). Use the <em>Supply Override Form</em> below or simulate a scenario:
            </div>
          </div>
          {onApplyPresetSupply && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onApplyPresetSupply(1700)}
                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
              >
                Standard (1,700 kg)
              </button>
              <button
                type="button"
                onClick={() => onApplyPresetSupply(1300)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
              >
                Stress Test (1,300 kg)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recharts Multi-Series Container */}
      <div className="w-full h-[340px] select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={comparison}
            margin={{ top: 12, right: 16, bottom: 20, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ECE6D9" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#647078"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E3DDCE' }}
              tickFormatter={(val: string) => {
                const parts = val.split('-');
                return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
              }}
            />

            <YAxis
              stroke="#647078"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E3DDCE' }}
              tickFormatter={(val: number) => `${Math.round(val).toLocaleString()}`}
              domain={[0, 'auto']}
              label={{
                value: 'kg / day',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#647078',
                offset: 5,
              }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as SupplyComparisonPoint;
                return (
                  <div className="bg-[#001219]/95 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs space-y-1.5 min-w-[220px]">
                    <div className="font-bold border-b border-slate-800 pb-1 text-slate-400 flex justify-between items-center">
                      <span>Date: {label}</span>
                      <span className="text-[10px] text-[#94D2BD] capitalize">
                        {point.supply_data_origin.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-[#94D2BD]">
                        <span className="w-2 h-2 rounded-full bg-[#0A9396] inline-block" />
                        Forecast Demand:
                      </span>
                      <span className="font-mono font-bold text-white">
                        {point.forecast_demand_kg.toLocaleString()} kg/day
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-[#005F73] inline-block" />
                        Planned Supply:
                      </span>
                      <span className="font-mono font-bold text-white">
                        {point.planned_supply_kg !== null
                          ? `${point.planned_supply_kg.toLocaleString()} kg/day`
                          : 'Unavailable (Post-2025)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <span className="flex items-center gap-1.5 text-[#AE2012]">
                        <span className="w-2 h-2 rounded-full bg-[#AE2012] inline-block" />
                        Potential Shortfall:
                      </span>
                      <span className="font-mono font-bold text-[#AE2012]">
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

            {/* Potential Shortfall Bar (Ember / Vermilion) */}
            <Bar
              dataKey="potential_shortfall_kg"
              name="Potential Shortfall (kg/day)"
              fill="#AE2012"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />

            {/* Forecast Demand Line (Mineral Teal) */}
            <Line
              type="monotone"
              dataKey="forecast_demand_kg"
              name="Forecast Demand"
              stroke="#0A9396"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#0A9396' }}
            />

            {/* Planned Available Supply Line (Deep Ocean dashed) */}
            <Line
              type="monotone"
              dataKey="planned_supply_kg"
              name="Planned Available Supply"
              stroke="#005F73"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#005F73' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Operational Summary */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-4 h-4 text-[#005F73] shrink-0" />
        <span>
          Planning shortfalls indicate operational dates where forecasted consumer demand exceeds scheduled supply allocation.
        </span>
      </div>
    </div>
  );
};
