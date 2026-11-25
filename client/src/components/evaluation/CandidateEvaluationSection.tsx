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
import 'leaflet/dist/leaflet.css';
import {
  Search,
  MapPin,
  Plus,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Loader2,
  Fuel,
} from 'lucide-react';
import {
  GujaratStationModel,
  NearbyStationsResponse,
  NearbyVerifiedStation,
  CandidateLocationModel,
} from '../../types/candidates';
import {
  createCandidate,
  fetchNearbyVerifiedStations,
} from '../../api/candidates';
import {
  useProposedEvaluation,
  LocationSelectionSource,
} from '../../context/ProposedEvaluationContext';
import { LocationAutocomplete } from '../map/LocationAutocomplete';
import { NearbyVerifiedStationsList } from './NearbyVerifiedStationsList';
import {
  createVerifiedStationMarker,
  createProposedStationMarker,
  GUJARAT_BOUNDS,
} from './mapMarkers';

export interface CandidateEvaluationSectionProps {
  stations: GujaratStationModel[];
}

const GUJARAT_CENTER: [number, number] = [22.65, 71.85];
const GUJARAT_DEFAULT_ZOOM = 7;

interface MapViewportControllerProps {
  focusPoint: { lat: number; lng: number; zoom?: number } | null;
  radiusKm: number;
  hasProposedPin: boolean;
}

const MapViewportController: React.FC<MapViewportControllerProps> = ({
  focusPoint,
  radiusKm,
  hasProposedPin,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!focusPoint) return;
    if (hasProposedPin) {
      const targetZoom =
        radiusKm <= 1 ? 14 : radiusKm <= 2 ? 13 : radiusKm <= 5 ? 12 : radiusKm <= 10 ? 11 : 10;
      map.flyTo([focusPoint.lat, focusPoint.lng], focusPoint.zoom ?? targetZoom, {
        duration: 0.9,
      });
    } else {
      map.flyTo([focusPoint.lat, focusPoint.lng], focusPoint.zoom ?? 12, {
        duration: 0.9,
      });
    }
  }, [focusPoint, radiusKm, hasProposedPin, map]);

  return null;
};

interface MapPinDropListenerProps {
  enabled: boolean;
  onPinDrop: (lat: number, lng: number) => void;
}

