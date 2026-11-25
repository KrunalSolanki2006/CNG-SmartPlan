import React from 'react';
import { ForecastEvaluation } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
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
      <Card className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="icon-box-teal shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-bold text-slate-900">Chronological Train/Test Split</CardTitle>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              No Date Shuffling
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Train Period:</span>
            <span className="font-mono font-bold text-slate-900">
              {trainPeriod.start} to {trainPeriod.end}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Train Records:</span>
            <span className="font-mono font-bold text-slate-900">{trainPeriod.n_records} days</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Test Period:</span>
            <span className="font-mono font-bold text-slate-900">
              {testPeriod.start} to {testPeriod.end}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Test Holdout:</span>
            <span className="font-mono font-bold text-slate-900">{testPeriod.n_records} days</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Error Metrics (Baseline vs Model) */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="icon-box-teal shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-bold text-slate-900">Holdout Evaluation Metrics</CardTitle>
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
                  ? `${evaluation.model_mae_kg.toFixed(2)} kg/day`
                  : `${evaluation.baseline_mae_kg.toFixed(2)} kg/day`}
              </span>
              {evaluation.model_mae_kg !== null && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  (Base: {evaluation.baseline_mae_kg.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Root Mean Squared (RMSE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900">
                {evaluation.model_rmse_kg !== null
                  ? `${evaluation.model_rmse_kg.toFixed(2)} kg/day`
                  : `${evaluation.baseline_rmse_kg.toFixed(2)} kg/day`}
              </span>
              {evaluation.model_rmse_kg !== null && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  (Base: {evaluation.baseline_rmse_kg.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-1">
            <span>Symmetric MAPE (sMAPE):</span>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900">
                {evaluation.model_smape_pct !== null
                  ? `${evaluation.model_smape_pct.toFixed(2)}%`
                  : `${evaluation.baseline_smape_pct.toFixed(2)}%`}
              </span>
              {evaluation.model_smape_pct !== null && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  (Base: {evaluation.baseline_smape_pct.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Mandatory Synthetic Accuracy Qualifier */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="icon-box-amber shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs font-bold text-slate-900">Synthetic Qualifier</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <p className="font-medium text-slate-700">
            {evaluation.note ||
              'Metrics computed from simulation baseline model. Formal benchmark evaluation.'}
          </p>
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium">
            No real-world station meter readings exist in the data package. Predictions reflect simulated patterns only.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
