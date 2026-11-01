import React, { useState } from 'react';
import { Station } from '../../types/api';
import { Search, Filter, Fuel, ShieldX, MapPinOff } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface MapStationSidebarProps {
  stations: Station[];
  isLoading: boolean;
  selectedStation: Station | null;
  onSelectStation: (station: Station | null) => void;
}

export const MapStationSidebar: React.FC<MapStationSidebarProps> = ({
  stations,
  isLoading,
  selectedStation,
  onSelectStation,
}) => {
  const [search, setSearch] = useState('');
  const [filterStudyArea, setFilterStudyArea] = useState<'all' | 'yes' | 'uncertain'>('all');

  const filteredStations = stations.filter((s) => {
    const matchesSearch =
      !search ||
      s.station_id.toLowerCase().includes(search.toLowerCase()) ||
      s.station_name.toLowerCase().includes(search.toLowerCase()) ||
      s.locality.toLowerCase().includes(search.toLowerCase());

    const matchesStudy =
      filterStudyArea === 'all' || s.in_study_area === filterStudyArea;

    return matchesSearch && matchesStudy;
  });

  return (
    <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card space-y-4 text-xs h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-[#0F766E]" />
          <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-xs">
            Station Inventory Register
          </h4>
        </div>
        <Badge variant="neutral" size="sm">
          {stations.length} Directory Records
        </Badge>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search stations or locality..."
            aria-label="Search map directory stations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Study Area:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterStudyArea('all')}
              className={`px-2 py-0.5 rounded font-medium ${
                filterStudyArea === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({stations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStudyArea('yes')}
              className={`px-2 py-0.5 rounded font-medium ${
                filterStudyArea === 'yes'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Study Area (11)
            </button>
            <button
              type="button"
              onClick={() => setFilterStudyArea('uncertain')}
              className={`px-2 py-0.5 rounded font-medium ${
                filterStudyArea === 'uncertain'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Uncertain (1)
            </button>
          </div>
        </div>
      </div>

      {/* Station Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px]">
        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-xs">
            Loading directory stations...
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs border border-dashed rounded-lg">
            No stations match your filter criteria.
          </div>
        ) : (
          filteredStations.map((station) => {
            const isSelected = selectedStation?.station_id === station.station_id;

            return (
              <div
                key={station.station_id}
                onClick={() => onSelectStation(isSelected ? null : station)}
                className={`p-3 rounded-lg border transition-all cursor-pointer text-xs space-y-1.5 ${
                  isSelected
                    ? 'border-[#0F766E] bg-teal-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="font-semibold text-slate-900 leading-tight">
                    <span>{station.station_name}</span>
                    <span className="font-mono text-[10px] text-slate-400 ml-1.5">
                      ({station.station_id})
                    </span>
                  </div>
                  <Badge variant={station.in_study_area === 'yes' ? 'success' : 'warning'} size="sm">
                    {station.in_study_area === 'yes' ? 'Study Area' : 'Uncertain'}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {station.address || station.locality}
                </p>

                {/* Explicit Coordinate Status */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                  <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                    <MapPinOff className="w-3 h-3 text-red-600" />
                    Coordinates: NULL
                  </span>
                  <span className="text-slate-400 font-medium">
                    {station.eligible_for_map_pin ? 'Map Pin Approved' : 'Pin Excluded'}
                  </span>
                </div>

                {isSelected && (
                  <div className="pt-2 border-t border-teal-200/80 text-[11px] text-slate-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operator:</span>
                      <span className="font-medium text-slate-900">{station.operator}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Profile:</span>
                      <span className="font-medium capitalize">{station.simulation_profile.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CNG Status:</span>
                      <span className="font-medium text-slate-800 capitalize truncate max-w-[150px]">
                        {station.cng_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Governance footer */}
      <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1">
        <ShieldX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Directory subset (12 stations). Not a complete Ahmedabad census.</span>
      </div>
    </div>
  );
};