const MapPinDropListener: React.FC<MapPinDropListenerProps> = ({ enabled, onPinDrop }) => {
  useMapEvents({
    click(e) {
      if (enabled) {
        onPinDrop(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const CandidateEvaluationSection: React.FC<CandidateEvaluationSectionProps> = ({
  stations,
}) => {
  const navigate = useNavigate();
  const { proposedEvaluation, setProposedEvaluation, clearProposedEvaluation } =
    useProposedEvaluation();

  const restoredFromContext =
    proposedEvaluation?.source_section === 'candidate_evaluation' ? proposedEvaluation : null;

  const verifiedStations = useMemo(() => {
    return stations.filter(
      (s) =>
        s.cng_classification === 'VERIFIED_OPERATING_CNG' &&
        s.latitude != null &&
        s.longitude != null &&
        !(Math.abs(s.latitude) < 1e-6 && Math.abs(s.longitude) < 1e-6)
    );
  }, [stations]);

  const [selectionMethod, setSelectionMethod] = useState<'autocomplete' | 'pin'>(() =>
    restoredFromContext?.location_source === 'map_pin' ? 'pin' : 'autocomplete'
  );
  const [locationSource, setLocationSource] = useState<LocationSelectionSource>(
    () => restoredFromContext?.location_source || 'google_autocomplete'
  );
  const [isPinDropActive, setIsPinDropActive] = useState<boolean>(false);
  const [basemap, setBasemap] = useState<'roadmap' | 'satellite' | 'osm'>('roadmap');

  const [proposedCoords, setProposedCoords] = useState<{ lat: number; lng: number } | null>(() =>
    restoredFromContext
      ? { lat: restoredFromContext.latitude, lng: restoredFromContext.longitude }
      : null
  );
  const [stationName, setStationName] = useState<string>(
    () => restoredFromContext?.proposed_name || ''
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(
    () => restoredFromContext?.selected_location || ''
  );
  const [expectedCapacity, setExpectedCapacity] = useState<string>(() =>
    restoredFromContext?.expected_daily_capacity_kg != null
      ? String(restoredFromContext.expected_daily_capacity_kg)
      : ''
  );
  const [createdCandidate, setCreatedCandidate] = useState<CandidateLocationModel | null>(null);
  const [savedCandidateId, setSavedCandidateId] = useState<string | null>(
    () => restoredFromContext?.candidate_id || null
  );
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [radiusKm, setRadiusKm] = useState<number>(() => restoredFromContext?.radius_km || 5);
  const [nearbyData, setNearbyData] = useState<NearbyStationsResponse | null>(null);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(() =>
    restoredFromContext
      ? { lat: restoredFromContext.latitude, lng: restoredFromContext.longitude }
      : null
  );
  const [highlightedStationId, setHighlightedStationId] = useState<string | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const nearbyDistanceMap = useMemo(() => {
    const map = new Map<string, NearbyVerifiedStation>();
    nearbyData?.nearby_stations.forEach((st) => {
      map.set(st.station_id, st);
    });
    return map;
  }, [nearbyData]);

  const loadNearbyStations = useCallback(
    async (lat: number, lng: number, radius: number, name?: string, loc?: string) => {
      setIsLoadingNearby(true);
      setNearbyError(null);
      try {
        const resp = await fetchNearbyVerifiedStations({
          lat,
          lng,
          radius_km: radius,
          name: name || undefined,
          location_label: loc || undefined,
        });
        setNearbyData(resp);
        return resp;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to calculate nearby verified stations.';
        setNearbyError(msg);
        return null;
      } finally {
        setIsLoadingNearby(false);
      }
    },
    []
  );

  // Hydrate nearby stations when returning from Simulator
  useEffect(() => {
    if (restoredFromContext && !nearbyData && !isLoadingNearby) {
      loadNearbyStations(
        restoredFromContext.latitude,
        restoredFromContext.longitude,
        restoredFromContext.radius_km,
        restoredFromContext.proposed_name,
        restoredFromContext.selected_location
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutocompleteSelect = (coords: { lat: number; lng: number; label?: string }) => {
    const lat = Number(coords.lat.toFixed(6));
    const lng = Number(coords.lng.toFixed(6));
    const label = coords.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    setLocationSource('google_autocomplete');
    setProposedCoords({ lat, lng });
    setSelectedLocation(label);
    if (!stationName.trim() && coords.label) {
      setStationName(`${coords.label} Proposed CNG Station`);
    }
    setCreatedCandidate(null);
    setSavedCandidateId(null);
    setNearbyData(null);
    setFormError(null);
    setIsPinDropActive(false);
    setMapFocus({ lat, lng });
  };

  const handlePinPlaced = async (latRaw: number, lngRaw: number) => {
    const lat = Number(latRaw.toFixed(6));
    const lng = Number(lngRaw.toFixed(6));
    const coordLabel = `Pinned Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;

    setLocationSource('map_pin');
    setProposedCoords({ lat, lng });
    setSelectedLocation(coordLabel);
    if (!stationName.trim()) {
      setStationName('Proposed CNG Station');
    }
    setFormError(null);
    setIsPinDropActive(false);
    setMapFocus({ lat, lng });

    if (createdCandidate || savedCandidateId) {
      await loadNearbyStations(lat, lng, radiusKm, stationName, coordLabel);
    }
  };

  const handleCreateProposedStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!proposedCoords) {
      setFormError('Please select a location using Google Places Search or Drop Pin on Map.');
      return;
    }
    if (!stationName.trim() || stationName.trim().length < 2) {
      setFormError('Please enter a Proposed Station Name (at least 2 characters).');
      return;
    }
    if (!selectedLocation.trim()) {
      setFormError('Selected location description is required.');
      return;
    }

    const { lat, lng } = proposedCoords;
    if (
      lat < GUJARAT_BOUNDS.minLat ||
      lat > GUJARAT_BOUNDS.maxLat ||
      lng < GUJARAT_BOUNDS.minLng ||
      lng > GUJARAT_BOUNDS.maxLng
    ) {
      setFormError('Coordinates must fall within Gujarat (Latitude 20.0–25.0°N, Longitude 68.0–75.0°E).');
      return;
    }

    const parsedCap = expectedCapacity.trim() ? parseFloat(expectedCapacity) : null;
    if (expectedCapacity.trim() && (parsedCap === null || isNaN(parsedCap) || parsedCap < 0)) {
      setFormError('Expected Daily Capacity must be a non-negative number.');
      return;
    }

    setIsCreating(true);
    try {
      const created = await createCandidate({
        name: stationName.trim(),
        selected_location: selectedLocation.trim(),
        address: selectedLocation.trim(),
        latitude: lat,
        longitude: lng,
        expected_daily_capacity_kg: parsedCap,
      });
      setCreatedCandidate(created);
      setSavedCandidateId(created.candidate_id);
      setMapFocus({ lat, lng });

      const resp = await loadNearbyStations(lat, lng, radiusKm, created.name, selectedLocation.trim());
      setProposedEvaluation({
        proposed_name: created.name,
        latitude: lat,
        longitude: lng,
        selected_location: selectedLocation.trim(),
        expected_daily_capacity_kg: parsedCap,
        radius_km: radiusKm,
        nearby_station_ids: resp?.nearby_stations.map((s) => s.station_id) || [],
        nearby_stations: resp?.nearby_stations || [],
        location_source: locationSource,
        candidate_id: created.candidate_id,
        source_section: 'candidate_evaluation',
        updated_at: Date.now(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create proposed station.';
      setFormError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRadiusChange = async (newRadius: number) => {
    setRadiusKm(newRadius);
    if (!proposedCoords) return;

    await loadNearbyStations(
      proposedCoords.lat,
      proposedCoords.lng,
      newRadius,
      stationName,
      selectedLocation
    );
  };

  const handleDirectSimulate = () => {
    if (!proposedCoords) return;
    const parsedCap = expectedCapacity.trim() ? parseFloat(expectedCapacity) : null;
    const nearbyList = nearbyData?.nearby_stations || [];
    const payload = {
      proposed_name: stationName.trim() || 'Proposed CNG Station',
      latitude: proposedCoords.lat,
      longitude: proposedCoords.lng,
      selected_location:
        selectedLocation.trim() ||
        `Pinned Location (${proposedCoords.lat.toFixed(4)}°N, ${proposedCoords.lng.toFixed(4)}°E)`,
      expected_daily_capacity_kg:
        parsedCap !== null && !isNaN(parsedCap) && parsedCap >= 0 ? parsedCap : null,
      radius_km: radiusKm,
      nearby_station_ids: nearbyList.map((s) => s.station_id),
      nearby_stations: nearbyList,
      location_source: locationSource,
      candidate_id: savedCandidateId || createdCandidate?.candidate_id || null,
      source_section: 'candidate_evaluation' as const,
      updated_at: Date.now(),
    };

    setProposedEvaluation(payload);
    navigate(
      `/simulator?lat=${proposedCoords.lat.toFixed(6)}&lng=${proposedCoords.lng.toFixed(6)}&radius=${radiusKm}`,
      { state: { proposedEvaluation: payload } }
    );
  };

  const handleResetEvaluation = () => {
    setProposedCoords(null);
    setStationName('');
    setSelectedLocation('');
    setExpectedCapacity('');
    setCreatedCandidate(null);
    setSavedCandidateId(null);
    setNearbyData(null);
    setFormError(null);
    setNearbyError(null);
    setHighlightedStationId(null);
    setRadiusKm(5);
    setIsPinDropActive(false);
    clearProposedEvaluation();
  };

  const tileUrls = {
    roadmap: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    satellite: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  const isValidCoords =
    proposedCoords !== null &&
    proposedCoords.lat >= GUJARAT_BOUNDS.minLat &&
    proposedCoords.lat <= GUJARAT_BOUNDS.maxLat &&
    proposedCoords.lng >= GUJARAT_BOUNDS.minLng &&
    proposedCoords.lng <= GUJARAT_BOUNDS.maxLng;

  const hasCreatedOrRestored = Boolean(createdCandidate || savedCandidateId || nearbyData);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Interactive Evaluation Map */}
      <div className="lg:col-span-7 relative bg-[#0B1320] rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[660px]">
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-[#0B1320]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md text-xs pointer-events-auto">
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

          {selectionMethod === 'pin' && (
            <button
              type="button"
              onClick={() => setIsPinDropActive((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer pointer-events-auto border ${
                isPinDropActive
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-[#0B1320]/90 text-[#5EEAD4] border-[#0A9396]/60 hover:bg-[#0B1320]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isPinDropActive ? 'Click Map to Place Pin' : 'Reposition Pin on Map'}</span>
            </button>
          )}
        </div>

        {isPinDropActive && (
          <div className="absolute top-14 left-3 right-3 z-[1000] bg-amber-500/95 text-slate-950 px-4 py-2 rounded-xl border border-amber-300 shadow-lg flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              Click anywhere on the map to place the proposed CNG station marker.
            </span>
            <button
              type="button"
              onClick={() => setIsPinDropActive(false)}
              className="px-2 py-0.5 rounded bg-slate-950/15 hover:bg-slate-950/25 text-[11px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          className="absolute bottom-3 left-3 z-[1000] bg-[#0B1320]/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-xl text-[11px] text-slate-100 space-y-1.5"
          style={{ backgroundColor: 'rgba(11, 19, 32, 0.94)' }}
        >
          <div className="font-semibold text-white flex items-center justify-between gap-4 pb-1 border-b border-slate-800">
            <span>Map Legend</span>
            <span className="font-mono text-[10px] text-[#5EEAD4]">
              {verifiedStations.length} Verified
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shrink-0" />
            <span>Existing Verified CNG Station</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0" />
            <span>Proposed Station</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#5EEAD4] bg-[#0A9396]/25 shrink-0" />
            <span>Selected Radius ({radiusKm} km)</span>
          </div>
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

          <MapViewportController
            focusPoint={mapFocus}
            radiusKm={radiusKm}
            hasProposedPin={Boolean(proposedCoords)}
          />

          <MapPinDropListener enabled={isPinDropActive} onPinDrop={handlePinPlaced} />

          {verifiedStations.map((st) => {
            if (st.latitude == null || st.longitude == null) return null;
            const nearbyMatch = nearbyDistanceMap.get(st.station_id);
            const isNearby = Boolean(nearbyMatch);
            const isFocused = highlightedStationId === st.station_id;

            return (
              <Marker
                key={st.station_id}
                position={[st.latitude, st.longitude]}
                icon={createVerifiedStationMarker(isFocused, isNearby)}
                eventHandlers={{
                  click: () => setHighlightedStationId(st.station_id),
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 text-slate-900 max-w-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs">{st.station_name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                        Verified
                      </span>
                    </div>
                    {nearbyMatch && (
                      <div className="px-2 py-1 rounded bg-teal-50 border border-teal-200 text-[11px] font-bold text-teal-900 flex items-center justify-between">
                        <span>Distance from Proposed:</span>
                        <span className="font-mono">{nearbyMatch.distance_km.toFixed(2)} km</span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-600 leading-snug">{st.address}</p>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-200">
                      <span>{st.city}, {st.district}</span>
                      <span>{st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}</span>
                    </div>
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
              ref={markerRef}
              position={[proposedCoords.lat, proposedCoords.lng]}
              icon={createProposedStationMarker()}
              draggable={true}
              eventHandlers={{
                dragend: () => {
                  const marker = markerRef.current;
                  if (marker) {
                    const pos = marker.getLatLng();
                    handlePinPlaced(pos.lat, pos.lng);
                  }
                },
              }}
            >
              <Popup>
                <div className="p-1 space-y-1 text-slate-900 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{stationName || 'Proposed CNG Station'}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                      Proposed
                    </span>
                  </div>
                  {selectedLocation && (
                    <p className="text-[11px] text-slate-600">{selectedLocation}</p>
                  )}
                  <p className="font-mono text-[10px] text-slate-500">
                    {proposedCoords.lat.toFixed(5)}°N, {proposedCoords.lng.toFixed(5)}°E
                  </p>
                  <p className="text-[10px] text-teal-700 italic">Drag marker to reposition</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Right 5 Cols: Guided Workflow */}
      <div className="lg:col-span-5 space-y-4">
        {/* Step 1: Location Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">1. Select Proposed Location</h3>
            {(proposedCoords || hasCreatedOrRestored) && (
              <button
                type="button"
                onClick={handleResetEvaluation}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSelectionMethod('autocomplete');
                setIsPinDropActive(false);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectionMethod === 'autocomplete'
                  ? 'bg-[#0B1320] text-[#5EEAD4] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Google Places Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectionMethod('pin');
                setIsPinDropActive(true);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectionMethod === 'pin'
                  ? 'bg-[#0B1320] text-[#5EEAD4] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Drop Pin on Map</span>
            </button>
          </div>

          {selectionMethod === 'autocomplete' ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Search proposed station location
              </label>
              <LocationAutocomplete
                onSelectLocation={handleAutocompleteSelect}
                centerLat={proposedCoords?.lat ?? 23.0225}
                centerLng={proposedCoords?.lng ?? 72.5714}
                placeholder="Search proposed station location"
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 space-y-2">
              <p className="leading-snug">
                {isPinDropActive
                  ? 'Click anywhere on the map to place your proposed station pin. You can drag the green pin afterwards to fine-tune its position.'
                  : proposedCoords
                  ? 'Green proposed station pin placed. Drag the pin on the map or click below to reposition.'
                  : 'Activate pin drop and click anywhere on the Gujarat map to place a proposed station marker.'}
              </p>
              {!isPinDropActive && (
                <button
                  type="button"
                  onClick={() => setIsPinDropActive(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A9396] hover:bg-[#005F73] text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{proposedCoords ? 'Click Map to Reposition Pin' : 'Click Map to Drop Pin'}</span>
                </button>
              )}
            </div>
          )}

          {proposedCoords && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-semibold text-emerald-900 truncate">
                  {selectedLocation || 'Selected Location'}
                </div>
                <div className="font-mono text-[11px] text-emerald-700">
                  {proposedCoords.lat.toFixed(5)}°N, {proposedCoords.lng.toFixed(5)}°E
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
          )}
        </div>

        {/* Step 2: New Station Details */}
        <form
          onSubmit={handleCreateProposedStation}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">2. New Station Details</h3>
            {savedCandidateId && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                Candidate Saved ({savedCandidateId})
              </span>
            )}
          </div>

          {formError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2.5 text-xs">
            <div>
              <label htmlFor="proposed-station-name" className="block font-semibold text-slate-700 mb-1">
                Proposed Station Name <span className="text-red-500">*</span>
              </label>
              <input
                id="proposed-station-name"
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Sanand GIDC Proposed CNG Outlet"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396]"
                required
              />
            </div>

            <div>
              <label htmlFor="proposed-selected-location" className="block font-semibold text-slate-700 mb-1">
                Selected Location <span className="text-red-500">*</span>
              </label>
              <input
                id="proposed-selected-location"
                type="text"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                placeholder="Select via search or drop pin on map"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="proposed-lat" className="block font-semibold text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  id="proposed-lat"
                  type="text"
                  readOnly
                  value={proposedCoords ? proposedCoords.lat.toFixed(5) : ''}
                  placeholder="—"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-700"
                />
              </div>
              <div>
                <label htmlFor="proposed-lng" className="block font-semibold text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  id="proposed-lng"
                  type="text"
                  readOnly
                  value={proposedCoords ? proposedCoords.lng.toFixed(5) : ''}
                  placeholder="—"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="proposed-capacity" className="block font-semibold text-slate-700 mb-1">
                Expected Daily Capacity (kg/day) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="proposed-capacity"
                type="number"
                min="0"
                step="100"
                value={expectedCapacity}
                onChange={(e) => setExpectedCapacity(e.target.value)}
                placeholder="e.g. 4000"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating || !isValidCoords || !stationName.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0A9396] hover:bg-[#005F73] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Proposed Candidate...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Proposed Station</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500 leading-snug">
            Saved strictly as a proposed candidate location. Verified existing CNG stations remain separate and unchanged.
          </p>
        </form>

        {/* Step 3: Nearby Station Analysis + Direct Simulate Navigation */}
        {hasCreatedOrRestored && proposedCoords && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-[#0A9396]" />
                <span>3. Nearby Verified CNG Stations</span>
              </h3>
            </div>

            {nearbyError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{nearbyError}</span>
              </div>
            )}

            <NearbyVerifiedStationsList
              nearbyStations={nearbyData?.nearby_stations || []}
              radiusKm={radiusKm}
              onRadiusChange={handleRadiusChange}
              isLoading={isLoadingNearby}
              onSelectStation={(st) => {
                setHighlightedStationId(st.station_id);
                setMapFocus({ lat: st.latitude, lng: st.longitude, zoom: 14 });
              }}
            />

            <button
              type="button"
              onClick={handleDirectSimulate}
              disabled={isLoadingNearby}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0B1320] hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-[#5EEAD4] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Direct Simulate</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
