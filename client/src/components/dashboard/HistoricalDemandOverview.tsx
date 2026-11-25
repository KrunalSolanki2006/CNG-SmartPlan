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
import { TrendingUp, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
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
    <Card className="rounded-2xl border-slate-200 bg-white shadow-xs hover:shadow-sm transition-all">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
              Historical Demand Profile
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 font-normal">
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
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {eligibleStations.map((st) => (
              <option key={st.station_id} value={st.station_id}>
                {st.station_id} — {st.station_name}
              </option>
            ))}
          </select>

          {/* Aggregation Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setAggregation('daily')}
              className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                aggregation === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setAggregation('weekly')}
              className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                aggregation === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
          </div>
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
            icon={<Calendar className="w-6 h-6 text-[#0A9396]" />}
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
                      <stop offset="5%" stopColor="#005F73" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#005F73" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
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
                          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5">
                            <p className="font-medium text-slate-300 text-[11px]">
                              {point.date} ({point.day_of_week})
                            </p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-teal-400 font-bold text-base tracking-tight font-mono">
                                {formatKgPerDay(point.demand_kg)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">recorded</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/30 text-[10px] text-teal-300 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                              {point.simulation_profile}
                            </div>
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
                    stroke="#005F73"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#demandGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
