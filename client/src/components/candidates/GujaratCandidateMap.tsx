import React, { useMemo, useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CandidateRankingItem, GujaratStationModel, DiscoveryDiagnosticsModel } from '../../types/candidates';
import {
  Compass,
  Activity,
  Plus,
  MapPin,
  Search,
} from 'lucide-react';

// Gujarat geographic center coordinates
export const GUJARAT_CENTER: [number, number] = [22.65, 71.95];
export const GUJARAT_DEFAULT_ZOOM = 7;

// Fix standard Leaflet default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom DivIcons for Candidates and Network Stations
const createCandidateIcon = (rank: number | null, isRankable: boolean, isSelected: boolean) => {
  if (!isRankable) {
    return L.divIcon({
      className: `candidate-pin ${isSelected ? 'selected' : ''}`,
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="
            width: 26px;
            height: 26px;
            transform: rotate(45deg);
            background: #64748B;
            border: 2px solid #FFFFFF;
            border-radius: 4px;
            box-shadow: 0 4px 10px rgba(100,116,139,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="transform: rotate(-45deg); color: #FEF08A; font-size: 11px; font-weight: bold;">!</div>
          </div>
          ${isSelected ? '<div style="position:absolute;inset:-6px;border-radius:4px;transform:rotate(45deg);border:2px solid #F59E0B;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>' : ''}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }

  // Cyan diamond styling for Candidate Expansion Locations
  const diamondBg = rank === 1
    ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' // Bright Sky/Cyan for #1
    : 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)'; // Cyan/Teal Diamond

  return L.divIcon({
    className: `candidate-pin ${isSelected ? 'selected' : ''}`,
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="
          width: 30px;
          height: 30px;
          transform: rotate(45deg);
          background: ${diamondBg};
          border: 2px solid #E0F2FE;
          border-radius: 5px;
          box-shadow: 0 4px 12px rgba(8,145,178,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="transform: rotate(-45deg); color: #FFFFFF; font-size: 10.5px; font-weight: 800; font-family: monospace;">
            #${rank}
          </div>
        </div>
        ${isSelected ? '<div style="position:absolute;inset:-6px;border-radius:6px;transform:rotate(45deg);border:2px solid #38BDF8;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>' : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createStationIcon = (_classification?: string, isNearest: boolean = false) => {
  return L.divIcon({
    className: 'cng-verified-station-pin',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
        transition: transform 0.15s ease;
      ">
        <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cngPinGrad_${isNearest ? 'near' : 'std'}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#10B981" />
              <stop offset="50%" stop-color="#059669" />
              <stop offset="100%" stop-color="#047857" />
            </linearGradient>
          </defs>
          <!-- Teardrop Map Pin Path pointing to bottom center (15, 37) -->
          <path
            d="M15 1C7.268 1 1 7.268 1 15c0 11.2 14 22 14 22s14-10.8 14-22C29 7.268 22.732 1 15 1Z"
            fill="url(#cngPinGrad_${isNearest ? 'near' : 'std'})"
            stroke="#FFFFFF"
            stroke-width="2"
          />
          <!-- Badge Circle inside Pin Head -->
          <circle cx="15" cy="14" r="9.5" fill="#047857" fill-opacity="0.35" />
          <!-- CNG Gas Pump Dispenser Vector Graphic -->
          <!-- Main Dispenser Body -->
          <rect x="10.5" y="8" width="7" height="11" rx="1.2" fill="#FFFFFF" />
          <!-- Digital Display Meter -->
          <rect x="11.8" y="9.5" width="4.4" height="2.4" rx="0.5" fill="#059669" />
          <!-- Delivery Hose & Nozzle on Right -->
          <path d="M17.5 10.5h1.2a1 1 0 0 1 1 1v4.5a1 1 0 0 1-2 0V14" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="none" />
          <path d="M18.7 11.8l-1-1" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <!-- Dispenser Base Ground Stand -->
          <line x1="9.5" y1="19.5" x2="18.5" y2="19.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        ${isNearest ? '<div style="position: absolute; top: 0; left: 0; width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid #10B981; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>' : ''}
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -38],
  });
};

interface MapControllerProps {
  selectedCandidate: CandidateRankingItem | null;
}

const MapController: React.FC<MapControllerProps> = ({ selectedCandidate }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedCandidate && selectedCandidate.latitude && selectedCandidate.longitude) {
      map.flyTo([selectedCandidate.latitude, selectedCandidate.longitude], 11, {
        duration: 1.2,
      });
    }
  }, [selectedCandidate, map]);

  return null;
};

// Map click event handler for Pin Drop Method
interface MapClickHandlerProps {
  isPinDropActive: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ isPinDropActive, onMapClick }) => {
  useMapEvents({
    click(e) {
      if (isPinDropActive && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export interface GujaratCandidateMapProps {
  candidates: CandidateRankingItem[];
  stations: GujaratStationModel[];
  selectedCandidate: CandidateRankingItem | null;
  onSelectCandidate: (candidate: CandidateRankingItem) => void;
  onOpenDossier: (candidateId: string) => void;
  onOpenDiagnostics?: () => void;
  diagnostics?: DiscoveryDiagnosticsModel | null;
  onMapClick?: (lat: number, lng: number) => void;
  onProposeCandidate?: () => void;
  selectedDistrict?: string;
  onDistrictChange?: (district: string) => void;
  availableDistricts?: string[];
}

export const GujaratCandidateMap: React.FC<GujaratCandidateMapProps> = ({
  candidates,
  stations,
  selectedCandidate,
  onSelectCandidate,
  onOpenDossier,
  onOpenDiagnostics,
  diagnostics,
  onMapClick,
  onProposeCandidate,
  selectedDistrict = '',
  onDistrictChange,
  availableDistricts = [],
}) => {
  const [basemap, setBasemap] = useState<'roadmap' | 'satellite' | 'osm'>('roadmap');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [mapSearch, setMapSearch] = useState<string>('');
  const [recordFilter, setRecordFilter] = useState<'all' | 'verified' | 'candidates'>('all');
  const [showPolyline, setShowPolyline] = useState<boolean>(true);
  const [isPinDropModeActive, setIsPinDropModeActive] = useState<boolean>(false);

  // Extract cities from merged station list
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    candidates.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set).sort();
  }, [stations, candidates]);

  // Extract districts if not provided
  const districtsList = useMemo(() => {
    if (availableDistricts && availableDistricts.length > 0) {
      return availableDistricts;
    }
    const set = new Set<string>();
    stations.forEach((s) => {
      if (s.district) set.add(s.district);
    });
    candidates.forEach((c) => {
      if (c.district) set.add(c.district);
    });
    return Array.from(set).sort();
  }, [stations, candidates, availableDistricts]);

  // Counts of verified operating stations
  const { verifiedCount } = useMemo(() => {
    let v = 0;
    stations.forEach((s) => {
      if (s.cng_classification === 'VERIFIED_OPERATING_CNG' || s.cng_classification === 'CONFIRMED_CNG') {
        v++;
      }
    });
    return { verifiedCount: v };
  }, [stations]);

  // Filtered operational stations: STRICTLY verified operating stations only
  const filteredStations = useMemo(() => {
    if (recordFilter === 'candidates') return [];
    return stations.filter((st) => {
      // STRICT REQUIREMENT: Only verified operating stations on the map
      const isVerified =
        st.cng_classification === 'VERIFIED_OPERATING_CNG' ||
        st.cng_classification === 'CONFIRMED_CNG';
      if (!isVerified) return false;

      if (selectedCity && st.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedDistrict && st.district && st.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (mapSearch.trim()) {
        const q = mapSearch.toLowerCase();
        const matchName = st.station_name.toLowerCase().includes(q);
        const matchAddr = st.address.toLowerCase().includes(q);
        const matchCity = st.city.toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchCity) return false;
      }
      return true;
    });
  }, [stations, selectedCity, selectedDistrict, mapSearch, recordFilter]);

  // Filtered candidate locations
  const filteredCandidates = useMemo(() => {
    if (recordFilter === 'verified') return [];
    return candidates.filter((c) => {
      if (selectedCity && c.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedDistrict && c.district && c.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (mapSearch.trim()) {
        const q = mapSearch.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCorridor = c.highway_corridor.toLowerCase().includes(q);
        const matchCity = c.city.toLowerCase().includes(q);
        if (!matchName && !matchCorridor && !matchCity) return false;
      }
      return true;
    });
  }, [candidates, selectedCity, selectedDistrict, mapSearch, recordFilter]);

  // Compute active polyline coordinates when a candidate with nearest station is selected
  const activePolylineData = useMemo(() => {
    if (
      !selectedCandidate ||
      !selectedCandidate.latitude ||
      !selectedCandidate.longitude ||
      !selectedCandidate.nearest_station ||
      !selectedCandidate.nearest_station.nearest_lat ||
      !selectedCandidate.nearest_station.nearest_lng
    ) {
      return null;
    }
    const cLat = selectedCandidate.latitude;
    const cLng = selectedCandidate.longitude;
    const nLat = selectedCandidate.nearest_station.nearest_lat;
    const nLng = selectedCandidate.nearest_station.nearest_lng;

    return {
      positions: [
        [cLat, cLng],
        [nLat, nLng],
      ] as [number, number][],
      info: selectedCandidate.nearest_station,
    };
  }, [selectedCandidate]);

  const handleMapClicked = (lat: number, lng: number) => {
    setIsPinDropModeActive(false);
    if (onMapClick) {
      onMapClick(lat, lng);
    }
  };

  const tileUrls = {
    roadmap: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    satellite: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl bg-slate-900 select-none">
      
      {/* Top Map Controls Floating Ribbon */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 shadow-md text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-1 font-semibold text-slate-200 flex items-center gap-1.5 border-r border-slate-700">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span>Gujarat Network</span>
          </span>

          {/* Search Input on Map */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station or corridor..."
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-teal-500 w-44 placeholder-slate-500"
            />
          </div>

          {/* City Filter Selector */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
          >
            <option value="">All Cities ({citiesList.length})</option>
            {citiesList.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* District Filter Selector */}
          {onDistrictChange && (
            <select
              value={selectedDistrict}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="">All Districts ({districtsList.length})</option>
              {districtsList.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          )}

          {/* Record Type Filter Selector */}
          <select
            value={recordFilter}
            onChange={(e) => setRecordFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">
              All Active Map Locations ({verifiedCount + candidates.length})
            </option>
            <option value="verified">Verified Operating Stations ({verifiedCount})</option>
            <option value="candidates">Candidate Expansion Sites ({candidates.length})</option>
          </select>

          {/* Basemap Switcher */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              type="button"
              onClick={() => setBasemap('roadmap')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                basemap === 'roadmap' ? 'bg-teal-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => setBasemap('satellite')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                basemap === 'satellite' ? 'bg-teal-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setBasemap('osm')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                basemap === 'osm' ? 'bg-teal-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              OSM
            </button>
          </div>
        </div>

        {/* Right-Side Ribbon Actions */}
        <div className="flex items-center gap-2">
          {/* Method 2 Pin Drop Trigger */}
          <button
            type="button"
            onClick={() => setIsPinDropModeActive(!isPinDropModeActive)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isPinDropModeActive
                ? 'bg-amber-500 text-white border-amber-400 shadow-md ring-2 ring-amber-400/30'
                : 'bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border-teal-500/40'
            }`}
            title="Click here, then click anywhere on Gujarat map to drop a pin and propose a station"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{isPinDropModeActive ? 'Click Map to Drop Pin' : 'Drop Pin on Map'}</span>
          </button>

          {/* Propose Location Direct Button */}
          {onProposeCandidate && (
            <button
              type="button"
              onClick={onProposeCandidate}
              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Propose Candidate</span>
            </button>
          )}

          {/* Live Diagnostics Trigger */}
          {onOpenDiagnostics && (
            <button
              type="button"
              onClick={onOpenDiagnostics}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Click to view SerpAPI Station Discovery Diagnostics and Provenance"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Diagnostics ({diagnostics?.new_records_added ?? 227})</span>
            </button>
          )}

          <label className="flex items-center gap-1.5 px-2 py-1 text-slate-300 cursor-pointer hover:text-white text-xs">
            <input
              type="checkbox"
              checked={showPolyline}
              onChange={(e) => setShowPolyline(e.target.checked)}
              className="rounded border-slate-600 text-teal-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-teal-400"></span>
              Transit
            </span>
          </label>
        </div>
      </div>

      {/* Active Pin-Drop Banner */}
      {isPinDropModeActive && (
        <div className="absolute top-16 left-3 right-3 z-[1000] bg-amber-500/90 text-amber-950 font-bold px-4 py-2 rounded-xl border border-amber-400 shadow-xl flex items-center justify-between backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-4 h-4 animate-bounce text-amber-950" />
            <span>PIN DROP MODE ACTIVE: Click anywhere on the Gujarat network map to capture coordinates and propose a new CNG station candidate!</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPinDropModeActive(false)}
            className="text-[11px] bg-amber-950/20 hover:bg-amber-950/30 px-2 py-0.5 rounded text-amber-950 font-semibold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 shadow-lg text-[11px] text-slate-300 max-w-xs space-y-1.5">
        <div className="font-semibold text-slate-200 flex items-center justify-between">
          <span>Map Inventory Markers</span>
          <span className="text-[10px] text-teal-400 font-mono">
            {filteredStations.length + filteredCandidates.length} Active
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white/60"></span>
            <span>Verified Operating ({verifiedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-cyan-600 border border-white/60"></span>
            <span>Candidate Sites ({candidates.length})</span>
          </div>
        </div>
      </div>

      {/* Main Leaflet Map */}
      <MapContainer
        center={GUJARAT_CENTER}
        zoom={GUJARAT_DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url={tileUrls[basemap]}
          subdomains={basemap === 'osm' ? ['a', 'b', 'c'] : ['0', '1', '2', '3']}
          attribution='&copy; Google Maps / OpenStreetMap contributors'
          maxZoom={19}
        />

        <MapController selectedCandidate={selectedCandidate} />

        <MapClickHandler
          isPinDropActive={isPinDropModeActive}
          onMapClick={handleMapClicked}
        />

        {/* Existing Gujarat Network Stations (Verified, Discovered, Potential CNG) */}
        {filteredStations.map((st) => {
          if (!st.latitude || !st.longitude) return null;
          const isVerified = st.cng_classification === 'VERIFIED_OPERATING_CNG' || st.cng_classification === 'CONFIRMED_CNG';
          const isNearest =
            selectedCandidate?.nearest_station?.station_id === st.station_id;

          let statusBadgeText = 'Discovered CNG';
          let statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
          if (isVerified) {
            statusBadgeText = 'Verified Operating CNG';
            statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
          } else if (st.cng_classification === 'POTENTIAL_CNG') {
            statusBadgeText = 'Potential CNG (Unverified)';
            statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
          }

          return (
            <Marker
              key={st.station_id}
              position={[st.latitude, st.longitude]}
              icon={createStationIcon(st.cng_classification, isNearest)}
            >
              <Popup className="custom-station-popup">
                <div className="p-1 space-y-1.5 text-slate-900 max-w-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs truncate">{st.station_name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 border ${statusBadgeClass}`}
                    >
                      {statusBadgeText}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{st.address}</p>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                    <span>{st.city}, {st.district}</span>
                    <span className="font-medium text-slate-700">{st.brand}</span>
                  </div>

                  {/* Demand Information Panel */}
                  {isVerified && (
                    <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-0.5 text-[9.5px]">
                      <div className="font-bold flex items-center gap-1 text-emerald-950">
                        <span>Demand Profile:</span>
                      </div>
                      {st.demand_data_available && st.historical_daily_demand_kg ? (
                        <>
                          <div className="flex justify-between">
                            <span>Historical Daily Sales:</span>
                            <span className="font-mono font-bold text-emerald-800">{st.historical_daily_demand_kg.toFixed(1)} kg/day</span>
                          </div>
                          {st.forecasted_daily_demand_kg && (
                            <div className="flex justify-between">
                              <span>Forecasted Daily Sales:</span>
                              <span className="font-mono font-bold text-teal-800">{st.forecasted_daily_demand_kg.toFixed(1)} kg/day</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-600 italic">
                          Metered Demand History: Unavailable (outside Ahmedabad metered study area)
                        </p>
                      )}
                    </div>
                  )}

                  <div className="text-[9.5px] text-slate-500 flex items-center justify-between">
                    <span>Evidence:</span>
                    <span className="font-semibold text-slate-700">
                      {st.data_source === 'official_cgd_directory'
                        ? 'Official CGD Directory'
                        : 'Google Maps Place Search'}
                    </span>
                  </div>
                  {st.status_change_reason && (
                    <div className="text-[9px] p-1 bg-amber-50 rounded border border-amber-200 text-amber-900 leading-snug">
                      <span className="font-semibold text-amber-950">Audit Transition: </span>
                      {st.status_change_reason}
                    </div>
                  )}
                  {st.cng_audit_reason && (
                    <div className="text-[9px] p-1 bg-slate-50 rounded border border-slate-200 text-slate-600 leading-snug">
                      <span className="font-semibold text-slate-700">Audit: </span>
                      {st.cng_audit_reason}
                    </div>
                  )}
                  {st.place_id && (
                    <div className="text-[9px] text-slate-400 font-mono truncate">
                      Place ID: {st.place_id}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Connecting Polyline between Selected Candidate & Nearest Station */}
        {showPolyline && activePolylineData && (
          <Polyline
            positions={activePolylineData.positions}
            pathOptions={{
              color: '#0A9396',
              weight: 3.5,
              dashArray: '6, 8',
              opacity: 0.85,
            }}
          >
            <Popup>
              <div className="p-1 text-xs text-slate-900">
                <p className="font-bold">Inter-Station Transit Corridor</p>
                <p className="text-[11px]">
                  Straight-line: {activePolylineData.info.straight_line_distance_km} km
                </p>
                <p className="text-[11px] font-semibold text-teal-700">
                  Est. Road Distance: ~{activePolylineData.info.driving_road_distance_km} km (Detour {activePolylineData.info.detour_ratio}x)
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Destination: {activePolylineData.info.station_name}
                </p>
              </div>
            </Popup>
          </Polyline>
        )}

        {/* Candidate Location Markers */}
        {filteredCandidates.map((c) => {
          if (!c.latitude || !c.longitude) return null;
          const isSelected = selectedCandidate?.candidate_id === c.candidate_id;

          return (
            <Marker
              key={c.candidate_id}
              position={[c.latitude, c.longitude]}
              icon={createCandidateIcon(c.rank, c.is_rankable, isSelected)}
              eventHandlers={{
                click: () => onSelectCandidate(c),
              }}
            >
              <Popup>
                <div className="p-1 space-y-1.5 text-slate-900 max-w-[260px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs truncate">{c.name}</span>
                    {c.is_rankable ? (
                      <span className="bg-teal-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0">
                        #{c.rank} ({c.final_score})
                      </span>
                    ) : (
                      <span className="bg-slate-200 text-slate-700 font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0">
                        Unrankable
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                      Candidate Expansion Location
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    {c.highway_corridor} • {c.city}
                  </p>

                  <div className="text-[10px] space-y-0.5 pt-1 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confidence Tier:</span>
                      <span className="font-semibold">{c.confidence_tier} ({c.data_completeness_pct}%)</span>
                    </div>
                    {c.nearest_station && (
                      <div className="space-y-0.5 pt-0.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nearest Verified:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                            {c.nearest_station.station_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Distance:</span>
                          <span className="font-mono font-bold text-teal-700">
                            {c.nearest_station.driving_road_distance_km ?? c.nearest_station.straight_line_distance_km} km
                          </span>
                        </div>
                        {c.nearest_station.stations_within_radius && (
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Radius Density:</span>
                            <span className="font-mono">
                              1km: {c.nearest_station.stations_within_radius['1km'] ?? 0} | 
                              3km: {c.nearest_station.stations_within_radius['3km'] ?? 0} | 
                              5km: {c.nearest_station.stations_within_radius['5km'] ?? 0}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDossier(c.candidate_id)}
                    className="w-full mt-1.5 py-1 px-2 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Inspect Evidence Dossier</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};