import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  GujaratStationModel,
  NearbyStationsResponse,
  NearbyVerifiedStation,
} from '../../types/candidates';
import { fetchNearbyVerifiedStations } from '../../api/candidates';
import { useProposedEvaluation } from '../../context/ProposedEvaluationContext';
import {
  createVerifiedStationMarker,
  createProposedStationMarker,
} from '../evaluation/mapMarkers';
import { NearbyVerifiedStationsList } from '../evaluation/NearbyVerifiedStationsList';
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
  PlusCircle,
  Play,
  Trash2,
  AlertCircle,
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

const StationMapController: React.FC<{
  selectedStation: GujaratStationModel | null;
  proposedCoords: { lat: number; lng: number } | null;
  radiusKm: number;
}> = ({ selectedStation, proposedCoords, radiusKm }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedStation && selectedStation.latitude && selectedStation.longitude) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 13, {
        duration: 1.0,
      });
    }
  }, [selectedStation, map]);

  useEffect(() => {
    if (proposedCoords) {
      const targetZoom =
        radiusKm <= 1 ? 14 : radiusKm <= 2 ? 13 : radiusKm <= 5 ? 12 : radiusKm <= 10 ? 11 : 10;
      map.flyTo([proposedCoords.lat, proposedCoords.lng], targetZoom, {
        duration: 0.9,
      });
    }
  }, [proposedCoords, radiusKm, map]);

  return null;
};

