import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ForecastResponse, HistoricalContextPoint } from '../../types/api';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface ForecastChartProps {
  forecastData: ForecastResponse | null;
  historyPoints?: HistoricalContextPoint[];
  isLoading: boolean;
  includeBaseline: boolean;
}

interface CombinedChartPoint {
  date: string;
  period: 'historical' | 'forecast';
  historical_kg?: number;
  forecast_kg?: number;
  lower_bound_kg?: number | null;
  upper_bound_kg?: number | null;
  uncertainty_band?: [number, number];
  baseline_kg?: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecastData,
  historyPoints,
  isLoading,
  includeBaseline,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-[360px] w-full" />
      </div>
    );
  }

  if (!forecastData || forecastData.forecast.length === 0) {
    const isInsufficient = forecastData?.forecast_status === 'insufficient_data';
    return (
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <EmptyState
          icon={<TrendingUp className="w-8 h-8 text-[#005F73]" />}
          title={isInsufficient ? 'Insufficient Historical Data' : 'No Forecast Available'}
          description={
            forecastData?.key_insight ||
            'Select an eligible station with sufficient historical sales records to generate a forecast.'
          }
        />
      </div>
    );
  }

  // Strictly chronological history ending at data_through_date, followed by forecast starting > data_through_date
  const rawHistory =
    historyPoints && historyPoints.length > 0
      ? historyPoints
      : forecastData.historical_context || [];

  const cutoffDate = forecastData.data_through_date;
  const filteredHistory = rawHistory
    .filter((h) => !cutoffDate || h.date <= cutoffDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const chartData: CombinedChartPoint[] = [];

  filteredHistory.forEach((h) => {
    chartData.push({
      date: h.date,
      period: 'historical',
      historical_kg: h.demand_kg,
    });
  });

  const baselineLookup = new Map(
    (forecastData.baseline_forecast || []).map((b) => [b.date, b.forecast_demand_kg])
  );

  // Never place historical values on forecast dates, and never place forecast values on historical dates
  forecastData.forecast.forEach((f) => {
    const hasBounds = f.lower_bound_kg !== null && f.upper_bound_kg !== null;
    const baselineVal = baselineLookup.get(f.date);

    chartData.push({
      date: f.date,
      period: 'forecast',
      forecast_kg: f.forecast_demand_kg,
      lower_bound_kg: f.lower_bound_kg,
      upper_bound_kg: f.upper_bound_kg,
      uncertainty_band: hasBounds ? [f.lower_bound_kg!, f.upper_bound_kg!] : undefined,
      baseline_kg: includeBaseline && baselineVal !== undefined ? baselineVal : undefined,
    });
  });

  const hasConfidenceBounds = forecastData.forecast.some(
    (f) => f.lower_bound_kg !== null && f.upper_bound_kg !== null
  );

  const unitLabel = 'kg/day';
  const boundaryDate = forecastData.target_start_date;

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Historical vs. Forecasted Demand ({forecastData.station_name} — {forecastData.station_id})
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Trailing {filteredHistory.length} historical days (ending {cutoffDate}) followed by{' '}
            {forecastData.horizon_days}-day {forecastData.model_used} forecast (
            {forecastData.target_start_date} to {forecastData.target_end_date})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Unit:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-[11px]">
            {unitLabel}
          </span>
        </div>
      </div>

      {/* Main Responsive Recharts Container */}
      <div className="w-full h-[360px] select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 18, right: 16, bottom: 20, left: 10 }}
          >
            <defs>
              <linearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0A9396" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#94D2BD" stopOpacity={0.12} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#ECE6D9" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#647078"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E3DDCE' }}
              minTickGap={18}
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
              domain={['auto', 'auto']}
              label={{
                value: unitLabel,
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#647078',
                offset: 5,
              }}
            />

            {boundaryDate && (
              <ReferenceLine
                x={boundaryDate}
                stroke="#475569"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Forecast Start (${boundaryDate})`,
                  position: 'top',
                  fill: '#475569',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0]?.payload as CombinedChartPoint | undefined;
                if (!point) return null;

                return (
                  <div className="bg-[#001219]/95 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs space-y-1.5 min-w-[220px]">
                    <div className="font-bold border-b border-slate-800 pb-1 flex items-center justify-between gap-2">
                      <span className="text-slate-200">{label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          point.period === 'historical'
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-teal-900/70 text-teal-300'
                        }`}
                      >
                        {point.period === 'historical' ? 'Historical' : 'Forecast'}
                      </span>
                    </div>

                    {point.historical_kg !== undefined && (
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-[#005F73] inline-block" />
                          Historical Demand:
                        </span>
                        <span className="font-mono font-bold text-white">
                          {point.historical_kg.toLocaleString()} {unitLabel}
                        </span>
                      </div>
                    )}

                    {point.forecast_kg !== undefined && (
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-[#0A9396] inline-block" />
                          Forecast ({forecastData.model_used}):
                        </span>
                        <span className="font-mono font-bold text-white">
                          {point.forecast_kg.toLocaleString()} {unitLabel}
                        </span>
                      </div>
                    )}

                    {point.lower_bound_kg !== null &&
                      point.lower_bound_kg !== undefined &&
                      point.upper_bound_kg !== null &&
                      point.upper_bound_kg !== undefined && (
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-[#94D2BD] inline-block" />
                            95% Prediction Interval:
                          </span>
                          <span className="font-mono font-semibold text-teal-200">
                            {point.lower_bound_kg.toLocaleString()} –{' '}
                            {point.upper_bound_kg.toLocaleString()} {unitLabel}
                          </span>
                        </div>
                      )}

                    {point.baseline_kg !== undefined && (
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-[#CA6702] inline-block" />
                          28d Rolling Baseline:
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {point.baseline_kg.toLocaleString()} {unitLabel}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {/* Range Confidence Interval Band [lower, upper] */}
            {hasConfidenceBounds && (
              <Area
                type="monotone"
                dataKey="uncertainty_band"
                stroke="#94D2BD"
                strokeWidth={1}
                strokeDasharray="3 3"
                fill="url(#uncertaintyGradient)"
                name="95% Residual Prediction Interval"
                isAnimationActive={false}
              />
            )}

            {/* Historical Series (Deep Ocean) */}
            <Line
              type="monotone"
              dataKey="historical_kg"
              name="Historical Demand"
              stroke="#005F73"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#005F73' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />

            {/* Forecast Model Line (Mineral Teal) */}
            <Line
              type="monotone"
              dataKey="forecast_kg"
              name={`Forecast (${forecastData.model_used})`}
              stroke="#0A9396"
              strokeWidth={3}
              dot={{ r: 3.5, fill: '#0A9396' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />

            {/* 28-day Baseline Benchmark Line (Burnt Ochre dashed) */}
            {includeBaseline && (
              <Line
                type="monotone"
                dataKey="baseline_kg"
                name="28d Rolling Baseline"
                stroke="#CA6702"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Statistical Interval Caveat Caption */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-[#005F73] shrink-0" />
          <span>
            {hasConfidenceBounds
              ? '95% prediction interval reflects historical residual variance under stationarity — not a guaranteed demand range.'
              : 'Rolling-mean baseline benchmark does not generate prediction intervals.'}
          </span>
        </div>
        <span className="font-mono text-slate-400">
          Cutoff: {cutoffDate} &bull; Horizon: {forecastData.horizon_days}d
        </span>
      </div>
    </div>
  );
};
