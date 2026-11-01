import React from 'react';
import { SupplySummary } from '../../types/api';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle, TrendingDown, Cpu } from 'lucide-react';

interface SupplySummaryCardsProps {
  summary: SupplySummary;
  totalDays: number;
}

export const SupplySummaryCards: React.FC<SupplySummaryCardsProps> = ({
  summary,
  totalDays,
}) => {
  const hasShortfall = summary.days_with_shortfall > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Days with Shortfall */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B] font-semibold">Shortfall Frequency</span>
            <Badge variant={hasShortfall ? 'warning' : 'success'} size="sm">
              {hasShortfall ? 'Deficit Identified' : 'Balanced'}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#0F172A]">
              {summary.days_with_shortfall}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ {totalDays} Horizon Days</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            {hasShortfall
              ? `${Math.round((summary.days_with_shortfall / totalDays) * 100)}% of horizon days experience planned deficit`
              : 'Planned available supply covers all projected days'}
          </p>
        </CardContent>
      </Card>

      {/* 2. Maximum Single-Day Shortfall */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B] font-semibold">Peak Day Shortfall</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#0F172A]">
              {summary.max_shortfall_kg.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">kg/day</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Worst single-day theoretical shortfall across the period
          </p>
        </CardContent>
      </Card>

      {/* 3. Cumulative Period Shortfall */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B] font-semibold">Cumulative Deficit</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#0F172A]">
              {summary.total_shortfall_kg.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">kg</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Net supply replenishment required to balance network demand
          </p>
        </CardContent>
      </Card>

      {/* 4. Canonical Formula & Operational Notice */}
      <Card>
        <CardContent className="p-4 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-semibold flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-[#0F766E]" />
              Canonical Formula
            </span>
            <Badge variant="neutral" size="sm">Docs Truth</Badge>
          </div>
          <div className="p-1.5 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] text-[#0F766E]">
            potential_shortfall_kg = max(0, forecast_demand_kg - planned_supply_kg)
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Planning shortfall $\ne$ actual stockout. Line-pack buffers prevent immediate dispenser dry-out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
