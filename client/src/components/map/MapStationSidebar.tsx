import React, { useState } from 'react';
import { Station } from '../../types/api';
import { Search, Filter, Fuel, MapPin, MapPinOff } from 'lucide-react';
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
    <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs space-y-4 text-xs h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-[#005F73]" />
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
            Station Inventory Register
          </h4>
        </div>
        <Badge variant="neutral" size="sm">
          {stations.length} Directory Records
        </Badge>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search stations or locality..."
            aria-label="Search map directory stations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-[#647078] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0A9396] focus:border-[#0A9396] transition-all"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <Filter className="w-3 h-3 text-slate-500" />
            Study Area:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterStudyArea('all')}
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStudyArea === 'all'
                  ? 'bg-[#001219] text-white'
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({stations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStudyArea('yes')}
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStudyArea === 'yes'
                  ? 'bg-[#005F73] text-white'
                  : 'bg-[#EAF6F2] text-[#005F73] border border-[#94D2BD]/60 hover:bg-[#D5EFE7]'
              }`}
            >
              Study Area (11)
            </button>
            <button
              type="button"
              onClick={() => setFilterStudyArea('uncertain')}
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStudyArea === 'uncertain'
                  ? 'bg-[#CA6702] text-white'
                  : 'bg-[#FEF6E9] text-[#CA6702] border border-[#E9D8A6] hover:bg-[#FDF0D5]'
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
          <div className="p-4 text-center text-slate-500 text-xs">
            Loading directory stations...
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
            No stations match your filter criteria.
          </div>
        ) : (
          filteredStations.map((station) => {
            const isSelected = selectedStation?.station_id === station.station_id;

            return (
              <div
                key={station.station_id}
                onClick={() => onSelectStation(isSelected ? null : station)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                  isSelected
                    ? 'border-[#0A9396] bg-[#EAF6F2] shadow-xs ring-1 ring-[#0A9396]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="font-semibold text-slate-900 leading-tight">
                    <span>{station.station_name}</span>
                    <span className="font-mono text-[10px] text-slate-500 ml-1.5">
                      ({station.station_id})
                    </span>
                  </div>
                  <Badge variant={station.in_study_area === 'yes' ? 'teal' : 'warning'} size="sm">
                    {station.in_study_area === 'yes' ? 'Study Area' : 'Uncertain'}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {station.address || station.locality}
                </p>

                {/* Explicit Coordinate Status */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                  {station.latitude !== null && station.longitude !== null ? (
                    <span className="inline-flex items-center gap-1 text-[#005F73] font-medium font-mono">
                      <MapPin className="w-3 h-3 text-[#0A9396]" />
                      {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#AE2012] font-medium">
                      <MapPinOff className="w-3 h-3 text-[#AE2012]" />
                      Coordinates: NULL
                    </span>
                  )}
                  <span className={station.eligible_for_map_pin ? 'text-[#0A9396] font-medium' : 'text-slate-500 font-medium'}>
                    {station.eligible_for_map_pin ? 'Map Pin Approved' : 'Pin Excluded'}
                  </span>
                </div>

                {isSelected && (
                  <div className="pt-2 border-t border-[#94D2BD]/60 text-[11px] text-slate-900 space-y-1">
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
                      <span className="font-medium text-slate-900 capitalize truncate max-w-[150px]">
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

      {/* Network footer */}
      <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
        <Fuel className="w-3.5 h-3.5 text-[#0A9396] shrink-0" />
        <span>Gujarat Gas operational network stations in Ahmedabad region.</span>
      </div>
    </div>
  );
};
