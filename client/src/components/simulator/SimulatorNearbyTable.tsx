import React from 'react';
import { MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { NearbyVerifiedStation } from '../../types/candidates';

export interface SimulatorNearbyTableProps {
  nearbyStations: NearbyVerifiedStation[];
  radiusKm: number;
  nearestOverallStation?: NearbyVerifiedStation | null;
  highlightedStationId?: string | null;
  onSelectStation?: (stationId: string) => void;
}

export const SimulatorNearbyTable: React.FC<SimulatorNearbyTableProps> = ({
  nearbyStations,
  radiusKm,
  nearestOverallStation,
  highlightedStationId,
  onSelectStation,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Nearby Existing Station Comparison
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified existing CNG stations within {radiusKm} km, sorted by nearest distance.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#005F73] border border-teal-200 text-xs font-mono font-bold">
          {nearbyStations.length} Verified within {radiusKm} km
        </span>
      </div>

      {nearbyStations.length === 0 ? (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              No verified existing CNG stations found within {radiusKm} km.
            </p>
            {nearestOverallStation && (
              <p className="text-[11px] text-amber-800">
                The nearest verified station in the Gujarat network is{' '}
                <strong>{nearestOverallStation.station_name}</strong> at{' '}
                <strong className="font-mono">
                  {nearestOverallStation.distance_km.toFixed(2)} km
                </strong>
                .
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[380px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold z-10">
              <tr>
                <th className="py-2.5 px-3">Existing Verified Station</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Distance from Proposed Station</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {nearbyStations.map((st, idx) => {
                const isNearest = idx === 0;
                const isHighlighted = highlightedStationId === st.station_id;

                return (
                  <tr
                    key={st.station_id}
                    onClick={() => onSelectStation?.(st.station_id)}
                    className={`transition-colors ${
                      onSelectStation ? 'cursor-pointer hover:bg-teal-50/50' : ''
                    } ${
                      isNearest
                        ? 'bg-teal-50/70'
                        : isHighlighted
                        ? 'bg-blue-50/60'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {st.station_name}
                            </span>
                            {isNearest && (
                              <span className="px-1.5 py-0.5 rounded bg-[#0B1320] text-[#5EEAD4] text-[10px] font-bold uppercase">
                                Nearest
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {st.city}, {st.district}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#005F73] whitespace-nowrap">
                      {st.distance_km.toFixed(2)} km
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        Verified
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
