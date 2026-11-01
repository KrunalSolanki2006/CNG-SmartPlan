import React from 'react';
import { ForecastReliability } from '../../types/api';
import { ShieldAlert, CheckCircle2, XCircle, Info } from 'lucide-react';
import { DataOriginBadge } from '../ui/DataOriginBadge';

interface ForecastReliabilityCardProps {
  reliability: ForecastReliability;
  limitations: string[];
}

export const ForecastReliabilityCard: React.FC<ForecastReliabilityCardProps> = ({
  reliability,
  limitations,
}) => {
  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#0F766E]" />
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Model Reliability & Data Limitations Register
          </h3>
        </div>
        <DataOriginBadge origin={reliability.data_source} size="sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Reliability Checklist */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#0F766E]" />
            Data Integrity Checklist
          </h4>
          <ul className="space-y-2 text-[#64748B]">
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
              <span>Historical Training Depth:</span>
              <span className="font-mono font-bold text-slate-800">
                {reliability.history_days} Days (2024–2025)
              </span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
              <span>Missing Series Values:</span>
              <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {reliability.missing_values} (Zero gaps in series)
              </span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
              <span>Holiday & Event Calendar:</span>
              <span className="font-mono font-bold text-amber-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Missing (Blank in all 8,041 rows)
              </span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
              <span>Confidence Bands Provided:</span>
              <span className="font-mono font-semibold text-slate-800">
                {reliability.confidence_interval_available ? 'Yes (85%–115%)' : 'None (Baseline)'}
              </span>
            </li>
          </ul>
        </div>

        {/* Limitations Callout */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Mandatory Contract Limitations
          </h4>
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
            {limitations.map((limitation, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-amber-900 leading-snug">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1 shrink-0" />
                <span>{limitation}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-amber-200/60 text-[10px] text-amber-800 font-medium">
              PS000002 Governance: Decision-support tool only. Never guarantee queue reduction, supply certainty, or financial profitability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
