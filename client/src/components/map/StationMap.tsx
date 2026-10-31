import React from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Station } from '../../types/api';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { Compass, RotateCcw } from 'lucide-react';

export interface StationMapProps {
  stations: Station[];
  proposedCoords: { lat: number; lng: number } | null;
  onSelectProposedLocation: (coords: { lat: number; lng: number }) => void;
  selectedStation: Station | null;
}

// Center coordinates for Ahmedabad study area
export const AHMEDABAD_CENTER: [number, number] = [23.0225, 72.5714];
export const DEFAULT_ZOOM = 12;

// Custom styled Leaflet DivIcons (avoids Vite asset path resolution issues)
const proposedIcon = L.divIcon({
  className: 'custom-proposed-pin',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#0F766E;color:white;box-shadow:0 4px 14px rgba(15,118,110,0.5);border:2px solid white;position:relative;">
    <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #0F766E;opacity:0.6;"></div>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

const verifiedIcon = L.divIcon({
  className: 'custom-verified-pin',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#15803D;color:white;box-shadow:0 3px 10px rgba(21,128,61,0.4);border:2px solid white;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Map click listener hook component
const MapClickHandler: React.FC<{
  onMapClick: (coords: { lat: number; lng: number }) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick({
        lat: Math.round(e.latlng.lat * 10000) / 10000,
        lng: Math.round(e.latlng.lng * 10000) / 10000,
      });
    },
  });
  return null;
};


export const StationMap: React.FC<StationMapProps> = ({
  stations,
  proposedCoords,
  onSelectProposedLocation,
}) => {
  // STRICT DATA GOVERNANCE RULE:
  // Render ONLY stations that are approved for map pin AND have non-null coordinates.
  // In the current dataset, this equals 0 stations.
  const verifiedMapStations = stations.filter(
    (s) => s.eligible_for_map_pin && s.latitude !== null && s.longitude !== null
  );

  return (
    <div className="relative rounded-card-lg border border-[#DCE4E8] bg-slate-100 overflow-hidden shadow-card h-[520px] w-full select-none">
      <MapContainer
        center={AHMEDABAD_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <MapClickHandler onMapClick={onSelectProposedLocation} />

        {/* 1. Verified Station Pins (Only rendered if coordinates are verified and approved) */}
        {verifiedMapStations.map((station) => (
          <Marker
            key={station.station_id}
            position={[station.latitude!, station.longitude!]}
            icon={verifiedIcon}
          >
            <Popup className="custom-popup">
              <div className="p-1 space-y-1 text-xs">
                <div className="font-bold text-slate-900">{station.station_name}</div>
                <div className="text-[11px] text-slate-500">{station.address || station.locality}</div>
                <DataOriginBadge origin="real_public" size="sm" />
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 2. Proposed Candidate Marker (Click or manually entered) */}
        {proposedCoords && (
          <Marker
            position={[proposedCoords.lat, proposedCoords.lng]}
            icon={proposedIcon}
          >
            <Popup autoPan={false}>
              <div className="p-1 space-y-1 text-xs text-slate-900">
                <div className="font-bold flex items-center gap-1.5 text-[#0F766E]">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Proposed Candidate Location</span>
                </div>
                <div className="font-mono text-[11px] text-slate-700">
                  Lat: {proposedCoords.lat.toFixed(4)}°N, Lng: {proposedCoords.lng.toFixed(4)}°E
                </div>
                <DataOriginBadge origin="user_entered_scenario" size="sm" />
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Viewport Reset Tool */}
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => {
            const mapEl = document.querySelector('.leaflet-container');
            if (mapEl) {
              // Dispatch recenter
              onSelectProposedLocation(proposedCoords || { lat: AHMEDABAD_CENTER[0], lng: AHMEDABAD_CENTER[1] });
            }
          }}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-md border border-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Reset to Ahmedabad center (23.0225°N, 72.5714°E)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Center Ahmedabad</span>
        </button>
      </div>

      {/* Map Interactive Hint Overlay */}
      <div className="absolute bottom-6 left-3 z-10 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-[11px] shadow-lg border border-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
          <span>Click anywhere on the map to set a proposed station marker</span>
        </div>
      </div>
    </div>
  );
};
