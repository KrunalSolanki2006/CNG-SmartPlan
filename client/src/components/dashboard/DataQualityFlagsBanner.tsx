import React from 'react';
import { ShieldCheck, AlertCircle, Clock, MapPinOff, Layers, Calendar } from 'lucide-react';
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
    <Card className="border-[#DCE4E8] bg-gradient-to-r from-slate-50/80 via-white to-slate-50/60 shadow-card">
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
                Data Provenance & Verification Audit
              </h4>
              <p className="text-[11px] text-slate-500">
                Transparent data integrity status per docs/DATA_PROVENANCE.md
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            Enterprise Governance Standards
          </span>
        </div>

        {/* 4 Critical Integrity Flags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Flag 1: Coordinates */}
          <div className={`p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs flex items-start gap-2.5 transition-all ${flags.verified_coordinates ? 'hover:border-teal-300' : 'hover:border-amber-300'}`}>
            <div className={`${flags.verified_coordinates ? 'icon-box-teal' : 'icon-box-amber'} shrink-0 mt-0.5`}>
              {flags.verified_coordinates ? (
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
              ) : (
                <MapPinOff className="w-3.5 h-3.5 text-amber-700" />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 block text-[11px]">
                Coordinates Verified
              </span>
              <span className={`text-[11px] ${flags.verified_coordinates ? 'text-teal-700' : 'text-amber-700'} font-semibold inline-block`}>
                {flags.verified_coordinates ? '11 Verified (Study Area)' : 'False (0 Verified)'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {flags.verified_coordinates ? 'Active GIS pins' : 'Quarantined records'}
              </span>
            </div>
          </div>

          {/* Flag 2: Sales Data */}
          <div className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs flex items-start gap-2.5 transition-all hover:border-purple-300">
            <div className="icon-box-purple shrink-0 mt-0.5">
              <AlertCircle className="w-3.5 h-3.5 text-purple-700" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 block text-[11px]">
                Real Sales Recorded
              </span>
              <span className="text-[11px] text-purple-700 font-semibold inline-block">
                {flags.real_sales_data ? 'Recorded Real' : 'Calibrated Baseline Model'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Synthetic generation</span>
            </div>
          </div>

          {/* Flag 3: Supply Data */}
          <div className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs flex items-start gap-2.5 transition-all hover:border-blue-300">
            <div className="icon-box-blue shrink-0 mt-0.5">
              <Layers className="w-3.5 h-3.5 text-blue-700" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 block text-[11px]">
                Supply Data Modeled
              </span>
              <span className="text-[11px] text-blue-700 font-semibold inline-block">
                {flags.real_supply_data ? 'Recorded Real' : 'Modeled Baseline Schedule'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">8,041 planned rows</span>
            </div>
          </div>

          {/* Flag 4: Holiday Calendar */}
          <div className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs flex items-start gap-2.5 transition-all hover:border-slate-300">
            <div className="icon-box-slate shrink-0 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 block text-[11px]">
                Holiday Calendar
              </span>
              <span className="text-[11px] text-slate-700 font-semibold inline-block">
                {flags.holiday_data ? 'Recorded Calendar' : 'Standard Calendar'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">National gazette</span>
            </div>
          </div>
        </div>

        {/* Hourly summary if present */}
        {hourly && (
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 text-slate-700">
              <div className="icon-box-teal shrink-0">
                <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
              </div>
              <span>
                Hourly demand profiles available for {hourly.stations_with_hourly_data.length} stations:{' '}
                <strong className="text-[#0F172A] font-mono">
                  {hourly.stations_with_hourly_data.join(', ')}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Period: {hourly.hourly_period_start} to {hourly.hourly_period_end}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
