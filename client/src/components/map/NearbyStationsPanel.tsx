import React from 'react';
import { Compass, AlertCircle, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface NearbyStationsPanelProps {
  proposedCoords: { lat: number; lng: number } | null;
}

export const NearbyStationsPanel: React.FC<NearbyStationsPanelProps> = ({
  proposedCoords,
}) => {
  return (
    <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#0F766E]" />
          <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-xs">
            Nearby Station Distance Analysis
          </h4>
        </div>
        <Badge variant="warning" size="sm">
          Service Unavailable
        </Badge>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[#64748B]">
        <div className="flex items-start gap-2 text-slate-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Backend Geographic Limitation:</strong> In accordance with <code className="font-mono text-slate-700 bg-white px-1 py-0.2 rounded border border-slate-200">API_CONTRACT.md</code> (Section 3, Impact Simulator), nearby station analysis is permanently unavailable for this data package release because zero operating stations have verified coordinates.
          </p>
        </div>

        <p className="text-[11px] leading-relaxed">
          The 8 candidate points in <code className="font-mono text-slate-700">station_coordinate_candidates.csv</code> remain unapproved (<code className="font-mono text-slate-700">approved_for_map_pin=no</code>). Calculating straight-line (Haversine) distances or network diversion against unverified secondary leads is strictly prohibited to prevent misleading expansion decisions.
        </p>

        {proposedCoords && (
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Selected Candidate:</span>
            <span className="font-mono font-semibold text-slate-800">
              {proposedCoords.lat.toFixed(4)}°N, {proposedCoords.lng.toFixed(4)}°E
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Station-specific diversion figures are not calculated on the map. Use the <strong>Network Impact Simulator</strong> for catchment-level assumptions.</span>
      </div>
    </div>
  );
};
