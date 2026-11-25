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
} from 'recharts';
import { ForecastResponse, DailySalesPoint } from '../../types/api';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface ForecastChartProps {
  forecastData: ForecastResponse | null;
  historyPoints: DailySalesPoint[];
  isLoading: boolean;
  aggregation: 'daily' | 'weekly';
  includeBaseline: boolean;
}

interface CombinedChartPoint {
  date: string;
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
  aggregation,
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
    return (
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <EmptyState
          icon={<TrendingUp className="w-8 h-8 text-[#005F73]" />}
          title="No Forecast Generated"
          description="Select an eligible station and click 'Generate Forecast' to run the authoritative backend forecasting service."
        />
      </div>
    );
  }

  // Combine recent history (e.g. last 14 days) and forecast points into continuous series
  const recentHistory = historyPoints.slice(-14);
  const chartData: CombinedChartPoint[] = [];

  recentHistory.forEach((h) => {
    chartData.push({
      date: h.date,
      historical_kg: h.demand_kg,
    });
  });

  // Connect last historical point to first forecast point for visual continuity if available
  const lastHist = recentHistory[recentHistory.length - 1];

  forecastData.forecast.forEach((f, idx) => {
    const baseline = forecastData.baseline_forecast.find((b) => b.date === f.date);
    const hasBounds = f.lower_bound_kg !== null && f.upper_bound_kg !== null;

    chartData.push({
      date: f.date,
      // bridge visually at first point
      historical_kg: idx === 0 && lastHist ? lastHist.demand_kg : undefined,
      forecast_kg: f.forecast_demand_kg,
      lower_bound_kg: f.lower_bound_kg,
      upper_bound_kg: f.upper_bound_kg,
      uncertainty_band: hasBounds ? [f.lower_bound_kg!, f.upper_bound_kg!] : undefined,
      baseline_kg: includeBaseline && baseline ? baseline.forecast_demand_kg : undefined,
    });
  });

  const hasConfidenceBounds = forecastData.forecast.some(
    (f) => f.lower_bound_kg !== null && f.upper_bound_kg !== null
  );

  const unitLabel = aggregation === 'daily' ? 'kg/day' : 'kg/week';

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Chart Header & Data Origin Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">
              Demand Trajectory & Model Forecast ({forecastData.station_id})
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Historical daily sales baseline bridged to {forecastData.horizon_days}-day {forecastData.model_used} projection
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
            margin={{ top: 12, right: 16, bottom: 20, left: 10 }}
          >
            <defs>
              {/* Uncertainty Band Fill Gradient */}
              <linearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94D2BD" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#94D2BD" stopOpacity={0.05} />
              </linearGradient>
            </defs>

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

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div className="bg-[#001219]/95 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs space-y-1.5 min-w-[200px]">
                    <div className="font-bold border-b border-slate-800 pb-1 text-slate-400">
                      Date: {label}
                    </div>
                    {payload.map((entry, idx) => {
                      if (entry.value === undefined || entry.value === null) return null;
                      let name = entry.name;
                      let color = entry.color;
                      let valDisplay = `${Number(entry.value).toLocaleString()} ${unitLabel}`;

                      if (entry.dataKey === 'historical_kg') {
                        name = 'Historical Demand';
                        color = '#005F73';
                      } else if (entry.dataKey === 'forecast_kg') {
                        name = `Forecast (${forecastData.model_used})`;
                        color = '#0A9396';
                      } else if (entry.dataKey === 'baseline_kg') {
                        name = '28d Rolling Mean';
                        color = '#CA6702';
                      } else if (entry.dataKey === 'lower_bound_kg') {
                        name = 'Lower Confidence Bound';
                        color = '#94D2BD';
                      } else if (entry.dataKey === 'upper_bound_kg') {
                        name = 'Upper Confidence Bound';
                        color = '#94D2BD';
                      }

                      return (
                        <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-slate-400">{name}:</span>
                          </span>
                          <span className="font-mono font-bold text-white">{valDisplay}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {/* Uncertainty Interval Area (Lower to Upper bounds) */}
            {hasConfidenceBounds && (
              <Area
                type="monotone"
                dataKey="upper_bound_kg"
                stroke="none"
                fill="url(#uncertaintyGradient)"
                name="Calibrated Prediction Interval (95% Empirical Residuals)"
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
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Uncertainty Band Caption */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-[#005F73] shrink-0" />
          <span>
            {hasConfidenceBounds
              ? '80% & 95% Confidence intervals calibrated via historical residual variance.'
              : 'Rolling-mean baseline benchmark does not generate confidence intervals.'}
          </span>
        </div>
        <span className="font-mono text-slate-400">
          Chronological holdout validation
        </span>
      </div>
    </div>
  );
};
