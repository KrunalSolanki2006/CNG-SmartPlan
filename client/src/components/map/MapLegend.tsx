import React from 'react';
import { Layers } from 'lucide-react';

export const MapLegend: React.FC = () => {
  return (
    <div className="rounded-card bg-white p-3.5 border border-[#DCE4E8] shadow-card space-y-2.5 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">
          <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Map Symbology Legend</span>
        </div>
        <span className="text-[10px] text-slate-400">Ahmedabad Grid</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
        {/* 1. Proposed Location */}
        <div className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-200">
          <div className="w-4 h-4 rounded-full bg-[#0F766E] border-2 border-white shadow-xs shrink-0 flex items-center justify-center text-[8px] text-white font-bold">
            P
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-800 block truncate">Proposed Candidate</span>
            <span className="text-[10px] text-teal-700">user_entered_scenario</span>
          </div>
        </div>

        {/* 2. Verified Station */}
        <div className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-200">
          <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs shrink-0 flex items-center justify-center text-[8px] text-white font-bold">
            ✓
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-800 block truncate">Verified Pin (0 Plotted)</span>
            <span className="text-[10px] text-emerald-700">real_public (verified)</span>
          </div>
        </div>

        {/* 3. Unapproved Directory */}
        <div className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-200">
          <div className="w-4 h-4 rounded-full bg-slate-300 border-2 border-dashed border-slate-400 shrink-0 flex items-center justify-center text-[8px] text-slate-600 font-bold">
            ✕
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-800 block truncate">Unapproved Leads</span>
            <span className="text-[10px] text-slate-500">Excluded from Map</span>
          </div>
        </div>
      </div>
    </div>
  );
};
