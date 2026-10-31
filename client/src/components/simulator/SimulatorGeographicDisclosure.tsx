import React from 'react';
import { AlertTriangle, MapPinOff, Info, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { ImpactSimulatorResponse } from '../../types/api';

interface SimulatorGeographicDisclosureProps {
  data: ImpactSimulatorResponse;
}

export const SimulatorGeographicDisclosure: React.FC<SimulatorGeographicDisclosureProps> = ({ data }) => {
  const { geographic_analysis, warnings } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Geographic Analysis Availability Notice (AT-I05) */}
      <div className="rounded-card bg-amber-50/60 p-5 border border-amber-200/90 shadow-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-100 text-amber-800">
              <MapPinOff className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
              Nearby Station Spatial Allocation
            </h4>
          </div>
          <Badge variant="warning" size="sm">
            {geographic_analysis.available ? 'Available' : 'Unavailable (AT-I05)'}
          </Badge>
        </div>

        <p className="text-xs text-amber-900/90 leading-relaxed">
          {geographic_analysis.reason}
        </p>

        <div className="p-3 bg-white/80 rounded border border-amber-200/70 text-[11px] text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Why is station-by-station diversion withheld?</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            The data package contains 12 directory stations with 0 approved coordinates. Calculating individual station cannibalization (e.g. allocating kg/day specifically from AMD001 Visat vs AMD002 Bodakdev) requires independently verified spatial coordinates. Providing station-specific cannibalization without coordinates would fabricate false precision.
          </p>
        </div>
      </div>

      {/* Assumptions, Provenance & Decision Support Boundaries */}
      <div className="rounded-card bg-white p-5 border border-slate-200 shadow-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#0F766E]/10 text-[#0F766E]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Scenario Assumptions & Decision Boundaries
            </h4>
          </div>
          <DataOriginBadge origin={data.data_origin} size="sm" />
        </div>

        <div className="space-y-2">
          {warnings && warnings.length > 0 ? (
            warnings.map((warn, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{warn}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No active simulation warnings.</p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
          <strong>Decision-Support Notice:</strong> This prototype is designed for exploratory scenario planning. It does not guarantee retail customer queue reduction, commercial profitability, or station investment payback periods.
        </div>
      </div>
    </div>
  );
};
