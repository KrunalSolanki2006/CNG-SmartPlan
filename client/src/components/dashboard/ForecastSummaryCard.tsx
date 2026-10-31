import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DataOriginBadge } from '../ui/DataOriginBadge';
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
    <Card hoverEffect className="border-[#DCE4E8]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#DDF3EF] text-[#0F766E] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              7-Day Forecast Pipeline
            </CardTitle>
          </div>
          <DataOriginBadge origin={summary.data_origin} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-[#64748B] block">Horizon</span>
            <span className="text-sm font-bold text-[#0F172A]">
              {summary.horizon_days} Days
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-[#64748B] block">Stations Forecasted</span>
            <span className="text-sm font-bold text-[#0F766E]">
              {summary.stations_forecasted} Stations
            </span>
          </div>
        </div>

        <p className="text-xs text-[#64748B] leading-relaxed">
          {summary.note}
        </p>
      </CardContent>

      <CardFooter className="justify-between">
        <Badge variant="synthetic" size="sm">
          Holt-Winters + 28d Baseline
        </Badge>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/forecast')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View Full Forecast
        </Button>
      </CardFooter>
    </Card>
  );
};
