import React from 'react';
import { ShieldCheck, AlertCircle, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { DataQualityFlagsOverview, HourlySummaryOverview } from '../../types/api';

export interface DataQualityFlagsBannerProps {
  flags?: DataQualityFlagsOverview | null;
  hourly?: HourlySummaryOverview | null;
}

export const DataQualityFlagsBanner: React.FC<DataQualityFlagsBannerProps> = ({
  flags,
  hourly,
}) => {
  if (!flags) return null;

  return (
    <Card className="border-[#DCE4E8] bg-[#FAFCFD]">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
              Data Provenance & Verification Audit
            </h4>
          </div>
          <span className="text-[11px] text-[#64748B]">
            Strict adherence to docs/DATA_PROVENANCE.md
          </span>
        </div>

        {/* 4 Critical Integrity Flags */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {/* Flag 1: Coordinates */}
          <div className="p-2.5 rounded bg-white border border-slate-200 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block text-[11px]">
                Coordinates Verified
              </span>
              <span className="text-[11px] text-amber-700 font-medium">
                {flags.verified_coordinates ? 'Verified' : 'False (0 Verified)'}
              </span>
            </div>
          </div>

          {/* Flag 2: Sales Data */}
          <div className="p-2.5 rounded bg-white border border-slate-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block text-[11px]">
                Real Sales Recorded
              </span>
              <span className="text-[11px] text-purple-700 font-medium">
                {flags.real_sales_data ? 'Recorded Real' : 'False (100% Synthetic)'}
              </span>
            </div>
          </div>

          {/* Flag 3: Supply Data */}
          <div className="p-2.5 rounded bg-white border border-slate-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block text-[11px]">
                Real Supply Recorded
              </span>
              <span className="text-[11px] text-purple-700 font-medium">
                {flags.real_supply_data ? 'Recorded Real' : 'False (100% Synthetic)'}
              </span>
            </div>
          </div>

          {/* Flag 4: Holiday Data */}
          <div className="p-2.5 rounded bg-white border border-slate-200 flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block text-[11px]">
                Holiday Calendar
              </span>
              <span className="text-[11px] text-slate-600 font-medium">
                {flags.holiday_data ? 'Encoded' : 'Blank (8,041 Unassigned)'}
              </span>
            </div>
          </div>
        </div>

        {/* Hourly summary if present */}
        {hourly && (
          <div className="p-2.5 rounded bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>
                Hourly demand profiles available for 3 stations:{' '}
                <strong className="text-[#0F172A]">
                  {hourly.stations_with_hourly_data.join(', ')}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Period: {hourly.hourly_period_start} to {hourly.hourly_period_end} (2,160 rows)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
