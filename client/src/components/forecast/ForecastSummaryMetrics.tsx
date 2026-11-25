import React from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  History,
  TrendingUp,
} from 'lucide-react';
import { ForecastResponse } from '../../types/api';
import { Card, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface ForecastSummaryMetricsProps {
  forecastData: ForecastResponse | null;
  isLoading: boolean;
}

export const ForecastSummaryMetrics: React.FC<ForecastSummaryMetricsProps> = ({
  forecastData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  if (!forecastData) return null;

  const {
    historical_recent_avg_kg,
    historical_avg_demand_kg,
    forecast_avg_demand_kg,
    demand_trend,
    trend_change_pct,
    target_start_date,
    target_end_date,
    horizon_days,
    data_through_date,
  } = forecastData;

  const trendConfig = {
    increasing: {
      label: 'Increasing',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      Icon: ArrowUpRight,
    },
    decreasing: {
      label: 'Decreasing',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      Icon: ArrowDownRight,
    },
    stable: {
      label: 'Stable',
      color: 'text-sky-700',
      bg: 'bg-sky-50 border-sky-200',
      Icon: ArrowRight,
    },
    unavailable: {
      label: 'Unavailable',
      color: 'text-slate-600',
      bg: 'bg-slate-100 border-slate-200',
      Icon: Activity,
    },
  }[demand_trend] || {
    label: 'Unavailable',
    color: 'text-slate-600',
    bg: 'bg-slate-100 border-slate-200',
    Icon: Activity,
  };

  const TrendIcon = trendConfig.Icon;
  const pctLabel =
    trend_change_pct !== null
      ? `${trend_change_pct > 0 ? '+' : ''}${trend_change_pct.toFixed(1)}% vs trailing 30d`
      : 'Insufficient data for trend';

  return (
    <div className="space-y-4">
      {/* 4 Required KPIs computed strictly from API response */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Historical Average Demand */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Historical Avg Demand
              </span>
              <History className="w-4 h-4 text-[#005F73]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-mono">
                {historical_recent_avg_kg !== null
                  ? historical_recent_avg_kg.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : '—'}
              </span>
              <span className="text-xs font-medium text-slate-500">kg/day</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Trailing 30d avg (Full history:{' '}
              {historical_avg_demand_kg !== null
                ? `${historical_avg_demand_kg.toLocaleString()} kg/day`
                : 'N/A'}
              )
            </p>
          </CardContent>
        </Card>

        {/* 2. Forecast Average Demand */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Forecast Avg Demand
              </span>
              <TrendingUp className="w-4 h-4 text-[#0A9396]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#005F73] font-mono">
                {forecast_avg_demand_kg !== null
                  ? forecast_avg_demand_kg.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : '—'}
              </span>
              <span className="text-xs font-medium text-slate-500">kg/day</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Mean across {horizon_days}-day forecast horizon
            </p>
          </CardContent>
        </Card>

        {/* 3. Expected Demand Trend */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Expected Demand Trend
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${trendConfig.bg} ${trendConfig.color}`}
              >
                <TrendIcon className="w-3 h-3" />
                {trendConfig.label}
              </span>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${trendConfig.color}`}>
              {trendConfig.label}
            </div>
            <p className="text-[11px] text-slate-500 font-mono">{pctLabel}</p>
          </CardContent>
        </Card>

        {/* 4. Forecast Period */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Forecast Period
              </span>
              <CalendarRange className="w-4 h-4 text-[#005F73]" />
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono leading-snug pt-0.5">
              {target_start_date && target_end_date
                ? `${target_start_date} to ${target_end_date}`
                : 'Withheld (Insufficient Data)'}
            </div>
            <p className="text-[11px] text-slate-500">
              {horizon_days} days after cutoff ({data_through_date ?? 'N/A'})
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
