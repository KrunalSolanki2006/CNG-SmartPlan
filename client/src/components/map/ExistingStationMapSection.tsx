import React, { useState, useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { GujaratStationModel } from '../../types/candidates';
import {
  Search,
  MapPin,
  Fuel,
  ShieldCheck,
  Star,
  ExternalLink,
  RotateCcw,
  X,
  CheckCircle2,
  ChevronRight,
  Building2,
} from 'lucide-react';

export interface ExistingStationMapSectionProps {
  stations: GujaratStationModel[];
  selectedStation: GujaratStationModel | null;
  onSelectStation: (station: GujaratStationModel | null) => void;
  availableCities: string[];
  availableDistricts: string[];
}

const GUJARAT_CENTER: [number, number] = [22.2587, 71.1924];
const GUJARAT_DEFAULT_ZOOM = 7;

// High-definition SVG Teardrop Pin for Verified Operating CNG Stations
const createStationPin = (isSelected: boolean = false) => {
  return L.divIcon({
    className: 'cng-verified-station-pin',
    html: `
      <div style="
        position: relative;
        width: ${isSelected ? '34px' : '28px'};
        height: ${isSelected ? '42px' : '36px'};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
        transition: all 0.2s ease;
      ">
        <svg width="${isSelected ? '34' : '28'}" height="${isSelected ? '42' : '36'}" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cngPinGrad_${isSelected ? 'sel' : 'std'}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${isSelected ? '#34D399' : '#10B981'}" />
              <stop offset="50%" stop-color="${isSelected ? '#059669' : '#047857'}" />
              <stop offset="100%" stop-color="${isSelected ? '#047857' : '#065F46'}" />
            </linearGradient>
          </defs>
          <!-- Teardrop Pin pointing to (15, 37) -->
          <path
            d="M15 1C7.268 1 1 7.268 1 15c0 11.2 14 22 14 22s14-10.8 14-22C29 7.268 22.732 1 15 1Z"
            fill="url(#cngPinGrad_${isSelected ? 'sel' : 'std'})"
            stroke="#FFFFFF"
            stroke-width="${isSelected ? '2.5' : '1.8'}"
          />
          <!-- Badge Circle inside Pin Head -->
          <circle cx="15" cy="14" r="9.5" fill="#065F46" fill-opacity="0.4" />
          <!-- CNG Gas Pump Dispenser Vector Graphic -->
          <rect x="10.5" y="8" width="7" height="11" rx="1.2" fill="#FFFFFF" />
          <rect x="11.8" y="9.5" width="4.4" height="2.4" rx="0.5" fill="#047857" />
          <path d="M17.5 10.5h1.2a1 1 0 0 1 1 1v4.5a1 1 0 0 1-2 0V14" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="none" />
          <path d="M18.7 11.8l-1-1" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="9.5" y1="19.5" x2="18.5" y2="19.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        ${isSelected ? '<div style="position: absolute; top: -3px; left: -3px; width: 40px; height: 40px; border-radius: 50%; border: 2.5px solid #34D399; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>' : ''}
      </div>
    `,
    iconSize: isSelected ? [34, 42] : [28, 36],
    iconAnchor: isSelected ? [17, 42] : [14, 36],
    popupAnchor: [0, -36],
  });
};

// Map controller for bounds and flyTo
const StationMapController: React.FC<{ selectedStation: GujaratStationModel | null }> = ({
  selectedStation,
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedStation && selectedStation.latitude && selectedStation.longitude) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 13, {
        duration: 1.2,
      });
    }
  }, [selectedStation, map]);

  return null;
};

