import React from 'react';
import { Layers } from 'lucide-react';

export const MapLegend: React.FC = () => {
  return (
    <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider text-[11px]">
          <Layers className="w-3.5 h-3.5 text-[#0A9396]" />
          <span>Map Symbology Legend</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          Coverage: Ahmedabad Metropolitan Region (Google Maps Cartography)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
        {/* 1. Proposed Location */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5]">
          <div className="w-4 h-4 rounded-full bg-[#EA580C] border-2 border-white shadow-xs shrink-0 flex items-center justify-center text-[8px] text-white font-bold">
            P
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block truncate">Proposed Candidate</span>
            <span className="text-[10px] text-[#EA580C] font-semibold">Candidate Site</span>
          </div>
        </div>

        {/* 2. Verified Approved Station */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-4 h-4 rounded-full bg-[#005F73] border-2 border-white shadow-xs shrink-0 flex items-center justify-center text-[8px] text-white font-bold">
            ✓
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block truncate">Approved Station (11 Plotted)</span>
            <span className="text-[10px] text-[#0A9396] font-medium">Verified Network</span>
          </div>
        </div>

        {/* 3. Active Directions Route */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-4 h-1.5 rounded bg-[#005F73] shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block truncate">Road Route</span>
            <span className="text-[10px] text-[#005F73] font-medium">Driving Navigation</span>
          </div>
        </div>

        {/* 4. Station Cluster */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#0A9396] to-[#005F73] border border-white shadow-xs shrink-0 flex items-center justify-center text-[7px] text-white font-extrabold">
            3+
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block truncate">Station Cluster</span>
            <span className="text-[10px] text-slate-500">Auto-grouped pins</span>
          </div>
        </div>
      </div>
    </div>
  );
};
