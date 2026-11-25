import React from 'react';
import { Calculator, HelpCircle } from 'lucide-react';
import { DemandAndSalesEstimate } from '../../types/candidates';

export interface SimulatorDemandEstimationCardProps {
  demandEstimate?: DemandAndSalesEstimate;
  radiusKm: number;
}

export const SimulatorDemandEstimationCard: React.FC<
  SimulatorDemandEstimationCardProps
> = ({ demandEstimate, radiusKm }) => {
  if (!demandEstimate) {
    return null;
  }

  return (
    <div
      data-testid="demand-estimation-section"
      className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden"
    >
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#0A9396]" />
          <h2 className="text-sm font-bold text-slate-900">
            New Station Demand & Sales Estimation
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            demandEstimate.available
              ? 'bg-teal-50 text-teal-900 border-teal-300'
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}
        >
          {demandEstimate.status}
        </span>
      </div>

      {!demandEstimate.available ? (
        <div className="p-5 space-y-3 text-xs">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-900">
                Insufficient Data for Demand & Sales Estimation
              </div>
              <p className="text-amber-800 leading-relaxed">
                {demandEstimate.reason_unavailable ||
                  `No nearby verified stations within ${radiusKm} km have station-level demand or sales history.`}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Capacity Input Status
            </div>
            <div className="text-xs font-semibold text-slate-800 mt-1">
              {demandEstimate.capacity_status}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Potential Daily Demand
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                  {demandEstimate.demand_classification}
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1.5">
                {demandEstimate.potential_daily_demand_kg?.toLocaleString() ?? 'N/A'} kg/day
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Estimated catchment demand</div>
            </div>

            <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase text-[#005F73]">
                  Estimated Daily Sales
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white text-teal-900 border border-teal-200 font-semibold">
                  {demandEstimate.sales_classification}
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-[#005F73] mt-1.5">
                {demandEstimate.potential_daily_sales_kg?.toLocaleString() ?? 'N/A'} kg/day
              </div>
              <div className="text-[11px] text-teal-800 mt-0.5">
                {demandEstimate.diverted_from_nearby_kg?.toLocaleString() ?? 0} shifted +{' '}
                {demandEstimate.incremental_coverage_gain_kg?.toLocaleString() ?? 0} new demand
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">
                Estimated Monthly Sales
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1.5">
                {demandEstimate.potential_monthly_sales_kg?.toLocaleString() ?? 'N/A'} kg/mo
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">30-day projection</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">
                Capacity Utilization
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1.5">
                {demandEstimate.capacity_utilization_pct != null
                  ? `${demandEstimate.capacity_utilization_pct.toFixed(1)}%`
                  : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {demandEstimate.capacity_status}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
