import React from 'react';
import { TrendingUp, Calendar, AlertTriangle, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { EmptyState } from '../components/ui/EmptyState';

export const ForecastPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header card with rules */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-[#0F172A]">
              Station-Level Demand Forecasting
            </h2>
            <Badge variant="info">Feature B</Badge>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Multi-horizon forecasting (7, 14, 30 days) across 11 eligible Ahmedabad stations. Models evaluated strictly on a chronological test period without random date shuffling.
          </p>
        </div>
      </div>

      {/* Model & Evaluation Baseline Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-xs">Chronological Train/Test Split</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-[#64748B]">
            <div className="flex justify-between">
              <span>Train Period:</span>
              <span className="font-semibold text-[#0F172A]">2024-01-01 to 2025-10-02</span>
            </div>
            <div className="flex justify-between">
              <span>Test Period:</span>
              <span className="font-semibold text-[#0F172A]">2025-10-03 to 2025-12-31</span>
            </div>
            <div className="flex justify-between">
              <span>Test Observations:</span>
              <span className="font-semibold text-[#0F172A]">990 station-days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-xs">28-Day Baseline Metrics</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-[#64748B]">
            <div className="flex justify-between">
              <span>Baseline MAE:</span>
              <span className="font-semibold text-[#0F172A]">150.55 kg/day</span>
            </div>
            <div className="flex justify-between">
              <span>Baseline RMSE:</span>
              <span className="font-semibold text-[#0F172A]">189.69 kg/day</span>
            </div>
            <div className="flex justify-between">
              <span>Baseline sMAPE:</span>
              <span className="font-semibold text-[#0F172A]">11.41%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-xs">Integrity Notice</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-[#64748B] space-y-1 leading-snug">
            <p>
              Metrics derive purely from synthetic simulation data. No real-world forecast accuracy is claimed.
            </p>
            <p className="text-[11px] text-amber-700">
              Note: <code className="font-mono">is_public_holiday</code> is blank across all 8,041 records.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Container / Placeholder State */}
      <EmptyState
        icon={<TrendingUp className="w-6 h-6 text-[#0F766E]" />}
        title="Forecasting Shell Established"
        description="The typed API client for POST /api/v1/forecast and GET /api/v1/stations/{id}/history is ready. Station selection, Recharts time-series visualization, confidence bands, and baseline comparison will activate upon Milestone 2 & 3 backend integration."
        badge={<DataOriginBadge origin="synthetic_demo" size="sm" />}
      />
    </div>
  );
};
