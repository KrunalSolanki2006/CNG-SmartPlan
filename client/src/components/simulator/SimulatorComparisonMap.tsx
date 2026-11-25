import React, { useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  GujaratStationModel,
  NearbyVerifiedStation,
  StationSalesImpactRow,
} from '../../types/candidates';
import {
  createVerifiedStationMarker,
  createProposedStationMarker,
} from '../evaluation/mapMarkers';

export interface SimulatorComparisonMapProps {
  proposedName: string;
  proposedLocation: string;
  proposedLat: number;
  proposedLng: number;
  radiusKm: number;
  verifiedStations: GujaratStationModel[];
  nearbyStations: NearbyVerifiedStation[];
  stationImpactRows?: StationSalesImpactRow[];
  highlightedStationId?: string | null;
  onSelectStation?: (stationId: string) => void;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0088;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

const MapViewportSync: React.FC<{ lat: number; lng: number; radiusKm: number }> = ({
  lat,
  lng,
  radiusKm,
}) => {
  const map = useMap();

  useEffect(() => {
    const zoom =
      radiusKm <= 1 ? 14 : radiusKm <= 2 ? 13 : radiusKm <= 5 ? 12 : radiusKm <= 10 ? 11 : 10;
    map.setView([lat, lng], zoom);
  }, [lat, lng, radiusKm, map]);

  return null;
};

export const SimulatorComparisonMap: React.FC<SimulatorComparisonMapProps> = ({
  proposedName,
  proposedLocation,
  proposedLat,
  proposedLng,
  radiusKm,
  verifiedStations,
  nearbyStations,
  stationImpactRows,
  highlightedStationId,
  onSelectStation,
}) => {
  const nearbyMap = useMemo(() => {
    const map = new Map<string, NearbyVerifiedStation>();
    nearbyStations.forEach((st) => map.set(st.station_id, st));
    return map;
  }, [nearbyStations]);

  const impactMap = useMemo(() => {
    const map = new Map<string, StationSalesImpactRow>();
    (stationImpactRows ?? []).forEach((row) => map.set(row.station_id, row));
    return map;
  }, [stationImpactRows]);

  const eligibleVerifiedStations = useMemo(() => {
    return verifiedStations.filter(
      (s) =>
        (s.cng_classification === 'VERIFIED_OPERATING_CNG' ||
          s.cng_classification === 'CONFIRMED_CNG') &&
        s.latitude != null &&
        s.longitude != null &&
        !(Math.abs(s.latitude) < 1e-6 && Math.abs(s.longitude) < 1e-6)
    );
  }, [verifiedStations]);

  return (
    <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200 bg-[#0B1320] shadow-xs">
      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 z-[1000] bg-[#0B1320]/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-xl text-[11px] text-slate-100 space-y-1.5"
        style={{ backgroundColor: 'rgba(11, 19, 32, 0.94)' }}
      >
        <div className="font-semibold text-white pb-1 border-b border-slate-800 flex items-center justify-between gap-4">
          <span>Network Comparison Legend</span>
          <span className="font-mono text-[10px] text-[#5EEAD4]">{radiusKm} km radius</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0" />
          <span>Proposed Station</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shrink-0" />
          <span>Existing Verified Station</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-[#5EEAD4] shrink-0" />
          <span>Nearby Verified ({nearbyStations.length})</span>
        </div>
      </div>

      <MapContainer
        center={[proposedLat, proposedLng]}
        zoom={12}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['0', '1', '2', '3']}
          attribution="&copy; Google Maps"
          maxZoom={19}
        />

        <MapViewportSync lat={proposedLat} lng={proposedLng} radiusKm={radiusKm} />

        {/* Existing Verified CNG Stations (Blue Markers) */}
        {eligibleVerifiedStations.map((st) => {
          if (st.latitude == null || st.longitude == null) return null;
          const nearbyMatch = nearbyMap.get(st.station_id);
          const isNearby = Boolean(nearbyMatch);
          const isHighlighted = highlightedStationId === st.station_id;
          const distKm =
            nearbyMatch?.distance_km ??
            Number(haversineKm(proposedLat, proposedLng, st.latitude, st.longitude).toFixed(2));

          return (
            <Marker
              key={st.station_id}
              position={[st.latitude, st.longitude]}
              icon={createVerifiedStationMarker(isHighlighted, isNearby)}
              eventHandlers={{
                click: () => onSelectStation?.(st.station_id),
              }}
            >
              <Popup>
                <div className="p-1 space-y-1 text-slate-900 max-w-xs text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{st.station_name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase shrink-0">
                      Verified
                    </span>
                  </div>
                  <div className="px-2 py-1 rounded bg-teal-50 border border-teal-200 font-semibold text-teal-900 flex items-center justify-between text-[11px]">
                    <span>Distance:</span>
                    <span className="font-mono">{distKm.toFixed(2)} km</span>
                  </div>
                  {(() => {
                    const row = impactMap.get(st.station_id);
                    if (row?.has_sales_data && row.current_daily_sales_kg != null) {
                      return (
                        <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[10px] space-y-0.5">
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Baseline Sales:</span>
                            <span className="font-mono font-semibold">{row.current_daily_sales_kg} kg/d</span>
                          </div>
                          {row.estimated_sales_loss_kg != null && (
                            <div className="flex justify-between gap-2 text-amber-800">
                              <span>Est. Sales Loss:</span>
                              <span className="font-mono font-bold">-{row.estimated_sales_loss_kg} kg/d</span>
                            </div>
                          )}
                          {row.remaining_daily_sales_kg != null && (
                            <div className="flex justify-between gap-2 text-teal-800">
                              <span>Remaining:</span>
                              <span className="font-mono font-semibold">{row.remaining_daily_sales_kg} kg/d</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (isNearby) {
                      return (
                        <div className="text-[10px] text-slate-500">
                          Station sales baseline: Unavailable
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="text-[10px] text-slate-500">
                    {st.city}, {st.district}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Selected Analysis Radius Circle */}
        <Circle
          center={[proposedLat, proposedLng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#0A9396',
            fillColor: '#5EEAD4',
            fillOpacity: 0.16,
            weight: 2.5,
            dashArray: '6, 6',
          }}
        />

        {/* Proposed New Station (Green Marker) */}
        <Marker position={[proposedLat, proposedLng]} icon={createProposedStationMarker()}>
          <Popup>
            <div className="p-1 space-y-1 text-slate-900 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold">{proposedName}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                  Proposed
                </span>
              </div>
              {proposedLocation && <p className="text-[11px] text-slate-600">{proposedLocation}</p>}
              <p className="font-mono text-[10px] text-slate-500">
                {proposedLat.toFixed(5)}°N, {proposedLng.toFixed(5)}°E
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};
