import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  MapPin,
  Search,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Loader2,
  Sliders,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { LocationAutocomplete } from '../map/LocationAutocomplete';
import { createCandidate } from '../../api/candidates';
import { CandidateCreateRequest, CandidateLocationModel } from '../../types/candidates';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number } | null;
  onCandidateCreated: (candidate: CandidateLocationModel) => void;
}

export const GUJARAT_BOUNDS = {
  minLat: 20.0,
  maxLat: 25.0,
  minLng: 68.0,
  maxLng: 75.0,
};

const CATEGORIES = [
  { value: 'industrial_hub', label: 'Industrial Hub / GIDC Estate' },
  { value: 'highway_corridor', label: 'Highway Commercial Corridor' },
  { value: 'logistics_transit', label: 'Logistics Park & Freight Hub' },
  { value: 'underserved_rural_fringe', label: 'Underserved Highway Fringe' },
  { value: 'urban_commercial', label: 'Urban / Peri-Urban Commercial' },
];

const HIGHWAY_TIERS = [
  'National Highway',
  'State Highway',
  'Express Highway',
  'Major District Road',
  'Arterial Ring Road',
];

export const AddCandidateModal: React.FC<AddCandidateModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  onCandidateCreated,
}) => {
  // Input Method: Autocomplete vs Manual/Map Click
  const [creationMethod, setCreationMethod] = useState<'autocomplete' | 'coordinates'>(
    initialCoords ? 'coordinates' : 'autocomplete'
  );

  // Form State
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('industrial_hub');
  const [latInput, setLatInput] = useState(initialCoords ? initialCoords.lat.toFixed(5) : '');
  const [lngInput, setLngInput] = useState(initialCoords ? initialCoords.lng.toFixed(5) : '');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [roadCorridor, setRoadCorridor] = useState('');
  const [nearestHighway, setNearestHighway] = useState('');
  const [highwayTier, setHighwayTier] = useState('State Highway');
  const [trafficPcu, setTrafficPcu] = useState('');
  const [vehicleDensity, setVehicleDensity] = useState('');
  const [pipelineMeters, setPipelineMeters] = useState('850');
  const [landZoning, setLandZoning] = useState('Commercial / GIDC');
  const [placeId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update when initialCoords changes
  useEffect(() => {
    if (initialCoords) {
      setLatInput(initialCoords.lat.toFixed(5));
      setLngInput(initialCoords.lng.toFixed(5));
      setCreationMethod('coordinates');
    }
  }, [initialCoords]);

  if (!isOpen) return null;

  const parsedLat = parseFloat(latInput);
  const parsedLng = parseFloat(lngInput);

  const isValidCoords =
    !isNaN(parsedLat) &&
    !isNaN(parsedLng) &&
    parsedLat >= GUJARAT_BOUNDS.minLat &&
    parsedLat <= GUJARAT_BOUNDS.maxLat &&
    parsedLng >= GUJARAT_BOUNDS.minLng &&
    parsedLng <= GUJARAT_BOUNDS.maxLng;

  // Completeness preview
  const hasDemandMetric = trafficPcu.trim() !== '' || vehicleDensity.trim() !== '';

  const handleAutocompleteSelect = (coords: { lat: number; lng: number; label?: string }) => {
    setLatInput(coords.lat.toFixed(5));
    setLngInput(coords.lng.toFixed(5));
    if (coords.label) {
      setName((prev) => (prev ? prev : coords.label || ''));
      setAddress((prev) => (prev ? prev : coords.label || ''));
      
      // Auto-extract city if comma separated
      const parts = coords.label.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        setCity((prev) => (prev ? prev : parts[parts.length - 2] || ''));
        setDistrict((prev) => (prev ? prev : parts[parts.length - 2] || ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter a candidate location name.');
      return;
    }
    if (!city.trim() || !district.trim()) {
      setErrorMessage('City and District are required for Gujarat spatial evaluation.');
      return;
    }
    if (!isValidCoords) {
      setErrorMessage('Valid Gujarat coordinates required (Lat: 20.0 - 25.0, Lng: 68.0 - 75.0).');
      return;
    }

    const payload: CandidateCreateRequest = {
      name: name.trim(),
      city: city.trim(),
      district: district.trim(),
      category,
      latitude: parsedLat,
      longitude: parsedLng,
      address: address.trim(),
      locality: locality.trim() || undefined,
      road_corridor: roadCorridor.trim() || undefined,
      nearest_major_highway: nearestHighway.trim() || undefined,
      highway_tier: highwayTier,
      traffic_pcu_per_day: trafficPcu ? parseFloat(trafficPcu) : null,
      commercial_vehicle_density_proxy: vehicleDensity ? parseFloat(vehicleDensity) : null,
      pipeline_proximity_meters: pipelineMeters ? parseFloat(pipelineMeters) : null,
      land_zoning: landZoning,
      place_id: placeId || undefined,
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const created = await createCandidate(payload);
      onCandidateCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create candidate location. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Propose New Candidate Station
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Method 1: Search via Google Autocomplete • Method 2: Click Map Pin / Coordinates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Creation Method Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/30 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setCreationMethod('autocomplete')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              creationMethod === 'autocomplete'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 border-teal-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Method 1: Google Autocomplete
          </button>
          <button
            type="button"
            onClick={() => setCreationMethod('coordinates')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              creationMethod === 'coordinates'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 border-teal-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Method 2: Map Pin / Coordinates
            {initialCoords && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 text-xs flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Method 1: Autocomplete input */}
          {creationMethod === 'autocomplete' && (
            <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-2">
              <label className="block text-xs font-semibold text-teal-700 dark:text-teal-300">
                Search Proposed Location in Gujarat:
              </label>
              <LocationAutocomplete
                onSelectLocation={handleAutocompleteSelect}
                centerLat={parsedLat || 22.2587}
                centerLng={parsedLng || 71.1924}
                placeholder="Search place, junction, GIDC estate, or highway in Gujarat..."
              />
              <p className="text-[11px] text-teal-600/80 dark:text-teal-400/80">
                Select any location, junction, industrial park, or highway stretch to auto-fill coordinates.
              </p>
            </div>
          )}

          {/* Method 2: Active Coordinate notice */}
          {creationMethod === 'coordinates' && initialCoords && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Coordinates captured directly from Network Map click.</span>
              </div>
              <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-md">
                {parsedLat.toFixed(4)}, {parsedLng.toFixed(4)}
              </span>
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Candidate Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sanand GIDC Phase 2 Commercial Gate"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                City / Town <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Sanand, Surat, Mehsana"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                District <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Ahmedabad, Surat, Kutch"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Highway Tier
              </label>
              <select
                value={highwayTier}
                onChange={(e) => setHighwayTier(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {HIGHWAY_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Coordinates */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-teal-500" />
                Gujarat Geocoordinates <span className="text-red-500">*</span>
              </span>
              {isValidCoords ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Within Gujarat Polygon
                </span>
              ) : (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Range: 20.0-25.0°N, 68.0-75.0°E
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Latitude (°N):
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="23.0225"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Longitude (°E):
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="72.5714"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Demand & Traffic Proxies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-500" />
                Demand Proxies & Traffic Inputs
              </span>
              {!hasDemandMetric && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> If both empty: Not Rankable
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  AADT Commercial Traffic (PCU/Day):
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={trafficPcu}
                  onChange={(e) => setTrafficPcu(e.target.value)}
                  placeholder="e.g. 18500"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  Commercial Vehicle Density Proxy (0-100):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={vehicleDensity}
                  onChange={(e) => setVehicleDensity(e.target.value)}
                  placeholder="e.g. 78"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Road & Infrastructure Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Road / Corridor:
              </label>
              <input
                type="text"
                value={roadCorridor}
                onChange={(e) => setRoadCorridor(e.target.value)}
                placeholder="e.g. SH-17 Viramgam Highway"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Nearest Major Highway:
              </label>
              <input
                type="text"
                value={nearestHighway}
                onChange={(e) => setNearestHighway(e.target.value)}
                placeholder="e.g. SH-17, NH-48"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Pipeline Proximity (Meters):
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={pipelineMeters}
                onChange={(e) => setPipelineMeters(e.target.value)}
                placeholder="e.g. 850"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Land Zoning:
              </label>
              <input
                type="text"
                value={landZoning}
                onChange={(e) => setLandZoning(e.target.value)}
                placeholder="e.g. Commercial / GIDC"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Address & Locality & Notes */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  Full Physical Address:
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot / Survey No., GIDC Estate Road, District, Gujarat"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  Locality:
                </label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Sanand GIDC"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Planner Evaluation Notes:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Expansion rationale, nearby industrial anchor tenants, fleet operator demand..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-500" />
            <span>Suitability score will be dynamically calculated against verified operating stations.</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || !city.trim() || !isValidCoords}
              className="bg-teal-600 hover:bg-teal-700 text-white min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Calculating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add & Evaluate
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};