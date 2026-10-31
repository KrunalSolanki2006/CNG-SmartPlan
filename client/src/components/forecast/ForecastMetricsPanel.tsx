import React from 'react';
import { ForecastEvaluation } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { BarChart3, Calendar, AlertTriangle } from 'lucide-react';

interface ForecastMetricsPanelProps {
  evaluation: ForecastEvaluation;
  trainPeriod: { start: string; end: string; n_records: number };
  testPeriod: { start: string; end: string; n_records: number };
  modelUsed: string;
}

export const ForecastMetricsPanel: React.FC<ForecastMetricsPanelProps> = ({
  evaluation,
  trainPeriod,
  testPeriod,
  modelUsed,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Chronological Split Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-xs">Chronological Train/Test Split</CardTitle>
            </div>
            <Badge variant="neutral" size="sm">No Date Shuffling</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[#64748B]">
          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span>Train Period:</span>
            <span className="font-mono font-semibold text-[#0F172A]">
              {trainPeriod.start} to {trainPeriod.end}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span>Train Records:</span>
            <span className="font-mono font-semibold text-[#0F172A]">{trainPeriod.n_records} days</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span>Test Period:</span>
            <span className="font-mono font-semibold text-[#0F172A]">
              {testPeriod.start} to {testPeriod.end}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span>Test Holdout:</span>
            <span className="font-mono font-semibold text-[#0F172A]">{testPeriod.n_records} days</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Error Metrics (Baseline vs Model) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-xs">Holdout Evaluation Metrics</CardTitle>
            </div>
            <Badge variant="teal" size="sm">{modelUsed}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[#64748B]">
          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span>Mean Absolute Error (MAE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-[#0F172A]">
                {evaluation.model_mae_kg !== null
                  ? `${evaluation.model_mae_kg.toFixed(2)} kg/day`
                  : `${evaluation.baseline_mae_kg.toFixed(2)} kg/day`}
              </span>
              {evaluation.model_mae_kg !== null && (
                <span className="text-[10px] text-slate-400 block">
                  (Base: {evaluation.baseline_mae_kg.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span>Root Mean Squared (RMSE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-[#0F172A]">
                {evaluation.model_rmse_kg !== null
                  ? `${evaluation.model_rmse_kg.toFixed(2)} kg/day`
                  : `${evaluation.baseline_rmse_kg.toFixed(2)} kg/day`}
              </span>
              {evaluation.model_rmse_kg !== null && (
                <span className="text-[10px] text-slate-400 block">
                  (Base: {evaluation.baseline_rmse_kg.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span>Symmetric MAPE (sMAPE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-[#0F172A]">
                {evaluation.model_smape_pct !== null
                  ? `${evaluation.model_smape_pct.toFixed(2)}%`
                  : `${evaluation.baseline_smape_pct.toFixed(2)}%`}
              </span>
              {evaluation.model_smape_pct !== null && (
                <span className="text-[10px] text-slate-400 block">
                  (Base: {evaluation.baseline_smape_pct.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Mandatory Synthetic Accuracy Qualifier */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-xs">Synthetic Qualifier</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[#64748B] leading-relaxed">
          <p>
            {evaluation.note ||
              'Metrics computed from synthetic demonstration data only. Do not claim real-world forecast accuracy.'}
          </p>
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-medium">
            No real-world station meter readings exist in the data package. Predictions reflect simulated patterns only.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
