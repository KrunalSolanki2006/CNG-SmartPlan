import React from 'react';
import { Network, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { NetworkForecastSummaryResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { ApiError } from '../../api/client';

interface NetworkForecastSummaryCardProps {
  summary: NetworkForecastSummaryResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

export const NetworkForecastSummaryCard: React.FC<NetworkForecastSummaryCardProps> = ({
  summary,
  isLoading,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
        <CardHeader>
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Network Forecast Summary Unavailable"
        code={error.code}
        message={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (!summary) return null;

  const TrendIcon =
    summary.network_demand_trend === 'increasing'
      ? TrendingUp
      : summary.network_demand_trend === 'decreasing'
      ? TrendingDown
      : Minus;

  const trendColor =
    summary.network_demand_trend === 'increasing'
      ? 'text-emerald-700'
      : summary.network_demand_trend === 'decreasing'
      ? 'text-amber-700'
      : 'text-sky-700';

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="icon-box-teal shrink-0">
              <Network className="w-4 h-4 text-[#005F73]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Network-Level Simulated Forecast Summary ({summary.horizon_days}-Day Horizon)
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Aggregated across {summary.eligible_stations} eligible verified Gujarat stations ({summary.target_start_date} to {summary.target_end_date})
              </p>
            </div>
          </div>

          <Badge variant="synthetic" size="sm">
            Simulated Network Aggregate
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Eligible Stations</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
              {summary.eligible_stations}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Forecasted
            </span>
            <span className="text-xl font-bold text-emerald-900 font-mono mt-0.5 block">
              {summary.successfully_forecasted_stations}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Failed / Insufficient
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
              {summary.failed_stations + summary.insufficient_data_stations}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200">
            <span className="text-[11px] font-semibold text-teal-800 block">
              Simulated Aggregate
            </span>
            <span className="text-lg font-bold text-[#005F73] font-mono mt-0.5 block">
              {summary.simulated_network_demand_kg_per_day.toLocaleString()} kg/day
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Network Trend</span>
            <div className={`text-lg font-bold capitalize flex items-center gap-1 mt-0.5 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{summary.network_demand_trend}</span>
            </div>
            {summary.network_trend_change_pct !== null && (
              <span className="text-[10px] font-mono text-slate-500">
                {summary.network_trend_change_pct > 0 ? '+' : ''}
                {summary.network_trend_change_pct.toFixed(1)}% vs trailing 30d
              </span>
            )}
          </div>
        </div>

        {/* Network-wide Out-of-Sample Evaluation Strip */}
        {summary.network_evaluation.stations_evaluated > 0 && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
            <div>
              <strong className="text-slate-900">Network Out-of-Sample Evaluation ({summary.network_evaluation.stations_evaluated} stations):</strong>{' '}
              Mean MAE <span className="font-mono font-semibold text-slate-900">{summary.network_evaluation.mean_hw_mae_kg} kg/day</span>,{' '}
              Mean sMAPE <span className="font-mono font-semibold text-slate-900">{summary.network_evaluation.mean_hw_smape_pct}%</span>{' '}
              (28d Baseline: <span className="font-mono">{summary.network_evaluation.mean_baseline_mae_kg} kg/day</span>,{' '}
              <span className="font-mono">{summary.network_evaluation.mean_baseline_smape_pct}%</span>)
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              HW outperforms baseline on {summary.network_evaluation.holt_winters_outperforms_baseline_count}/{summary.network_evaluation.stations_evaluated} stations
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Simulated aggregate across the {summary.eligible_stations} eligible curated Gujarat stations only — not a real Gujarat-wide CNG demand measurement.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
