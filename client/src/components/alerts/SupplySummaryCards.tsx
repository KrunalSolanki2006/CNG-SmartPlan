import React from 'react';
import { SupplySummary } from '../../types/api';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle, TrendingDown, ShieldAlert } from 'lucide-react';

interface SupplySummaryCardsProps {
  summary: SupplySummary;
  totalDays: number;
}

export const SupplySummaryCards: React.FC<SupplySummaryCardsProps> = ({
  summary,
  totalDays,
}) => {
  const hasShortfall = summary.days_with_shortfall > 0;
  const missingSupply = summary.days_missing_supply ?? 0;
  const daysCovered = summary.days_covered ?? (totalDays - missingSupply);
  const activeOverrides = summary.active_user_overrides_count ?? 0;

  return (
    <div className="space-y-3">
      {missingSupply > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#CA6702] shrink-0" />
            <span>
              <strong className="font-bold text-slate-900">Supply Coverage Notice:</strong> {missingSupply} of {totalDays} horizon days have no recorded supply data. Enter user overrides below to evaluate balance.
            </span>
          </div>
          <Badge variant="warning" size="sm">
            {activeOverrides} Override{activeOverrides === 1 ? '' : 's'} Active
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Days with Potential Planning Shortfall */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Shortfall Frequency</span>
              <Badge variant={hasShortfall ? 'warning' : 'success'} size="sm">
                {hasShortfall ? 'Deficit Identified' : 'Balanced'}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${hasShortfall ? 'text-[#BB3E03]' : 'text-slate-900'}`}>
                {summary.days_with_shortfall}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ {daysCovered} Covered Days</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {hasShortfall
                ? `${Math.round((summary.days_with_shortfall / Math.max(1, daysCovered)) * 100)}% of covered days experience planning deficit`
                : 'Planned available supply covers all evaluated days'}
            </p>
          </CardContent>
        </Card>

        {/* 2. Maximum Single-Day Shortfall */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Peak Day Shortfall</span>
              <AlertTriangle className="w-4 h-4 text-[#CA6702]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-[#BB3E03]">
                {summary.max_shortfall_kg.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">kg/day</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Worst single-day planning shortfall across covered days
            </p>
          </CardContent>
        </Card>

        {/* 3. Cumulative Period Shortfall */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Cumulative Deficit</span>
              <TrendingDown className="w-4 h-4 text-[#AE2012]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-[#AE2012]">
                {summary.total_shortfall_kg.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">kg</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Net supply replenishment required to balance network demand
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