const EvaluatePinClickHandler: React.FC<{
  enabled: boolean;
  onPlacePin: (lat: number, lng: number) => void;
}> = ({ enabled, onPlacePin }) => {
  useMapEvents({
    click(e) {
      if (enabled) {
        onPlacePin(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const ExistingStationMapSection: React.FC<ExistingStationMapSectionProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  availableCities,
  availableDistricts,
}) => {
  const navigate = useNavigate();
  const { proposedEvaluation, setProposedEvaluation, clearProposedEvaluation } =
    useProposedEvaluation();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [basemap, setBasemap] = useState<'roadmap' | 'satellite' | 'osm'>('roadmap');

  // Integrated New-Station Evaluation States (initialized from preserved context if returning)
  const [isEvaluateMode, setIsEvaluateMode] = useState<boolean>(false);
  const [proposedName, setProposedName] = useState<string>(
    () => proposedEvaluation?.proposed_name || 'Proposed New CNG Station'
  );
  const [proposedLocationLabel, setProposedLocationLabel] = useState<string>(
    () => proposedEvaluation?.selected_location || ''
  );
  const [expectedCapacity, setExpectedCapacity] = useState<string>(() =>
    proposedEvaluation?.expected_daily_capacity_kg != null
      ? String(proposedEvaluation.expected_daily_capacity_kg)
      : ''
  );
  const [proposedCoords, setProposedCoords] = useState<{ lat: number; lng: number } | null>(() =>
    proposedEvaluation
      ? { lat: proposedEvaluation.latitude, lng: proposedEvaluation.longitude }
      : null
  );
  const [radiusKm, setRadiusKm] = useState<number>(() => proposedEvaluation?.radius_km || 5);
  const [nearbyData, setNearbyData] = useState<NearbyStationsResponse | null>(null);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const proposedMarkerRef = useRef<L.Marker | null>(null);

  // Filter ONLY strictly verified operating stations with valid coordinates
  const verifiedStations = useMemo(() => {
    return stations.filter(
      (s) =>
        (s.cng_classification === 'VERIFIED_OPERATING_CNG' ||
          s.cng_classification === 'CONFIRMED_CNG') &&
        s.latitude != null &&
        s.longitude != null &&
        !(Math.abs(s.latitude) < 1e-6 && Math.abs(s.longitude) < 1e-6)
    );
  }, [stations]);

  const nearbyDistanceMap = useMemo(() => {
    const map = new Map<string, NearbyVerifiedStation>();
    nearbyData?.nearby_stations.forEach((st) => {
      map.set(st.station_id, st);
    });
    return map;
  }, [nearbyData]);

  // Shared backend call for nearby verified stations
  const fetchNearbyForPin = useCallback(
    async (lat: number, lng: number, radius: number, name: string, locLabel?: string) => {
      setIsLoadingNearby(true);
      setNearbyError(null);
      try {
        const resp = await fetchNearbyVerifiedStations({
          lat,
          lng,
          radius_km: radius,
          name: name.trim() || 'Proposed New CNG Station',
          location_label: locLabel || undefined,
        });
        setNearbyData(resp);
        return resp;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load nearby verified stations.';
        setNearbyError(msg);
        return null;
      } finally {
        setIsLoadingNearby(false);
      }
    },
    []
  );

  // Hydrate nearby stations on return from Simulator when preserved proposed station exists
  useEffect(() => {
    if (proposedCoords && !nearbyData && !isLoadingNearby) {
      fetchNearbyForPin(
        proposedCoords.lat,
        proposedCoords.lng,
        radiusKm,
        proposedName,
        proposedLocationLabel
      );
    }
    // Only run on initial mount restoration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncContext = useCallback(
    (
      lat: number,
      lng: number,
      radius: number,
      name: string,
      locLabel: string,
      capStr: string,
      nearbyList: NearbyVerifiedStation[],
      updateTimestamp: boolean = false
    ) => {
      const parsedCap = capStr.trim() ? parseFloat(capStr) : null;
      setProposedEvaluation({
        proposed_name: name.trim() || 'Proposed New CNG Station',
        latitude: lat,
        longitude: lng,
        selected_location: locLabel || `Gujarat Map Pin (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
        expected_daily_capacity_kg:
          parsedCap !== null && !isNaN(parsedCap) && parsedCap >= 0 ? parsedCap : null,
        radius_km: radius,
        nearby_station_ids: nearbyList.map((s) => s.station_id),
        nearby_stations: nearbyList,
        location_source: proposedEvaluation?.location_source || 'map_pin',
        candidate_id: proposedEvaluation?.candidate_id || null,
        source_section: 'network_map',
        updated_at: updateTimestamp ? Date.now() : proposedEvaluation?.updated_at || Date.now(),
      });
    },
    [proposedEvaluation?.candidate_id, proposedEvaluation?.location_source, proposedEvaluation?.updated_at, setProposedEvaluation]
  );

  const handlePlaceProposedPin = useCallback(
    async (latRaw: number, lngRaw: number) => {
      const lat = Number(latRaw.toFixed(6));
      const lng = Number(lngRaw.toFixed(6));
      const locLabel = `Gujarat Map Pin (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
      setProposedCoords({ lat, lng });
      setProposedLocationLabel(locLabel);
      setIsEvaluateMode(false);
      onSelectStation(null);

      const resp = await fetchNearbyForPin(lat, lng, radiusKm, proposedName, locLabel);
      syncContext(
        lat,
        lng,
        radiusKm,
        proposedName,
        locLabel,
        expectedCapacity,
        resp?.nearby_stations || [],
        true
      );
    },
    [expectedCapacity, fetchNearbyForPin, onSelectStation, proposedName, radiusKm, syncContext]
  );

  const handleRadiusChange = async (newRadius: number) => {
    setRadiusKm(newRadius);
    if (!proposedCoords) return;
    const resp = await fetchNearbyForPin(
      proposedCoords.lat,
      proposedCoords.lng,
      newRadius,
      proposedName,
      proposedLocationLabel
    );
    syncContext(
      proposedCoords.lat,
      proposedCoords.lng,
      newRadius,
      proposedName,
      proposedLocationLabel,
      expectedCapacity,
      resp?.nearby_stations || [],
      true
    );
  };

  const handleDirectSimulate = () => {
    if (!proposedCoords) return;
    const locLabel =
      proposedLocationLabel ||
      `Gujarat Map Pin (${proposedCoords.lat.toFixed(4)}°N, ${proposedCoords.lng.toFixed(4)}°E)`;
    const parsedCap = expectedCapacity.trim() ? parseFloat(expectedCapacity) : null;
    const nearbyList = nearbyData?.nearby_stations || [];

    const payload = {
      proposed_name: proposedName.trim() || 'Proposed New CNG Station',
      latitude: proposedCoords.lat,
      longitude: proposedCoords.lng,
      selected_location: locLabel,
      expected_daily_capacity_kg:
        parsedCap !== null && !isNaN(parsedCap) && parsedCap >= 0 ? parsedCap : null,
      radius_km: radiusKm,
      nearby_station_ids: nearbyList.map((s) => s.station_id),
      nearby_stations: nearbyList,
      location_source: proposedEvaluation?.location_source || ('map_pin' as const),
      candidate_id: proposedEvaluation?.candidate_id || null,
      source_section: 'network_map' as const,
      updated_at: Date.now(),
    };

    setProposedEvaluation(payload);
    navigate(
      `/simulator?lat=${proposedCoords.lat.toFixed(6)}&lng=${proposedCoords.lng.toFixed(6)}&radius=${radiusKm}`,
      { state: { proposedEvaluation: payload } }
    );
  };

  const handleClearProposedPin = () => {
    setIsEvaluateMode(false);
    setProposedCoords(null);
    setProposedName('Proposed New CNG Station');
    setProposedLocationLabel('');
    setExpectedCapacity('');
    setNearbyData(null);
    setNearbyError(null);
    setRadiusKm(5);
    clearProposedEvaluation();
  };

  // Extract unique operators dynamically
  const operatorsList = useMemo(() => {
    const set = new Set<string>();
    verifiedStations.forEach((s) => {
      const op = s.brand || s.operator;
      if (op) set.add(op);
    });
    return Array.from(set).sort();
  }, [verifiedStations]);

  const citiesList = useMemo(() => {
    if (availableCities && availableCities.length > 0) return availableCities;
    const set = new Set<string>();
    verifiedStations.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set).sort();
  }, [verifiedStations, availableCities]);

  const districtsList = useMemo(() => {
    if (availableDistricts && availableDistricts.length > 0) return availableDistricts;
    const set = new Set<string>();
    verifiedStations.forEach((s) => {
      if (s.district) set.add(s.district);
    });
    return Array.from(set).sort();
  }, [verifiedStations, availableDistricts]);

  const operatorBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    verifiedStations.forEach((s) => {
      const op = s.brand || s.operator || 'Other';
      map[op] = (map[op] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [verifiedStations]);

  const districtBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    verifiedStations.forEach((s) => {
      const dist = s.district || 'Other';
      map[dist] = (map[dist] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [verifiedStations]);

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
      {/* Search, Filters & Evaluate New Station Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
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

          <div className="flex flex-wrap items-center gap-2">
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

            <button
              type="button"
              onClick={() => {
                setIsEvaluateMode((prev) => !prev);
                onSelectStation(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isEvaluateMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-[#0A9396] hover:bg-[#005F73] text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isEvaluateMode ? 'Click Map to Place Pin' : 'Evaluate New Station'}</span>
            </button>
          </div>
        </div>

        {/* Status Strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Showing {filteredStations.length} of {verifiedStations.length} Verified Stations
            </span>
            {proposedCoords && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Proposed Pin Active ({radiusKm} km radius)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            {isEvaluateMode
              ? 'Click anywhere on the Gujarat map to place a proposed station pin.'
              : 'Click "Evaluate New Station" to place a proposed station pin and Direct Simulate.'}
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Proposed Station Panel / Station Details / Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative bg-[#0B1320] rounded-2xl overflow-hidden shadow-xs border border-slate-200 min-h-[600px] h-[600px]">
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
            <div className="flex items-center bg-[#0B1320]/90 backdrop-blur-md rounded-xl p-1 border border-slate-700/80 shadow-md text-xs">
              <button
                type="button"
                onClick={() => setBasemap('roadmap')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  basemap === 'roadmap' ? 'bg-[#0A9396] text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Roadmap
              </button>
              <button
                type="button"
                onClick={() => setBasemap('satellite')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  basemap === 'satellite' ? 'bg-[#0A9396] text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => setBasemap('osm')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  basemap === 'osm' ? 'bg-[#0A9396] text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                OSM
              </button>
            </div>
          </div>

          {isEvaluateMode && (
            <div className="absolute top-14 left-3 right-3 z-[1000] bg-amber-500/95 text-slate-950 px-4 py-2 rounded-xl border border-amber-300 shadow-lg flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                EVALUATE NEW STATION: Click anywhere on the map to place a proposed station pin.
              </span>
              <button
                type="button"
                onClick={() => setIsEvaluateMode(false)}
                className="px-2 py-0.5 rounded bg-slate-950/15 hover:bg-slate-950/25 text-[11px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Legend */}
          <div
            className="absolute bottom-3 left-3 z-[1000] bg-[#0B1320]/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-xl text-[11px] text-slate-100 max-w-xs space-y-1.5"
            style={{ backgroundColor: 'rgba(11, 19, 32, 0.94)' }}
          >
            <div className="font-semibold text-white flex items-center justify-between gap-4 pb-1 border-b border-slate-800">
              <span>Gujarat Network Legend</span>
              <span className="text-[10px] text-[#5EEAD4] font-mono font-bold">
                {filteredStations.length} Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shrink-0" />
              <span>Existing Verified Station</span>
            </div>
            {proposedCoords && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0" />
                  <span>Proposed Station (Temporary)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-[#5EEAD4] shrink-0" />
                  <span>Nearby Station ({nearbyData?.nearby_count ?? 0} within {radiusKm} km)</span>
                </div>
              </>
            )}
          </div>

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

            <StationMapController
              selectedStation={selectedStation}
              proposedCoords={proposedCoords}
              radiusKm={radiusKm}
            />

            <EvaluatePinClickHandler
              enabled={isEvaluateMode}
              onPlacePin={handlePlaceProposedPin}
            />

            {filteredStations.map((st) => {
              if (!st.latitude || !st.longitude) return null;
              const isSelected = selectedStation?.station_id === st.station_id;
              const nearbyMatch = nearbyDistanceMap.get(st.station_id);
              const isNearby = Boolean(nearbyMatch);

              return (
                <Marker
                  key={st.station_id}
                  position={[st.latitude, st.longitude]}
                  icon={createVerifiedStationMarker(isSelected, isNearby)}
                  eventHandlers={{
                    click: () => onSelectStation(st),
                  }}
                >
                  <Popup className="custom-station-popup">
                    <div className="p-1 space-y-1.5 text-slate-900 max-w-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs truncate">{st.station_name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                          Verified CNG
                        </span>
                      </div>
                      {nearbyMatch && (
                        <div className="px-2 py-1 rounded bg-teal-50 border border-teal-200 text-[11px] font-bold text-teal-900 flex items-center justify-between">
                          <span>Distance from Proposed:</span>
                          <span className="font-mono">{nearbyMatch.distance_km.toFixed(2)} km</span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-600 leading-snug">{st.address}</p>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                        <span>{st.city}, {st.district}</span>
                        <span className="font-semibold text-slate-700">{st.brand || st.operator}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectStation(st)}
                        className="w-full mt-1.5 py-1 px-2 bg-[#0A9396] hover:bg-[#005F73] text-white rounded text-[10px] font-semibold text-center cursor-pointer transition-colors"
                      >
                        Inspect Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {proposedCoords && (
              <Circle
                center={[proposedCoords.lat, proposedCoords.lng]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: '#0A9396',
                  fillColor: '#5EEAD4',
                  fillOpacity: 0.16,
                  weight: 2.5,
                  dashArray: '6, 6',
                }}
              />
            )}

            {proposedCoords && (
              <Marker
                ref={proposedMarkerRef}
                position={[proposedCoords.lat, proposedCoords.lng]}
                icon={createProposedStationMarker()}
                draggable={true}
                eventHandlers={{
                  dragend: () => {
                    const marker = proposedMarkerRef.current;
                    if (marker) {
                      const pos = marker.getLatLng();
                      handlePlaceProposedPin(pos.lat, pos.lng);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-slate-900 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{proposedName || 'Proposed New CNG Station'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                        Proposed
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-500">
                      {proposedCoords.lat.toFixed(5)}°N, {proposedCoords.lng.toFixed(5)}°E
                    </p>
                    <p className="text-[10px] text-teal-700 italic">
                      Drag marker to reposition
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {proposedCoords ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5 text-xs">
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Proposed Station (Temporary)
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1.5">
                    New Station Network Evaluation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClearProposedPin}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Remove temporary proposed station from map"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label htmlFor="map-proposed-name" className="block font-semibold text-slate-700 mb-1">
                    Proposed Station Name
                  </label>
                  <input
                    id="map-proposed-name"
                    type="text"
                    value={proposedName}
                    onChange={(e) => setProposedName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396]"
                  />
                </div>

                <div>
                  <label htmlFor="map-proposed-capacity" className="block font-semibold text-slate-700 mb-1">
                    Expected Daily Capacity (kg/day) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="map-proposed-capacity"
                    type="number"
                    min="0"
                    step="100"
                    value={expectedCapacity}
                    onChange={(e) => setExpectedCapacity(e.target.value)}
                    placeholder="e.g. 4000"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Coordinates</div>
                  <div className="font-mono text-[11px] font-semibold text-slate-800 mt-0.5">
                    {proposedCoords.lat.toFixed(4)}°N, {proposedCoords.lng.toFixed(4)}°E
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Nearby Verified</div>
                  <div className="font-mono text-sm font-bold text-[#0A9396] mt-0.5">
                    {isLoadingNearby ? '...' : `${nearbyData?.nearby_count ?? 0} within ${radiusKm} km`}
                  </div>
                </div>
              </div>

              {nearbyData?.nearest_overall_station && (
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-blue-800">Nearest Verified Station</div>
                    <div className="font-semibold text-slate-900 truncate">
                      {nearbyData.nearest_overall_station.station_name}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-800 shrink-0">
                    {nearbyData.nearest_overall_station.distance_km.toFixed(2)} km
                  </span>
                </div>
              )}

              {nearbyError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{nearbyError}</span>
                </div>
              )}

              <NearbyVerifiedStationsList
                nearbyStations={nearbyData?.nearby_stations || []}
                radiusKm={radiusKm}
                onRadiusChange={handleRadiusChange}
                isLoading={isLoadingNearby}
                compact={true}
                onSelectStation={(st) => {
                  const match = verifiedStations.find((v) => v.station_id === st.station_id);
                  if (match) onSelectStation(match);
                }}
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEvaluateMode(true)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Move Pin
                </button>

                <button
                  type="button"
                  onClick={handleDirectSimulate}
                  disabled={isLoadingNearby}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B1320] hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-[#5EEAD4] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Direct Simulate</span>
                </button>
              </div>
            </div>
          ) : selectedStation ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedStation.station_id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                      <ShieldCheck className="w-3 h-3 text-blue-700" />
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

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Operator / CGD Entity</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center justify-between">
                    <span>{selectedStation.operator || selectedStation.brand}</span>
                    <span className="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[10px] border border-slate-200">
                      Brand: {selectedStation.brand}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Physical Address</div>
                  <div className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                    {selectedStation.address || 'Address registered with CGD network'}
                  </div>
                </div>

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

                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-teal-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0A9396]" />
                    <span>Evidence & Provenance</span>
                  </div>
                  <p className="text-[11px] text-teal-900 leading-snug">
                    {selectedStation.notes || 'Public vehicle retail CNG dispensing confirmed. Verified against official operator directory.'}
                  </p>
                  <div className="text-[10px] text-teal-800 font-mono pt-1">
                    Source: {selectedStation.data_source}
                  </div>
                </div>
              </div>
            </div>
          ) : (
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

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-800">Verified Unique Stations</div>
                  <div className="text-2xl font-bold text-blue-950 font-mono mt-0.5">
                    {verifiedStations.length}
                  </div>
                  <div className="text-[10px] text-blue-700 mt-0.5">100% Operational Grid</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Districts Covered</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
                    {districtsList.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Statewide Reach</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Operator / CGD Distribution</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click to filter map</span>
                </div>
                <div className="space-y-1.5">
                  {operatorBreakdown.map(([op, count]) => {
                    const isSelected = selectedOperator.toLowerCase() === op.toLowerCase();
                    const pct = verifiedStations.length ? Math.round((count / verifiedStations.length) * 100) : 0;

                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setSelectedOperator(isSelected ? '' : op)}
                        className={`w-full p-2 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
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
                        onClick={() => setSelectedDistrict(isSelected ? '' : dist)}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0B1320] text-[#5EEAD4] border-[#0B1320] font-semibold shadow-xs'
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
              <Fuel className="w-4 h-4 text-blue-600" />
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
                      isSelected ? 'bg-blue-50/70 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-800 text-[11px]">
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
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
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
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1"
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
