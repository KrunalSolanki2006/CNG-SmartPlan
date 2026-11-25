import React from 'react';
import { ForecastEvaluation, ForecastResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BarChart3, Calendar, FileText } from 'lucide-react';

interface ForecastMetricsPanelProps {
  evaluation: ForecastEvaluation;
  trainPeriod: { start: string | null; end: string | null; n_records: number };
  testPeriod: { start: string | null; end: string | null; n_records: number };
  modelUsed: string;
  forecastData?: ForecastResponse | null;
}

export const ForecastMetricsPanel: React.FC<ForecastMetricsPanelProps> = ({
  evaluation,
  trainPeriod,
  testPeriod,
  modelUsed,
  forecastData,
}) => {
  const formatMetric = (val: number | null | undefined, suffix: string) =>
    val !== null && val !== undefined ? `${val.toFixed(2)}${suffix}` : 'Unavailable';

  const valPeriod = forecastData?.validation_period;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Forecast Details */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="icon-box-teal shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-bold text-slate-900">Forecast Details</CardTitle>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
              {forecastData?.data_origin || 'synthetic_demo'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between items-center py-1 border-b border-slate-100 gap-2">
            <span>Selected Station:</span>
            <span className="font-semibold text-slate-900 text-right truncate">
              {forecastData ? `${forecastData.station_name} (${forecastData.station_id})` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Historical Cutoff:</span>
            <span className="font-mono font-bold text-slate-900">
              {forecastData?.data_through_date || testPeriod.end || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Generated At (UTC):</span>
            <span className="font-mono font-semibold text-slate-900 text-[11px]">
              {forecastData?.forecast_generated_at || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Forecast Horizon:</span>
            <span className="font-mono font-bold text-slate-900">
              {forecastData ? `${forecastData.horizon_days} days` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Model &amp; Version:</span>
            <span className="font-mono font-semibold text-slate-800 text-[11px]">
              {forecastData?.model_info?.model_id || modelUsed} v
              {forecastData?.model_info?.model_version || forecastData?.model_version || '2.0.0'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Chronological Train / Validation / Test Split */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="icon-box-teal shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Chronological Train/Test Split
              </CardTitle>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Out-of-Sample
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Train Window:</span>
            <span className="font-mono font-bold text-slate-900 text-[11px]">
              {trainPeriod.start && trainPeriod.end
                ? `${trainPeriod.start} to ${trainPeriod.end}`
                : 'N/A'}{' '}
              ({trainPeriod.n_records}d)
            </span>
          </div>
          {valPeriod && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span>Validation Window:</span>
              <span className="font-mono font-bold text-slate-900 text-[11px]">
                {valPeriod.start && valPeriod.end
                  ? `${valPeriod.start} to ${valPeriod.end}`
                  : 'N/A'}{' '}
                ({valPeriod.n_records}d)
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Final Eval Window:</span>
            <span className="font-mono font-bold text-slate-900 text-[11px]">
              {testPeriod.start && testPeriod.end
                ? `${testPeriod.start} to ${testPeriod.end}`
                : 'N/A'}{' '}
              ({testPeriod.n_records}d)
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Eval Records:</span>
            <span className="font-mono font-bold text-slate-900">{testPeriod.n_records} days</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Station Holdout Error Metrics */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="icon-box-teal shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Station Holdout Validation
              </CardTitle>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
              {modelUsed}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Mean Absolute Error (MAE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900">
                {evaluation.model_mae_kg !== null
                  ? formatMetric(evaluation.model_mae_kg, ' kg/day')
                  : formatMetric(evaluation.baseline_mae_kg, ' kg/day')}
              </span>
              {evaluation.model_mae_kg !== null && evaluation.baseline_mae_kg !== null && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  (28d Base: {evaluation.baseline_mae_kg.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Root Mean Squared (RMSE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900">
                {evaluation.model_rmse_kg !== null
                  ? formatMetric(evaluation.model_rmse_kg, ' kg/day')
                  : formatMetric(evaluation.baseline_rmse_kg, ' kg/day')}
              </span>
              {evaluation.model_rmse_kg !== null && evaluation.baseline_rmse_kg !== null && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  (28d Base: {evaluation.baseline_rmse_kg.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Symmetric MAPE (sMAPE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900">
                {evaluation.model_smape_pct !== null
                  ? formatMetric(evaluation.model_smape_pct, '%')
                  : formatMetric(evaluation.baseline_smape_pct, '%')}
              </span>
              {evaluation.model_smape_pct !== null && evaluation.baseline_smape_pct !== null && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  (28d Base: {evaluation.baseline_smape_pct.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-snug pt-0.5">{evaluation.note}</p>
        </CardContent>
      </Card>
    </div>
  );
};
