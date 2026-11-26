import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ArrowRight, TrendingUp, FlaskConical } from 'lucide-react';
import { AggregatedDemandForecast } from '../../types/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

interface DemandForecastOverviewCardProps {
  forecast: AggregatedDemandForecast | undefined;
  isLoading: boolean;
}

export const DemandForecastOverviewCard: React.FC<DemandForecastOverviewCardProps> = ({
  forecast,
  isLoading,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className="h-[340px] w-full rounded-2xl" />;
  }

  if (!forecast) return null;

  const { coverage, expected_peak_demand_day, daily_series } = forecast;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0A9396] shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900">
              Demand Forecast Overview ({forecast.horizon_days}-Day Network Aggregate)
            </CardTitle>
            {forecast.is_synthetic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-bold uppercase">
                <FlaskConical className="w-3 h-3" />
                Synthetic Prototype
              </span>
            )}
            <Badge variant="teal" size="sm">
              Coverage: {coverage.coverage_ratio_label} ({coverage.coverage_pct}%)
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Aggregated {forecast.model_used} forecast across {coverage.stations_with_valid_forecast} stations with valid forecasts ({forecast.date_range_start ?? 'N/A'} to {forecast.date_range_end ?? 'N/A'}).
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/forecast')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="rounded-xl shrink-0"
        >
          Open Demand Forecasting
        </Button>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Aggregate Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Total {forecast.horizon_days}d Forecast</span>
            <span className="text-base font-bold font-mono text-slate-900">
              {forecast.total_forecasted_demand_kg !== null
                ? `${forecast.total_forecasted_demand_kg.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Avg Daily Forecast</span>
            <span className="text-base font-bold font-mono text-[#0A9396]">
              {forecast.average_daily_forecast_demand_kg !== null
                ? `${forecast.average_daily_forecast_demand_kg.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg/day`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">7-Day Demand Trend</span>
            <span className="text-base font-bold capitalize text-slate-900">
              {forecast.demand_trend}{' '}
              {forecast.trend_change_pct !== null && (
                <span className="text-xs font-mono text-slate-600">
                  ({forecast.trend_change_pct > 0 ? '+' : ''}
                  {forecast.trend_change_pct.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Expected Peak Day</span>
            <span className="text-sm font-bold font-mono text-slate-900 block">
              {expected_peak_demand_day ? expected_peak_demand_day.date : 'Unavailable'}
            </span>
            {expected_peak_demand_day && (
              <span className="text-[11px] text-slate-500 font-mono">
                {expected_peak_demand_day.total_demand_kg.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg/day
              </span>
            )}
          </div>
        </div>

        {/* Network Forecast Line Chart */}
        {daily_series.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
            Aggregate forecast series is unavailable.
          </div>
        ) : (
          <div className="h-[240px] w-full select-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_series} margin={{ top: 10, right: 16, bottom: 8, left: 16 }}>
                <defs>
                  <linearGradient id="networkForecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A9396" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0A9396" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  label={{ value: 'kg/day', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748B' }}
                />
                {forecast.historical_recent_avg_daily_kg !== null && (
                  <ReferenceLine
                    y={forecast.historical_recent_avg_daily_kg}
                    stroke="#64748B"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Trailing 30d Avg',
                      position: 'insideTopRight',
                      fill: '#64748B',
                      fontSize: 10,
                    }}
                  />
                )}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0].payload as typeof daily_series[0];
                    return (
                      <div className="bg-[#0B1320] text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-700 space-y-1">
                        <div className="font-bold text-[#5EEAD4]">{pt.date}</div>
                        <div>
                          Aggregate Forecast:{' '}
                          <span className="font-mono font-bold">
                            {pt.total_demand_kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg/day
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Stations Included: {pt.stations_included}/{coverage.verified_stations_total}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total_demand_kg"
                  stroke="#0A9396"
                  strokeWidth={2.5}
                  fill="url(#networkForecastGrad)"
                  dot={{ r: 3.5, fill: '#0A9396', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
