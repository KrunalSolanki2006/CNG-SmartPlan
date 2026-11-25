import React from 'react';
import { MapPin, Compass, AlertCircle } from 'lucide-react';
import { NearbyVerifiedStation } from '../../types/candidates';
import { RADIUS_OPTIONS_KM } from './mapMarkers';

export interface NearbyVerifiedStationsListProps {
  nearbyStations: NearbyVerifiedStation[];
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
  isLoading?: boolean;
  onSelectStation?: (station: NearbyVerifiedStation) => void;
  compact?: boolean;
}

export const NearbyVerifiedStationsList: React.FC<NearbyVerifiedStationsListProps> = ({
  nearbyStations,
  radiusKm,
  onRadiusChange,
  isLoading = false,
  onSelectStation,
  compact = false,
}) => {
  return (
    <div className="space-y-3">
      {/* Radius Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Compass className="w-4 h-4 text-[#0A9396]" />
          <span>Analysis Radius</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200" role="group" aria-label="Analysis radius selector">
          {RADIUS_OPTIONS_KM.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadiusChange(r)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                radiusKm === r
                  ? 'bg-[#0B1320] text-[#5EEAD4] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Count Summary */}
      <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
        <span className="font-medium text-slate-700">
          Nearby Verified Stations ({radiusKm} km)
        </span>
        <span className="font-mono font-bold text-[#0A9396]">
          {isLoading ? 'Calculating...' : `${nearbyStations.length} found`}
        </span>
      </div>

      {/* Stations Table / Empty State */}
      {isLoading ? (
        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          Calculating Haversine distances to verified CNG stations...
        </div>
      ) : nearbyStations.length === 0 ? (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">No verified stations within {radiusKm} km</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              No verified operating CNG stations were found inside the {radiusKm} km radius. Try increasing the radius above to inspect wider network coverage.
            </p>
          </div>
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-xl border border-slate-200 ${compact ? 'max-h-60 overflow-y-auto' : 'max-h-72 overflow-y-auto'}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold z-10">
              <tr>
                <th className="py-2 px-2.5">Station Name</th>
                <th className="py-2 px-2.5 whitespace-nowrap">Distance</th>
                <th className="py-2 px-2.5">Location</th>
                {!compact && <th className="py-2 px-2.5 whitespace-nowrap">Coordinates</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {nearbyStations.map((st) => (
                <tr
                  key={st.station_id}
                  onClick={() => onSelectStation?.(st)}
                  className={`transition-colors ${
                    onSelectStation ? 'hover:bg-teal-50/50 cursor-pointer' : ''
                  }`}
                >
                  <td className="py-2 px-2.5 font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate max-w-[165px]" title={st.station_name}>
                        {st.station_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2.5 font-mono font-bold text-[#0A9396] whitespace-nowrap">
                    {st.distance_km.toFixed(2)} km
                  </td>
                  <td className="py-2 px-2.5 text-slate-600">
                    <span className="line-clamp-1 max-w-[180px]" title={st.address}>
                      {st.locality ? `${st.locality}, ${st.city}` : st.address}
                    </span>
                  </td>
                  {!compact && (
                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
