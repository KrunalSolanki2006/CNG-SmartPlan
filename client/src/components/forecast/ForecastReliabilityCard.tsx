import React from 'react';
import { DataAuditSummary, ForecastReliability, ModelInfo } from '../../types/api';
import { ShieldAlert, CheckCircle2, XCircle, Info } from 'lucide-react';

interface ForecastReliabilityCardProps {
  reliability: ForecastReliability;
  limitations: string[];
  dataAudit?: DataAuditSummary;
  modelInfo?: ModelInfo;
}

export const ForecastReliabilityCard: React.FC<ForecastReliabilityCardProps> = ({
  reliability,
  limitations,
  dataAudit,
  modelInfo,
}) => {
  const dateRangeText =
    dataAudit?.earliest_date && dataAudit?.latest_date
      ? `${dataAudit.earliest_date} to ${dataAudit.latest_date}`
      : 'Range unavailable';

  const hasMissingValues = reliability.missing_values > 0;

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#0F766E]" />
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Data Audit, Reliability &amp; Limitations
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Source: {reliability.data_source}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Dynamic Data Integrity Checklist */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#0F766E]" />
            Station Data Audit Checklist
          </h4>
          <ul className="space-y-2 text-[#64748B]">
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150 gap-2">
              <span>Valid Historical Depth:</span>
              <span className="font-mono font-bold text-slate-800 text-right">
                {reliability.history_days} Days ({dateRangeText})
              </span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150 gap-2">
              <span>Missing Calendar Dates:</span>
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  hasMissingValues ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {hasMissingValues ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {reliability.missing_values}{' '}
                {hasMissingValues ? '(Gaps present)' : '(No date gaps)'}
              </span>
            </li>
            {dataAudit && (
              <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150 gap-2">
                <span>Excluded Raw Records:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {dataAudit.excluded_records} of {dataAudit.total_raw_records}
                </span>
              </li>
            )}
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150 gap-2">
              <span>Holiday &amp; Event Calendar:</span>
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  reliability.missing_holiday_data ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {reliability.missing_holiday_data ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Unassigned in dataset
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Included
                  </>
                )}
              </span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150 gap-2">
              <span>Prediction Intervals:</span>
              <span className="font-mono font-semibold text-slate-800 text-right">
                {reliability.confidence_interval_available
                  ? modelInfo?.confidence_interval_method || '95% Empirical Residual Band'
                  : 'None (Baseline)'}
              </span>
            </li>
          </ul>
        </div>

        {/* Limitations Callout */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Documented Limitations &amp; Caveats
          </h4>
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
            {limitations.map((limitation, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-[11px] text-amber-900 leading-snug"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1 shrink-0" />
                <span>{limitation}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-amber-200/60 text-[10px] text-amber-800 font-medium">
              {reliability.evaluation_note}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
