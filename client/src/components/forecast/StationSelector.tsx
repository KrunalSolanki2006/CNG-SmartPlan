import React from 'react';
import { ForecastStationSummaryItem, Station } from '../../types/api';
import { Fuel, CheckCircle, HelpCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

type SelectableStation = (Station | ForecastStationSummaryItem) & {
  district?: string;
  locality?: string;
  address?: string;
};

interface StationSelectorProps {
  stations: SelectableStation[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  isLoading?: boolean;
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  isLoading = false,
}) => {
  const eligibleStations = stations.filter(
    (s) => s.eligible_for_simulation || ('in_study_area' in s && s.in_study_area === 'yes')
  );

  const selectedStation = eligibleStations.find((s) => s.station_id === selectedStationId);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label
          htmlFor="station-selector-dropdown"
          className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5"
        >
          <Fuel className="w-4 h-4 text-[#0F766E]" />
          <span>Select Forecast Station ({eligibleStations.length} Eligible)</span>
        </label>
        <span className="text-[11px] text-[#64748B]">
          Verified operating CNG stations
        </span>
      </div>

      <div className="relative">
        <select
          id="station-selector-dropdown"
          aria-label="Select forecast station"
          value={selectedStationId}
          disabled={isLoading || eligibleStations.length === 0}
          onChange={(e) => onSelectStation(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-[#DCE4E8] rounded-input text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all shadow-sm cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
        >
          {eligibleStations.map((station) => {
            const loc = station.district || station.locality || '';
            return (
              <option key={station.station_id} value={station.station_id}>
                {station.station_id} — {station.station_name}
                {loc ? ` (${loc})` : ''}
              </option>
            );
          })}
        </select>
      </div>

      {selectedStation && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            <div className="font-semibold text-[#0F172A] flex items-center gap-1.5 flex-wrap">
              <span>{selectedStation.station_name}</span>
              <span className="text-slate-400 font-mono text-[11px]">({selectedStation.station_id})</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {selectedStation.district
                ? `District: ${selectedStation.district}`
                : selectedStation.address || selectedStation.locality}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="teal" size="sm">
              {selectedStation.simulation_profile.replace('_', ' ')}
            </Badge>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Eligible
            </span>
          </div>
        </div>
      )}

      {eligibleStations.length === 0 && !isLoading && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>No eligible simulation stations found in inventory response.</span>
        </div>
      )}
    </div>
  );
};
