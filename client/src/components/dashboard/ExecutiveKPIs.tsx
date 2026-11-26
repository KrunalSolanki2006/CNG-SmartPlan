import React from 'react';
import { Building2, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { MainDashboardOverviewResponse } from '../../types/dashboard';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

interface ExecutiveKPIsProps {
  data: MainDashboardOverviewResponse | null;
  isLoading: boolean;
}

export const ExecutiveKPIs: React.FC<ExecutiveKPIsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { network_summary, aggregated_forecast, supply_alerts } = data;
  const hasCritical = supply_alerts.critical_alerts_count > 0;
  const hasAlerts = supply_alerts.total_active_alerts > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Verified CNG Stations */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl h-full">
        <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0A9396]">
                <Building2 className="w-4 h-4" />
              </div>
              <Badge variant="success" size="sm">
                Verified
              </Badge>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Verified CNG Stations
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                {network_summary.total_verified_stations}
              </span>
              <span className="text-xs font-semibold text-slate-500">Stations</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            Spanning {network_summary.districts_covered_count} districts across Gujarat
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Cities Covered */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl h-full">
        <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                <MapPin className="w-4 h-4" />
              </div>
              <Badge variant="info" size="sm">
                Gujarat
              </Badge>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Cities Covered
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                {network_summary.cities_covered_count}
              </span>
              <span className="text-xs font-semibold text-slate-500">Cities</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 truncate">
            {network_summary.cities_covered.slice(0, 4).join(', ')}
            {network_summary.cities_covered_count > 4 ? '…' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Forecasted Network Demand */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl h-full">
        <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <Badge variant="teal" size="sm">
                {aggregated_forecast.coverage.coverage_ratio_label} Stations
              </Badge>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Forecasted Network Demand
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                {aggregated_forecast.average_daily_forecast_demand_kg !== null
                  ? aggregated_forecast.average_daily_forecast_demand_kg.toLocaleString('en-IN', {
                      maximumFractionDigits: 0,
                    })
                  : 'Unavailable'}
              </span>
              {aggregated_forecast.average_daily_forecast_demand_kg !== null && (
                <span className="text-xs font-semibold text-slate-500">kg/day</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            {aggregated_forecast.date_range_start && aggregated_forecast.date_range_end
              ? `${aggregated_forecast.date_range_start} to ${aggregated_forecast.date_range_end} (${aggregated_forecast.horizon_days}d)`
              : 'Forecast period unavailable'}
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Active Supply Alerts */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl h-full">
        <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                  hasCritical
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : hasAlerts
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <Badge variant={hasCritical ? 'danger' : hasAlerts ? 'warning' : 'success'} size="sm">
                {hasCritical ? 'Critical' : hasAlerts ? 'Warning' : 'Normal'}
              </Badge>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Active Supply Alerts
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono ${
                  hasCritical
                    ? 'text-red-600'
                    : hasAlerts
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {supply_alerts.distinct_stations_affected}
              </span>
              <span className="text-xs font-semibold text-slate-500">Affected Stations</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            {supply_alerts.critical_alerts_count} Critical • {supply_alerts.warning_alerts_count} Warning ({supply_alerts.total_active_alerts} total)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
