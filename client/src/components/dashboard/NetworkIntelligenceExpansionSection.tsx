import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Compass,
  Lightbulb,
  Target,
  Activity,
  MapPinOff,
} from 'lucide-react';
import {
  NetworkExpansionInsights,
  NetworkIntelligenceSummary,
} from '../../types/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

interface NetworkIntelligenceExpansionSectionProps {
  intelligence: NetworkIntelligenceSummary | undefined;
  expansion: NetworkExpansionInsights | undefined;
  isLoading: boolean;
}

export const NetworkIntelligenceExpansionSection: React.FC<
  NetworkIntelligenceExpansionSectionProps
> = ({ intelligence, expansion, isLoading }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[320px] w-full rounded-2xl" />
        <Skeleton className="h-[320px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!intelligence || !expansion) return null;

  const topCandidate = expansion.highest_ranked_candidate;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Subsection A: Network Intelligence */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-xs flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0A9396] shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900">
                Network Intelligence
              </CardTitle>
            </div>
            <Badge
              variant={
                intelligence.overall_balance_status === 'surplus_or_balanced'
                  ? 'success'
                  : 'warning'
              }
              size="sm"
            >
              {intelligence.overall_balance_status === 'surplus_or_balanced'
                ? 'Balanced'
                : 'Supply Constrained'}
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            {intelligence.note}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Supply vs Demand Balance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Avg Network Demand (30d)
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {intelligence.aggregate_demand_kg_per_day !== null
                  ? `${intelligence.aggregate_demand_kg_per_day.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg/d`
                  : 'Unavailable'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Effective Supply Balance
              </span>
              <span className="text-base font-bold font-mono text-[#0A9396]">
                {intelligence.supply_demand_balance_pct !== null
                  ? `${intelligence.supply_demand_balance_pct}%`
                  : 'Unavailable'}
              </span>
              {intelligence.net_supply_demand_balance_kg_per_day !== null && (
                <span className="text-[10px] text-slate-500 font-mono block">
                  {intelligence.net_supply_demand_balance_kg_per_day > 0 ? '+' : ''}
                  {intelligence.net_supply_demand_balance_kg_per_day.toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                  })}{' '}
                  kg/day net
                </span>
              )}
            </div>
          </div>

          {/* Service Gap Areas */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPinOff className="w-3.5 h-3.5 text-amber-600" />
              Geographic Service Gaps ({intelligence.areas_with_insufficient_coverage.length})
            </span>
            {intelligence.areas_with_insufficient_coverage.length === 0 ? (
              <p className="text-xs text-slate-500">
                No verified service gaps identified in current evaluation data.
              </p>
            ) : (
              <div className="space-y-1.5">
                {intelligence.areas_with_insufficient_coverage.slice(0, 3).map((gap) => (
                  <div
                    key={gap.area_name}
                    className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {gap.area_name}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {gap.city}, {gap.district} • {gap.reason}
                      </div>
                    </div>
                    {gap.service_gap_score !== null && (
                      <span className="font-mono font-bold text-amber-800 shrink-0">
                        Gap {gap.service_gap_score.toFixed(0)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Areas for Further Evaluation */}
          {intelligence.areas_for_further_evaluation.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <Activity className="w-4 h-4 text-[#0A9396] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">
                  Areas Requiring Further Evaluation ({intelligence.areas_for_further_evaluation.length})
                </span>
                {intelligence.areas_for_further_evaluation
                  .slice(0, 2)
                  .map((a) => `${a.area_name} (${a.reason})`)
                  .join(' • ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subsection B: Network Expansion Insights */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-xs flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-navy-50 bg-[#0B1320] flex items-center justify-center text-[#5EEAD4] shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900">
                Network Expansion Insights
              </CardTitle>
            </div>
            <Badge variant="teal" size="sm">
              {expansion.total_evaluated_candidates} Evaluated Sites
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            {expansion.note}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {expansion.total_evaluated_candidates === 0 || !topCandidate ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 space-y-2">
              <Compass className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                No candidate locations have been evaluated yet.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/map?section=candidates')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="rounded-xl"
              >
                Evaluate Candidate Locations
              </Button>
            </div>
          ) : (
            <>
              {/* Top Ranked Candidate */}
              <div className="p-3.5 rounded-xl bg-[#EAF6F2]/70 border border-[#0A9396]/25 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#005F73]">
                    Highest-Ranked Candidate (#{topCandidate.rank ?? 1})
                  </span>
                  <Badge
                    variant={
                      topCandidate.recommendation_status === 'Beneficial'
                        ? 'success'
                        : topCandidate.recommendation_status === 'Not Beneficial'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {topCandidate.recommendation_status}
                  </Badge>
                </div>
                <div className="font-bold text-sm text-slate-900">
                  {topCandidate.name}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                  <span>
                    {topCandidate.city}, {topCandidate.district}
                  </span>
                  <span className="font-mono font-bold text-[#005F73]">
                    Score: {topCandidate.evaluation_score?.toFixed(1) ?? 'N/A'}/100 (
                    {topCandidate.confidence_tier} Confidence)
                  </span>
                </div>
              </div>

              {/* Recommendation Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="font-mono font-bold text-base text-emerald-700">
                    {expansion.recommendation_breakdown['Beneficial'] ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-800">Beneficial</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="font-mono font-bold text-base text-amber-700">
                    {expansion.recommendation_breakdown['Further Evaluation Required'] ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-800">Further Review</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-mono font-bold text-base text-slate-700">
                    {expansion.recommendation_breakdown['Not Beneficial'] ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600">Not Beneficial</div>
                </div>
              </div>

              {/* Impact Simulation Status */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800 block">
                  Impact Simulation Summary:{' '}
                  {expansion.existing_impact_simulation.available &&
                  expansion.existing_impact_simulation.estimated_additional_demand_kg_per_day !== null
                    ? `+${expansion.existing_impact_simulation.estimated_additional_demand_kg_per_day.toLocaleString()} kg/day`
                    : 'Not Run Yet'}
                </span>
                <span>{expansion.existing_impact_simulation.note}</span>
              </div>

              {/* Navigation Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/map?section=candidates')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="rounded-xl flex-1"
                >
                  Candidate Evaluation
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/simulator')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
                  className="rounded-xl flex-1"
                >
                  Impact Simulator
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
