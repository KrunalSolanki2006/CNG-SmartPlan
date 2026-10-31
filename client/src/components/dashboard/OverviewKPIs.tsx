import React from 'react';
import { Database, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { Skeleton } from '../ui/Skeleton';
import { AnimatedCounter } from '../ui/AnimatedCounter';
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Station Master Inventory */}
      <Card hoverEffect className="border-[#DCE4E8]">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Station Inventory
              </span>
              <DataOriginBadge origin="real_public" size="sm" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-[#0F172A]">
                <AnimatedCounter value={station_counts.total_in_inventory} />
              </span>
              <span className="text-xs text-[#64748B]">Directory Records</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              <strong className="text-[#0F172A]">{station_counts.eligible_for_simulation}</strong> eligible for simulation. AMD010 excluded.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1 text-[#0F766E] font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>GEL + HPCL</span>
            </span>
            <Badge variant="success" size="sm">
              Partially Verified
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI 2: Map-Eligible Stations */}
      <Card hoverEffect className="border-[#DCE4E8]">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Map Verified Pins
              </span>
              <Badge variant="neutral" size="sm">
                Unverified
              </Badge>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-[#DC2626]">
                <AnimatedCounter value={station_counts.eligible_for_map_display} />
              </span>
              <span className="text-xs text-[#64748B]">Approved Pins</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Coordinates left blank in directory master. 8 secondary leads unapproved.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>No GIS Pins</span>
            </span>
            <Badge variant="warning" size="sm">
              0 / 12 Mapped
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI 3: Network Historical Demand */}
      <Card hoverEffect className="border-[#DCE4E8]">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Mean Daily Demand
              </span>
              <DataOriginBadge origin={network_summary.data_origin} size="sm" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-[#0F172A]">
                <AnimatedCounter
                  value={network_summary.mean_daily_network_demand_kg}
                  decimals={1}
                />
              </span>
              <span className="text-xs text-[#64748B]">kg/day</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Across <strong className="text-[#0F172A]">{network_summary.total_stations_in_series}</strong> stations ({network_summary.date_range_start} to {network_summary.date_range_end}).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1 text-[#6D5BD0] font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Simulated Series</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">8,041 rows</span>
          </div>
        </CardContent>
      </Card>

      {/* KPI 4: Supply Shortfall Alert Summary */}
      <Card hoverEffect className="border-[#DCE4E8]">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Supply Shortfalls
              </span>
              <DataOriginBadge origin={shortfall_alerts.data_origin} size="sm" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-amber-600">
                <AnimatedCounter
                  value={shortfall_alerts.total_station_days_with_shortfall}
                />
              </span>
              <span className="text-xs text-[#64748B]">Station-Days</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {shortfall_alerts.stations_with_current_alert.length > 0
                ? `${shortfall_alerts.stations_with_current_alert.length} stations flagged with active shortfall alerts.`
                : 'Simulated constrained scenario days across 2024–2025.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Planning Deficit</span>
            </span>
            <Badge variant="warning" size="sm">
              Not Stockout
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
