import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, Calendar, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { useHistory } from '../../hooks/useHistory';
import { Station } from '../../types/api';
import { formatKgPerDay } from '../../utils/formatters';

export interface HistoricalDemandOverviewProps {
  stations: Station[];
}

export const HistoricalDemandOverview: React.FC<HistoricalDemandOverviewProps> = ({
  stations,
}) => {
  const eligibleStations = stations.filter((s) => s.eligible_for_simulation);
  const defaultStationId = eligibleStations[0]?.station_id || 'AMD001';

  const [selectedStationId, setSelectedStationId] = useState<string>(defaultStationId);
  const [aggregation, setAggregation] = useState<'daily' | 'weekly'>('daily');

  const { data, isLoading, error, refetch } = useHistory(selectedStationId, {
    aggregation,
  });

  const selectedStation = stations.find((s) => s.station_id === selectedStationId);

  return (
    <Card className="border-[#DCE4E8] shadow-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3EF] text-[#0F766E] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-[#0F172A]">
              Historical Demand Profile
            </CardTitle>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <CardDescription>
            {selectedStation
              ? `${selectedStation.station_name} (${selectedStation.station_id}) — ${selectedStation.locality}`
              : 'Station demand time series'}
          </CardDescription>
        </div>

        {/* Controls: Station selector & Aggregation toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Station Selector */}
          <select
            id="history-station-select"
            aria-label="Select station for demand history"
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
            className="rounded-lg border border-[#DCE4E8] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            {eligibleStations.map((st) => (
              <option key={st.station_id} value={st.station_id}>
                {st.station_id} — {st.station_name}
              </option>
            ))}
          </select>

          {/* Aggregation Toggle */}
          <div className="inline-flex rounded-lg border border-[#DCE4E8] p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setAggregation('daily')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                aggregation === 'daily'
                  ? 'bg-white text-[#0F766E] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setAggregation('weekly')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                aggregation === 'weekly'
                  ? 'bg-white text-[#0F766E] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Weekly
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            aria-label="Refresh historical chart"
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton variant="chart" className="border-0 shadow-none p-0" />
        ) : error ? (
          <ErrorState
            title="Failed to Load Station History"
            code={error.code}
            message={error.message}
            onRetry={refetch}
          />
        ) : !data || !data.series || data.series.length === 0 ? (
          <EmptyState
            title="No Historical Demand Records"
            description="The selected station has no records for the current parameter range."
            icon={<Calendar className="w-6 h-6 text-[#0F766E]" />}
          />
        ) : (
          <div>
            {/* Chart Area */}
            <div
              className="h-72 w-full pt-4"
              role="img"
              aria-label={`Historical demand chart for ${data.station_name}. Showing ${data.total_records} records.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.series}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    minTickGap={40}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val} kg`}
                    width={65}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const point = payload[0].payload;
                        return (
                          <div className="bg-[#0F172A] text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-slate-200">
                              {point.date} ({point.day_of_week})
                            </p>
                            <p className="text-teal-300 font-bold text-sm">
                              Demand: {formatKgPerDay(point.demand_kg)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Profile: {point.simulation_profile}
                            </p>
                            <p className="text-[10px] text-[#A78BFA]">
                              ⚠ Synthetic Simulation
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="demand_kg"
                    name="CNG Demand (kg)"
                    stroke="#0F766E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#demandGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Mandatory Synthetic Data Notice */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-[#64748B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-purple-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                <span>{data.note}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {data.total_records} records • {data.date_range_start} to {data.date_range_end}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
