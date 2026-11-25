import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  MapPin,
  TrendingUp,
  Fuel,
  ArrowRightCircle,
} from 'lucide-react';
import { BeneficialOutcomeLabel, NetworkImpactSimulationResponse } from '../../types/candidates';

export interface SimulatorFinalAssessmentProps {
  simulation: NetworkImpactSimulationResponse;
}

function getDecisionHighlightStyles(outcome: BeneficialOutcomeLabel) {
  switch (outcome) {
    case 'Potentially Beneficial':
      return {
        banner: 'bg-emerald-500/15 border-2 border-emerald-400 shadow-lg shadow-emerald-950/40',
        badge: 'bg-emerald-400 text-slate-950 border-emerald-300',
        titleColor: 'text-emerald-300',
        nextStepBox: 'bg-emerald-500/10 border border-emerald-400/40 text-emerald-100',
        nextStepLabel: 'text-emerald-300',
        icon: <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />,
      };
    case 'Potentially Not Beneficial':
      return {
        banner: 'bg-amber-500/15 border-2 border-amber-400 shadow-lg shadow-amber-950/40',
        badge: 'bg-amber-400 text-slate-950 border-amber-300',
        titleColor: 'text-amber-300',
        nextStepBox: 'bg-amber-500/10 border border-amber-400/40 text-amber-100',
        nextStepLabel: 'text-amber-300',
        icon: <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />,
      };
    case 'Inconclusive / Insufficient Data':
    default:
      return {
        banner: 'bg-sky-500/15 border-2 border-sky-400 shadow-lg shadow-sky-950/40',
        badge: 'bg-sky-300 text-slate-950 border-sky-200',
        titleColor: 'text-sky-300',
        nextStepBox: 'bg-sky-500/10 border border-sky-400/40 text-sky-100',
        nextStepLabel: 'text-sky-300',
        icon: <HelpCircle className="w-7 h-7 text-sky-300 shrink-0" />,
      };
  }
}

export const SimulatorFinalAssessment: React.FC<SimulatorFinalAssessmentProps> = ({
  simulation,
}) => {
  const {
    geographical_metrics: gm,
    demand_estimate: de,
    network_sales_impact: ni,
    beneficial_assessment: ba,
  } = simulation;

  const outcome: BeneficialOutcomeLabel = ba?.outcome ?? 'Inconclusive / Insufficient Data';
  const nearest = gm.nearest_station;
  const styles = getDecisionHighlightStyles(outcome);

  let plainReason = simulation.assessment_summary;
  let nextStep =
    'Review nearby station demand, local traffic, and pipeline availability before committing capital.';

  if (outcome === 'Potentially Beneficial' && ni?.available && de?.available) {
    plainReason = `This site looks promising. It is expected to sell about ${de.potential_daily_sales_kg?.toLocaleString()} kg/day and add +${ni.net_network_sales_change_kg?.toLocaleString()} kg/day (+${ni.net_network_impact_pct?.toFixed(1)}%) in new network sales without heavily hurting existing stations.`;
    nextStep =
      'Verify local site access, road traffic volume, and pipeline connection before final approval.';
  } else if (outcome === 'Potentially Not Beneficial' && ni?.available && de?.available) {
    plainReason = `Adding a station here provides limited net benefit (+${ni.net_network_sales_change_kg?.toLocaleString()} kg/day, +${ni.net_network_impact_pct?.toFixed(1)}%) because most of its expected ${de.potential_daily_sales_kg?.toLocaleString()} kg/day sales would shift from nearby existing stations (${ni.total_nearby_sales_loss_kg?.toLocaleString()} kg/day loss).`;
    nextStep =
      'Consider a less crowded corridor farther from existing stations unless severe local waiting queues exist.';
  } else if (gm.nearby_verified_count === 0 && nearest) {
    plainReason = `There are no existing verified CNG stations within ${simulation.radius_km} km (the nearest is ${nearest.station_name} at ${nearest.distance_km.toFixed(2)} km). While this fills a location gap, local sales history is missing so commercial demand cannot be confirmed.`;
    nextStep =
      'Conduct a local corridor vehicle count and demand survey to confirm sufficient CNG customers.';
  } else if (nearest) {
    plainReason = `${gm.nearby_verified_count} verified station(s) already exist within ${simulation.radius_km} km (nearest is ${nearest.distance_km.toFixed(2)} km away), but station-level sales records are unavailable in this corridor to estimate demand or revenue impact.`;
    nextStep =
      'Obtain local dispenser throughput data before making an investment decision.';
  }

  return (
    <div
      data-testid="final-assessment-section"
      className="rounded-2xl bg-[#0B1320] text-slate-100 p-6 border border-slate-800 shadow-sm space-y-5"
    >
      {/* Section Heading */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5EEAD4]">
            Final Decision Summary
          </span>
          <h3 className="text-base font-bold text-white mt-0.5">
            Final Location Assessment
          </h3>
        </div>
      </div>

      {/* HIGHLIGHTED FINAL DECISION CALLOUT */}
      <div
        data-testid="highlighted-final-decision"
        className={`p-5 rounded-2xl ${styles.banner} space-y-3`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {styles.icon}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">
                Final Decision
              </div>
              <div className={`text-xl font-extrabold tracking-tight ${styles.titleColor}`}>
                {outcome}
              </div>
            </div>
          </div>

          <span
            data-testid="beneficial-outcome-badge"
            className={`px-3.5 py-1.5 rounded-full border text-xs font-extrabold uppercase tracking-wide ${styles.badge}`}
          >
            {outcome}
          </span>
        </div>

        <p className="text-sm font-medium text-white leading-relaxed">{plainReason}</p>
      </div>

      {/* 3 Simple At-a-Glance Takeaways */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="font-bold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
            <span>Station Spacing</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {nearest ? `${nearest.distance_km.toFixed(2)} km to nearest` : 'No data'}
          </div>
          <p className="text-[11px] text-slate-400">
            {gm.nearby_verified_count} verified station(s) within {simulation.radius_km} km
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="font-bold text-slate-300 flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
            <span>Expected New Sales</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {de?.available && de.potential_daily_sales_kg != null
              ? `${de.potential_daily_sales_kg.toLocaleString()} kg/day`
              : 'Insufficient Data'}
          </div>
          <p className="text-[11px] text-slate-400">
            {de?.available && de.potential_monthly_sales_kg != null
              ? `Approx. ${de.potential_monthly_sales_kg.toLocaleString()} kg/month`
              : 'Nearby sales history unavailable'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="font-bold text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
            <span>Overall Network Gain</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {ni?.available && ni.net_network_sales_change_kg != null
              ? `+${ni.net_network_sales_change_kg.toLocaleString()} kg/day (+${ni.net_network_impact_pct?.toFixed(1)}%)`
              : 'Insufficient Data'}
          </div>
          <p className="text-[11px] text-slate-400">
            {ni?.available && ni.total_nearby_sales_loss_kg != null
              ? `After -${ni.total_nearby_sales_loss_kg.toLocaleString()} kg/day shift from nearby stations`
              : 'Needs nearby baseline sales'}
          </p>
        </div>
      </div>

      {/* Highlighted Recommended Next Step */}
      <div className={`px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs ${styles.nextStepBox}`}>
        <ArrowRightCircle className={`w-4 h-4 shrink-0 mt-0.5 ${styles.nextStepLabel}`} />
        <div>
          <span className={`font-bold uppercase tracking-wider mr-1.5 ${styles.nextStepLabel}`}>
            Recommended Next Step:
          </span>
          <span className="font-medium">{nextStep}</span>
        </div>
      </div>
    </div>
  );
};
