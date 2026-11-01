import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ArrowRight, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { useNavigate } from 'react-router-dom';

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

  const handlePresetSelect = (lat: number, lng: number) => {
    setLatInput(lat.toFixed(4));
    setLngInput(lng.toFixed(4));
    onSetCoords({ lat, lng });
  };

  const handleSendToSimulator = () => {
    if (proposedCoords) {
      navigate(`/simulator?lat=${proposedCoords.lat.toFixed(4)}&lng=${proposedCoords.lng.toFixed(4)}`);
    }
  };

  return (
    <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-[#0F766E]" />
          <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-xs">
            Proposed Candidate Location
          </h4>
          <DataOriginBadge origin="user_entered_scenario" size="sm" />
        </div>
        <span className="text-[11px] text-slate-500">
          Click map or type coordinates
        </span>
      </div>

      {/* Preset Quick Selectors */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-600 block">
          Ahmedabad Study Area Presets:
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handlePresetSelect(23.1042, 72.5925)}
            className="py-1 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
          >
            Visat Corridor (23.1042, 72.5925)
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect(23.0350, 72.5280)}
            className="py-1 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
          >
            Vastrapur (23.0350, 72.5280)
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect(23.0670, 72.6500)}
            className="py-1 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
          >
            Naroda Industrial (23.0670, 72.6500)
          </button>
        </div>
      </div>

      {/* Form Inputs */}
      <form onSubmit={handleApplyCoordinates} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="latitude-input" className="font-semibold text-slate-700 block text-[11px]">
              Latitude (°N):
            </label>
            <input
              id="latitude-input"
              type="number"
              step="0.0001"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              aria-label="Proposed station latitude"
              className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="longitude-input" className="font-semibold text-slate-700 block text-[11px]">
              Longitude (°E):
            </label>
            <input
              id="longitude-input"
              type="number"
              step="0.0001"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              aria-label="Proposed station longitude"
              className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>
        </div>

        {/* Validation Status */}
        {isValidNumber && (
          <div
            className={`p-2.5 rounded text-[11px] flex items-start gap-2 ${
              isWithinStudyArea
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            {isWithinStudyArea ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Coordinates fall within the provisional coordinate envelope (approximate view range: 22.85°N–23.25°N, 72.40°E–72.75°E). Municipal boundary verification is unavailable (official AMC GIS polygon is not validated in dataset).
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
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
              className="text-slate-500 hover:text-red-600"
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
