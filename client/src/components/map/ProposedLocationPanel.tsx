import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ArrowRight, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { LocationAutocomplete } from './LocationAutocomplete';

interface ProposedLocationPanelProps {
  proposedCoords: { lat: number; lng: number } | null;
  onSetCoords: (coords: { lat: number; lng: number } | null) => void;
}

// Bounding box for Ahmedabad metropolitan study area
export const AHMEDABAD_BOUNDS = {
  minLat: 22.85,
  maxLat: 23.25,
  minLng: 72.40,
  maxLng: 72.75,
};

export const ProposedLocationPanel: React.FC<ProposedLocationPanelProps> = ({
  proposedCoords,
  onSetCoords,
}) => {
  const navigate = useNavigate();

  const [latInput, setLatInput] = useState<string>(
    proposedCoords ? proposedCoords.lat.toFixed(4) : '23.0500'
  );
  const [lngInput, setLngInput] = useState<string>(
    proposedCoords ? proposedCoords.lng.toFixed(4) : '72.6000'
  );

  useEffect(() => {
    if (proposedCoords) {
      setLatInput(proposedCoords.lat.toFixed(4));
      setLngInput(proposedCoords.lng.toFixed(4));
    }
  }, [proposedCoords]);

  const parsedLat = parseFloat(latInput);
  const parsedLng = parseFloat(lngInput);

  const isValidNumber = !isNaN(parsedLat) && !isNaN(parsedLng);
  const isWithinStudyArea =
    isValidNumber &&
    parsedLat >= AHMEDABAD_BOUNDS.minLat &&
    parsedLat <= AHMEDABAD_BOUNDS.maxLat &&
    parsedLng >= AHMEDABAD_BOUNDS.minLng &&
    parsedLng <= AHMEDABAD_BOUNDS.maxLng;

  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidNumber) {
      onSetCoords({ lat: parsedLat, lng: parsedLng });
    }
  };

  const handleAutocompleteSelect = (coords: { lat: number; lng: number; label?: string }) => {
    setLatInput(coords.lat.toFixed(4));
    setLngInput(coords.lng.toFixed(4));
    onSetCoords({ lat: coords.lat, lng: coords.lng });
  };

  const handleSendToSimulator = () => {
    if (proposedCoords) {
      navigate(`/simulator?lat=${proposedCoords.lat.toFixed(4)}&lng=${proposedCoords.lng.toFixed(4)}`);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <MapPin className="w-4 h-4 text-[#005F73]" />
        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
          Proposed Candidate Location
        </h4>
      </div>

      {/* Autocomplete Input Search */}
      <div className="space-y-1.5">
        
        <LocationAutocomplete
          onSelectLocation={handleAutocompleteSelect}
          centerLat={proposedCoords?.lat ?? 23.0225}
          centerLng={proposedCoords?.lng ?? 72.5714}
        />
      </div>

      {/* Form Inputs */}
      <form onSubmit={handleApplyCoordinates} className="space-y-3 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="latitude-input" className="font-semibold text-slate-500 block text-[11px]">
              Latitude (°N):
            </label>
            <input
              id="latitude-input"
              type="number"
              step="0.0001"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              aria-label="Proposed station latitude"
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0A9396] focus:border-[#0A9396]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="longitude-input" className="font-semibold text-slate-500 block text-[11px]">
              Longitude (°E):
            </label>
            <input
              id="longitude-input"
              type="number"
              step="0.0001"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              aria-label="Proposed station longitude"
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0A9396] focus:border-[#0A9396]"
            />
          </div>
        </div>

        {/* Validation Status */}
        {isValidNumber && (
          <div
            className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 ${
              isWithinStudyArea
                ? 'bg-[#EAF6F2] text-[#005F73] border border-[#94D2BD]/60'
                : 'bg-[#FEF6E9] text-[#CA6702] border border-[#E9D8A6]'
            }`}
          >
            {isWithinStudyArea ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0A9396] shrink-0 mt-0.5" />
                <span>
                  Coordinates fall within the provisional coordinate envelope (approximate view range: 22.85°N–23.25°N, 72.40°E–72.75°E).
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-[#CA6702] shrink-0 mt-0.5" />
                <span>
                  <strong>Out-of-Study-Area Notice:</strong> Selected coordinates fall outside the Ahmedabad metropolitan screening boundary.
                </span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            leftIcon={<Navigation className="w-3.5 h-3.5" />}
          >
            Update Map Point
          </Button>

          {proposedCoords && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSetCoords(null)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-slate-500 hover:text-[#AE2012]"
            >
              Clear Marker
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!proposedCoords || !isValidNumber}
            onClick={handleSendToSimulator}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="ml-auto"
          >
            Send to Simulator
          </Button>
        </div>
      </form>
    </div>
  );
};
