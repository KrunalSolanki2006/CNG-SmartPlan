import React from 'react';
import { Building2, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { MotionStaggerContainer, MotionStaggerItem } from '../ui/MotionContainer';
import { OverviewResponse } from '../../types/api';

export interface OverviewKPIsProps {
  data: OverviewResponse | null;
  isLoading: boolean;
}

export const OverviewKPIs: React.FC<OverviewKPIsProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  const { station_counts, network_summary, shortfall_alerts } = data;

  return (
    <MotionStaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Station Master Inventory */}
      <MotionStaggerItem>
        <Card hoverEffect className="border-slate-200 bg-white shadow-xs hover:shadow-sm hover:border-slate-300 rounded-2xl h-full transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <Badge variant="teal" size="sm">
                  Active
                </Badge>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Station Inventory
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  <AnimatedCounter value={station_counts.total_in_inventory} />
                </span>
                <span className="text-xs font-medium text-slate-500">Directory Records</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionStaggerItem>

      {/* KPI 2: Map-Eligible Stations */}
      <MotionStaggerItem>
        <Card hoverEffect className="border-slate-200 bg-white shadow-xs hover:shadow-sm hover:border-slate-300 rounded-2xl h-full transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                  <MapPin className="w-4 h-4" />
                </div>
                <Badge variant={station_counts.eligible_for_map_display > 0 ? "success" : "warning"} size="sm">
                  {station_counts.eligible_for_map_display > 0 ? "Verified" : "Pending"}
                </Badge>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Map Verified Pins
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  <AnimatedCounter value={station_counts.eligible_for_map_display} />
                </span>
                <span className="text-xs font-medium text-slate-500">Approved Pins</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionStaggerItem>

      {/* KPI 3: Network Historical Demand */}
      <MotionStaggerItem>
        <Card hoverEffect className="border-slate-200 bg-white shadow-xs hover:shadow-sm hover:border-slate-300 rounded-2xl h-full transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <Badge variant="info" size="sm">
                  Baseline
                </Badge>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Network Mean Daily Total ({network_summary.total_stations_in_series} stations)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  <AnimatedCounter
                    value={network_summary.mean_daily_network_demand_kg}
                    decimals={1}
                  />
                </span>
                <span className="text-xs font-semibold text-slate-500">kg/day</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionStaggerItem>

      {/* KPI 4: Supply Shortfall Alert Summary */}
      <MotionStaggerItem>
        <Card hoverEffect className="border-slate-200 bg-white shadow-xs hover:shadow-sm hover:border-slate-300 rounded-2xl h-full transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <Badge variant="warning" size="sm">
                  Shortfall
                </Badge>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Constrained-Supply Planning Days
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight font-mono">
                  <AnimatedCounter
                    value={shortfall_alerts.total_station_days_with_shortfall}
                  />
                </span>
                <span className="text-xs font-semibold text-slate-500">Station-Days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionStaggerItem>
    </MotionStaggerContainer>
  );
};
