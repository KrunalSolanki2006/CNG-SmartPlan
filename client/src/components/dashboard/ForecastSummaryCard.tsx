import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { ForecastSummaryOverview } from '../../types/api';

export interface ForecastSummaryCardProps {
  summary?: ForecastSummaryOverview | null;
}

export const ForecastSummaryCard: React.FC<ForecastSummaryCardProps> = ({ summary }) => {
  const navigate = useNavigate();

  if (!summary) {
    return (
      <Card className="border-[#DCE4E8] bg-slate-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#64748B]" />
            <CardTitle className="text-sm">Forecast Pipeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-[#64748B]">
          No active automated forecast job returned by backend. Navigate to the Demand Forecast module to generate a chronological station run.
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/forecast')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Forecasting
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-xs hover:shadow-sm transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900 tracking-tight">
              7-Day Forecast Pipeline
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Horizon</span>
            <span className="text-base font-bold text-slate-900 tracking-tight mt-0.5 block font-mono">
              {summary.horizon_days} Days
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider block">Stations Forecasted</span>
            <span className="text-base font-bold text-teal-900 tracking-tight mt-0.5 block font-mono">
              {summary.stations_forecasted} Stations
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Multi-horizon seasonal forecasting across active network stations.
        </p>
      </CardContent>

      <CardFooter className="justify-between pt-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
          Holt-Winters + 28d Baseline
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/forecast')}
          className="rounded-xl font-medium shadow-xs"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View Full Forecast
        </Button>
      </CardFooter>
    </Card>
  );
};
