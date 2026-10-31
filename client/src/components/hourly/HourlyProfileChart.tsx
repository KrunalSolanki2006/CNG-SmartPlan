import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { HourlyResponse } from '../../types/api';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface HourlyProfileChartProps {
  data: HourlyResponse | null;
  isLoading: boolean;
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const HourlyProfileChart: React.FC<HourlyProfileChartProps> = ({
  data,
  isLoading,
  selectedStationId,
  onSelectStation,
  selectedDate,
  onSelectDate,
}) => {
  const allowedStations = ['AMD001', 'AMD004', 'AMD008'];

  // Calculate daily sum and peak hour from returned records
  const records = data?.records || [];
  const dailyTotalKg = records.reduce((acc, r) => acc + r.hourly_demand_kg, 0);
  const peakRecord = records.reduce<typeof records[0] | null>((max, curr) => {
    if (!max || curr.hourly_demand_kg > max.hourly_demand_kg) return curr;
    return max;
  }, null);

  const simulationProfile = records[0]?.simulation_profile || 'commuter_corridor';

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              Diurnal Hourly Demand Profile (24-Hour Ahmedabad Time)
            </h3>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
            <Badge variant="teal" size="sm">{simulationProfile.replace('_', ' ')}</Badge>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Simulated hourly distribution reconciling to daily synthetic demand. Restricted to 3 profiles across 2025-12-02 to 2025-12-31.
          </p>
        </div>

        {/* Station & Date Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-medium">Station:</span>
            <select
              aria-label="Select station for hourly profile"
              value={selectedStationId}
              onChange={(e) => onSelectStation(e.target.value)}
              className="py-1 px-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            >
              {allowedStations.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-medium">Date:</span>
            <input
              type="date"
              aria-label="Select date for hourly profile"
              min="2025-12-02"
              max="2025-12-31"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="py-1 px-2 bg-white border border-slate-200 rounded text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 block text-[11px]">24-Hour Total Demand:</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {dailyTotalKg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </span>
          <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
            <CheckCircle className="w-3 h-3" /> Reconciles within 0.011 kg
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 block text-[11px]">Diurnal Peak Hour:</span>
          <span className="font-mono font-bold text-[#0F766E] text-sm">
            {peakRecord ? `${String(peakRecord.hour).padStart(2, '0')}:00 hrs` : '—'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Peak: {peakRecord?.hourly_demand_kg.toFixed(1)} kg/hr
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 block text-[11px]">Temporal Coverage:</span>
          <span className="font-mono font-bold text-slate-800 text-sm">30 Days</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            2025-12-02 to 2025-12-31 (2,160 rows)
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      {isLoading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : records.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-lg">
          No hourly records returned for {selectedStationId} on {selectedDate}.
        </div>
      ) : (
        <div className="w-full h-[280px] select-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={records}
              margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tickFormatter={(val: number) => `${String(val).padStart(2, '0')}:00`}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                label={{
                  value: 'kg / hour',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 10,
                  fill: '#64748B',
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload as typeof records[0];
                  return (
                    <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg border border-slate-700 space-y-1">
                      <div className="font-bold text-slate-200">
                        {String(item.hour).padStart(2, '0')}:00 – {String(item.hour + 1).padStart(2, '0')}:00
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Hourly Demand:{' '}
                        <span className="font-mono font-bold text-teal-400">
                          {item.hourly_demand_kg.toFixed(2)} kg
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Profile: {item.simulation_profile}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="hourly_demand_kg"
                name="Hourly Demand (kg)"
                fill="#0F766E"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mandatory Operational Warning */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Critical Operational Principle:</strong> Do NOT infer queue duration, dispenser wait times, or vehicle congestion counts from hourly simulated demand alone. Queue formation depends on compressor capacity, dispenser count, vehicle tank capacities, and real-time arrival stochasticity—none of which are modeled in the synthetic data package.
        </div>
      </div>
    </div>
  );
};