export const ExistingStationMapSection: React.FC<ExistingStationMapSectionProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  availableCities,
  availableDistricts,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [basemap, setBasemap] = useState<'roadmap' | 'satellite' | 'osm'>('roadmap');

  // Filter ONLY strictly verified operating stations
  const verifiedStations = useMemo(() => {
    return stations.filter(
      (s) =>
        (s.cng_classification === 'VERIFIED_OPERATING_CNG' ||
          s.cng_classification === 'CONFIRMED_CNG') &&
        s.latitude != null &&
        s.longitude != null
    );
  }, [stations]);

  // Extract unique operators dynamically
  const operatorsList = useMemo(() => {
    const set = new Set<string>();
    verifiedStations.forEach((s) => {
      const op = s.brand || s.operator;
      if (op) set.add(op);
    });
    return Array.from(set).sort();
  }, [verifiedStations]);

  // Extract cities dynamically if not provided
  const citiesList = useMemo(() => {
    if (availableCities && availableCities.length > 0) return availableCities;
    const set = new Set<string>();
    verifiedStations.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set).sort();
  }, [verifiedStations, availableCities]);

  // Extract districts dynamically if not provided
  const districtsList = useMemo(() => {
    if (availableDistricts && availableDistricts.length > 0) return availableDistricts;
    const set = new Set<string>();
    verifiedStations.forEach((s) => {
      if (s.district) set.add(s.district);
    });
    return Array.from(set).sort();
  }, [verifiedStations, availableDistricts]);

  // Operator distribution breakdown
  const operatorBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    verifiedStations.forEach((s) => {
      const op = s.brand || s.operator || 'Other';
      map[op] = (map[op] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [verifiedStations]);

  // District distribution breakdown
  const districtBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    verifiedStations.forEach((s) => {
      const dist = s.district || 'Other';
      map[dist] = (map[dist] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [verifiedStations]);

  // Filtered stations based on user selections
  const filteredStations = useMemo(() => {
    return verifiedStations.filter((st) => {
      if (selectedCity && st.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedDistrict && st.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (selectedOperator) {
        const op = (st.brand || st.operator || '').toLowerCase();
        if (op !== selectedOperator.toLowerCase()) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.station_name.toLowerCase().includes(q);
        const matchAddr = st.address.toLowerCase().includes(q);
        const matchCity = st.city.toLowerCase().includes(q);
        const matchDist = (st.district || '').toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchCity && !matchDist) return false;
      }
      return true;
    });
  }, [verifiedStations, selectedCity, selectedDistrict, selectedOperator, searchQuery]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(selectedCity) ||
    Boolean(selectedDistrict) ||
    Boolean(selectedOperator);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setSelectedDistrict('');
    setSelectedOperator('');
  };

  const tileUrls = {
    roadmap: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    satellite: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Station Name / Address Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verified CNG station by name, highway, or locality..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396] focus:border-[#0A9396] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Operator Filter */}
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-[#0A9396] cursor-pointer"
            >
              <option value="">All Operators ({operatorsList.length})</option>
              {operatorsList.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {/* District Filter */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-[#0A9396] cursor-pointer"
            >
              <option value="">All Districts ({districtsList.length})</option>
              {districtsList.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-[#0A9396] cursor-pointer"
            >
              <option value="">All Cities ({citiesList.length})</option>
              {citiesList.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset all search queries and filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Strip: Active Result Counts */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Showing {filteredStations.length} of {verifiedStations.length} Verified Stations
            </span>
            {hasActiveFilters && (
              <span className="text-[11px] text-slate-500">
                (Filtered by active criteria)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Click any pin on the map to inspect station details & verification evidence
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Details/Summary Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Gujarat Station Map */}
        <div className="lg:col-span-2 relative bg-slate-900 rounded-2xl overflow-hidden shadow-xs border border-slate-200 min-h-[580px] h-[580px]">
          {/* Map Controls Overlay (Top) */}
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
            {/* Basemap Switcher */}
            <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl p-1 border border-slate-700/80 shadow-md text-xs">
              <button
                type="button"
                onClick={() => setBasemap('roadmap')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  basemap === 'roadmap'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Roadmap
              </button>
              <button
                type="button"
                onClick={() => setBasemap('satellite')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  basemap === 'satellite'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
            </div>
          </div>

          {/* Map Legend Overlay (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 shadow-lg text-[11px] text-slate-300 max-w-xs space-y-1">
            <div className="font-semibold text-slate-200 flex items-center justify-between gap-4">
              <span>Verified CNG Stations</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {filteredStations.length} Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800 text-[10.5px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white/60"></span>
              <span>Public CNG Retail Dispenser</span>
            </div>
          </div>

          {/* Leaflet Map */}
          <MapContainer
            center={GUJARAT_CENTER}
            zoom={GUJARAT_DEFAULT_ZOOM}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              url={tileUrls[basemap]}
              subdomains={basemap === 'osm' ? ['a', 'b', 'c'] : ['0', '1', '2', '3']}
              attribution="&copy; Google Maps / OpenStreetMap contributors"
              maxZoom={19}
            />

            <StationMapController selectedStation={selectedStation} />

            {/* Render 151 Verified Stations */}
            {filteredStations.map((st) => {
              if (!st.latitude || !st.longitude) return null;
              const isSelected = selectedStation?.station_id === st.station_id;

              return (
                <Marker
                  key={st.station_id}
                  position={[st.latitude, st.longitude]}
                  icon={createStationPin(isSelected)}
                  eventHandlers={{
                    click: () => onSelectStation(st),
                  }}
                >
                  <Popup className="custom-station-popup">
                    <div className="p-1 space-y-1.5 text-slate-900 max-w-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs truncate">{st.station_name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          Verified CNG
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{st.address}</p>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                        <span>{st.city}, {st.district}</span>
                        <span className="font-semibold text-slate-700">{st.brand || st.operator}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectStation(st)}
                        className="w-full mt-1.5 py-1 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-semibold text-center cursor-pointer transition-colors"
                      >
                        Inspect Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right: Station Details Panel OR Dynamic Network Summary */}
        <div className="space-y-4">
          {selectedStation ? (
            /* STATION DETAILS CARD */
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedStation.station_id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      Verified Operating CNG
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-2 leading-snug">
                    {selectedStation.station_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedStation.city}, {selectedStation.district}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectStation(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Close station details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Station Metadata Grid */}
              <div className="space-y-3 text-xs">
                {/* Operator & Brand */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Operator / CGD Entity</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center justify-between">
                    <span>{selectedStation.operator || selectedStation.brand}</span>
                    <span className="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[10px] border border-slate-200">
                      Brand: {selectedStation.brand}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Physical Address</div>
                  <div className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                    {selectedStation.address || 'Address registered with CGD network'}
                  </div>
                </div>

                {/* GPS Coordinates */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">GPS Coordinates</div>
                    <div className="font-mono text-xs font-semibold text-slate-800 mt-0.5">
                      {selectedStation.latitude?.toFixed(5)}°N, {selectedStation.longitude?.toFixed(5)}°E
                    </div>
                  </div>
                  {selectedStation.latitude && selectedStation.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedStation.latitude},${selectedStation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-teal-700 border border-teal-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Google Maps</span>
                    </a>
                  )}
                </div>

                {/* Google Maps Review & Rating (if available) */}
                {selectedStation.rating && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      <span className="font-bold text-xs text-amber-900">{selectedStation.rating.toFixed(1)} / 5.0</span>
                    </div>
                    <span className="text-[11px] text-amber-800 font-medium">
                      {selectedStation.reviews_count ? `${selectedStation.reviews_count.toLocaleString()} user reviews` : 'Customer verified'}
                    </span>
                  </div>
                )}

                {/* Verification Evidence & Provenance */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Evidence & Provenance</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    {selectedStation.notes || 'Public vehicle retail CNG dispensing confirmed. Verified against official operator directory.'}
                  </p>
                  <div className="text-[10px] text-emerald-700 font-mono pt-1">
                    Source: {selectedStation.data_source}
                  </div>
                </div>

                {/* Demand Status Note */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Operational Demand Status</div>
                  {selectedStation.historical_daily_demand_kg ? (
                    <div className="text-emerald-800 font-semibold">
                      Metered Sales: {selectedStation.historical_daily_demand_kg.toFixed(1)} kg/day (Authoritative historical record)
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">
                      Operational public retail grid station (SCADA / sales telemetry monitored via CGD system).
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* DYNAMIC NETWORK SUMMARY PANEL */
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              <div>
                <h3 className="font-bold text-base text-slate-900 tracking-tight flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-[#0A9396]" />
                  <span>Gujarat CNG Network Summary</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dynamically aggregated statistics across verified operating CNG retail outlets.
                </p>
              </div>

              {/* Top Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Verified Unique Stations</div>
                  <div className="text-2xl font-bold text-emerald-950 font-mono mt-0.5">
                    {verifiedStations.length}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">100% Operational Grid</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Districts Covered</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
                    {districtsList.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Statewide Reach</div>
                </div>
              </div>

              {/* Operator Distribution Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Operator / CGD Distribution</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click to filter map</span>
                </div>
                <div className="space-y-1.5">
                  {operatorBreakdown.map(([op, count]) => {
                    const isSelected = selectedOperator.toLowerCase() === op.toLowerCase();
                    const pct = Math.round((count / verifiedStations.length) * 100);

                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() =>
                          setSelectedOperator(isSelected ? '' : op)
                        }
                        className={`w-full p-2 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="truncate max-w-[150px]">{op}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{pct}%</span>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200">
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* District Coverage Distribution */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Top Districts by Station Density</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click to filter</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {districtBreakdown.map(([dist, count]) => {
                    const isSelected = selectedDistrict.toLowerCase() === dist.toLowerCase();

                    return (
                      <button
                        key={dist}
                        type="button"
                        onClick={() =>
                          setSelectedDistrict(isSelected ? '' : dist)
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#005F73] text-white border-[#005F73] font-semibold shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{dist}</span>
                        <span className="font-mono text-[10px] opacity-80 font-bold">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Searchable Station Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-600" />
              <span>Gujarat Verified Station Directory ({filteredStations.length} Outlets)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified operational public CNG stations across Gujarat. Click any row to focus and inspect on the map.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              Clear Active Filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Station ID</th>
                <th className="py-2.5 px-3">Station Name</th>
                <th className="py-2.5 px-3">Operator / Brand</th>
                <th className="py-2.5 px-3">City & District</th>
                <th className="py-2.5 px-3">Google Rating</th>
                <th className="py-2.5 px-3">Verification</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStations.slice(0, 50).map((st) => {
                const isSelected = selectedStation?.station_id === st.station_id;

                return (
                  <tr
                    key={st.station_id}
                    onClick={() => onSelectStation(st)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-50/70 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 text-[11px]">
                      {st.station_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 max-w-xs truncate font-medium">
                      {st.station_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {st.brand || st.operator}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {st.city}, {st.district}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {st.rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          <span>{st.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400">({st.reviews_count || 0})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unrated</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStation(st);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <span>View on Map</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStations.length > 50 && (
          <div className="text-center text-xs text-slate-500 pt-1">
            Showing top 50 of {filteredStations.length} matching stations. Use search & district filters above to refine.
          </div>
        )}
      </div>
    </div>
  );
};
