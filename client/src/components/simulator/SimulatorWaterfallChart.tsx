import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { ImpactSimulatorResponse } from '../../types/api';

interface SimulatorWaterfallChartProps {
  data: ImpactSimulatorResponse;
}

export const SimulatorWaterfallChart: React.FC<SimulatorWaterfallChartProps> = ({ data }) => {
  const { results, assumptions } = data;

  const proposed = results.proposed_station_demand_kg_per_day;
  const diverted = results.estimated_diverted_demand_kg_per_day;
  const netAdditional = results.net_additional_network_demand_kg_per_day;

  const chartData = [
    {
      category: 'Catchment Demand',
      volume: assumptions.catchment_demand_kg_per_day,
      type: 'baseline',
      color: '#94A3B8',
      description: 'Total estimated pool in catchment zone',
    },
    {
      category: 'Proposed Station',
      volume: proposed,
      type: 'attracted',
      color: '#0F766E',
      description: 'Gross volume attracted by candidate station',
    },
    {
      category: 'Diverted Volume',
      volume: diverted,
      type: 'cannibalized',
      color: '#D97706',
      description: 'Cannibalized from existing network stations',
    },
    {
      category: 'Net Network Gain',
      volume: netAdditional,
      type: 'net_gain',
      color: '#059669',
      description: 'Truly incremental demand expansion',
    },
  ];

  const diversionPct = proposed > 0 ? ((diverted / proposed) * 100).toFixed(1) : '0';
  const netPct = proposed > 0 ? ((netAdditional / proposed) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#0F766E]/10 text-[#0F766E]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#0F172A] uppercase tracking-wider">
              Demand Flow & Cannibalization Breakdown
            </h4>
            <p className="text-[11px] text-slate-500">
              Visual comparison of catchment volume, gross candidate capture, diversion, and net system gain
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Diverted: {diversionPct}%
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Net Gain: {netPct}%
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis
              tick={{ fill: '#64748B', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
              label={{
                value: 'CNG Demand (kg/day)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#64748B', fontSize: 10 },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs space-y-1 font-sans">
                      <p className="font-bold text-slate-200">{item.category}</p>
                      <p className="font-mono text-sm font-semibold text-teal-300">
                        {item.volume.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                        <span className="text-xs text-slate-300 font-normal">kg/day</span>
                      </p>
                      <p className="text-[10px] text-slate-400">{item.description}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Horizontal Share Breakdown Bar */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Proposed Station Output Composition:</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {proposed.toLocaleString()} kg/day = 100%
          </span>
        </div>

        <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.min(100, Math.max(0, parseFloat(diversionPct)))}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`Diverted from existing network: ${diversionPct}%`}
          />
          <div
            style={{ width: `${Math.min(100, Math.max(0, parseFloat(netPct)))}%` }}
            className="bg-emerald-600 h-full transition-all duration-500"
            title={`Net new network demand: ${netPct}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Cannibalized from Existing Network ({diverted.toLocaleString()} kg/day • {diversionPct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Net Additional System Volume ({netAdditional.toLocaleString()} kg/day • {netPct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
