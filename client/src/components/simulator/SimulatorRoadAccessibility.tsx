import React, { useState } from 'react';
import { Navigation, Route, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { calculateDirections } from '../../api/maps';
import { DirectionsResponse } from '../../types/maps';
import { Button } from '../ui/Button';

interface CorridorPoint {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

const AHMEDABAD_CORRIDORS: CorridorPoint[] = [
  {
    id: 'bapunagar',
    name: 'Bapunagar Commercial Junction',
    category: 'High-Density Auto-Rickshaw Corridor',
    lat: 23.0375,
    lng: 72.6318,
  },
  {
    id: 'naroda',
    name: 'Naroda Industrial Area / NH48',
    category: 'Commercial Freight & Logistics Corridor',
    lat: 23.0682,
    lng: 72.6491,
  },
  {
    id: 'visat',
    name: 'Visat Gandhinagar Highway (AMD001 Vicinity)',
    category: 'Intercity Commuter Arterial',
    lat: 23.1092,
    lng: 72.5852,
  },
  {
    id: 'sg_highway',
    name: 'SG Highway Corporate Hub (AMD002 Vicinity)',
    category: 'Private Vehicle & Fleet Corridor',
    lat: 23.0135,
    lng: 72.505,
  },
  {
    id: 'kalupur',
    name: 'Kalupur Central Railway Station',
    category: 'Central Transit Interchange',
    lat: 23.0232,
    lng: 72.5997,
  },
];

interface SimulatorRoadAccessibilityProps {
  proposedLat: number;
  proposedLng: number;
  onApplyRecommendation?: (recommendedAccessibilityDemand: number, recommendedCapture: number) => void;
}

export const SimulatorRoadAccessibility: React.FC<SimulatorRoadAccessibilityProps> = ({
  proposedLat,
  proposedLng,
  onApplyRecommendation,
}) => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(AHMEDABAD_CORRIDORS[0].id);
  const [directions, setDirections] = useState<DirectionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCorridor = AHMEDABAD_CORRIDORS.find((c) => c.id === selectedCorridorId) || AHMEDABAD_CORRIDORS[0];

  const handleCalculateDirections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await calculateDirections({
        start_lat: proposedLat,
        start_lng: proposedLng,
        end_lat: selectedCorridor.lat,
        end_lng: selectedCorridor.lng,
      });
      setDirections(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query routing services';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive detour insights
  const detourRatio = directions?.detour_ratio || 1.0;
  const isHighDetour = detourRatio > 1.35;
  const isModerateDetour = detourRatio > 1.15 && detourRatio <= 1.35;

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#0F766E]/10 text-[#0F766E]">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Road Accessibility & Detour Analysis
            </h4>
            <p className="text-[11px] text-slate-500">
              Evaluates real road network travel distance vs theoretical Euclidean radius
            </p>
          </div>
        </div>
      </div>

      {/* Corridor Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-700 block">
          Select Target Corridor / Arterial Waypoint in Ahmedabad:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AHMEDABAD_CORRIDORS.map((corridor) => {
            const isSelected = selectedCorridorId === corridor.id;
            return (
              <button
                key={corridor.id}
                type="button"
                onClick={() => {
                  setSelectedCorridorId(corridor.id);
                  setDirections(null);
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  isSelected
                    ? 'border-[#0F766E] bg-teal-50/70 font-semibold text-[#0F766E] shadow-xs ring-1 ring-[#0F766E]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-bold">{corridor.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{corridor.category}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={handleCalculateDirections}
          isLoading={isLoading}
          leftIcon={<Route className="w-3.5 h-3.5" />}
        >
          Measure Google Maps Road Distance & Travel Time
        </Button>
        <span className="text-[11px] text-slate-400 font-mono">
          From ({proposedLat.toFixed(4)}, {proposedLng.toFixed(4)}) &rarr; ({selectedCorridor.lat.toFixed(4)}, {selectedCorridor.lng.toFixed(4)})
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Calculated Results */}
      {directions && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
              Measured Road Network Accessibility
            </span>
            {directions.is_fixture && (
              <span className="text-[10px] font-mono text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                Ahmedabad Demo Fixture
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-white rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Straight-Line</span>
              <span className="text-slate-900 font-bold text-sm">
                {directions.straight_line_distance_km.toFixed(2)} km
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Euclidean haversine</span>
            </div>

            <div className="p-2.5 bg-white rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Road Distance</span>
              <span className="text-[#0F766E] font-bold text-sm">
                {directions.road_distance_km.toFixed(2)} km
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Google Maps network</span>
            </div>

            <div className="p-2.5 bg-white rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Travel Time</span>
              <span className="text-slate-900 font-bold text-sm">
                {directions.primary_duration_text || `${directions.primary_duration_mins} mins`}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Driving duration</span>
            </div>

            <div className="p-2.5 bg-white rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Detour Ratio</span>
              <span
                className={`font-bold text-sm ${
                  isHighDetour ? 'text-amber-700' : isModerateDetour ? 'text-blue-700' : 'text-emerald-700'
                }`}
              >
                {detourRatio.toFixed(2)}x
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Road / Straight-line</span>
            </div>
          </div>

          {/* Planning Insight */}
          <div className="p-3 bg-white rounded border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Catchment Friction & Planning Interpretation:</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {isHighDetour
                ? `A detour ratio of ${detourRatio.toFixed(2)}x indicates high arterial circuity (+${((detourRatio - 1) * 100).toFixed(0)}% additional driving distance). Customers travelling along this corridor incur significant route deviation friction. Planners are advised to adopt a conservative capture rate (≤ 25-30%) for this catchment.`
                : isModerateDetour
                ? `A detour ratio of ${detourRatio.toFixed(2)}x reflects standard urban traffic network routing (+${((detourRatio - 1) * 100).toFixed(0)}% over Euclidean). Suitable for baseline capture proportions (30-35%).`
                : `A detour ratio of ${detourRatio.toFixed(2)}x reflects direct radial highway access. Favorable for high customer diversion and vehicle throughput.`}
            </p>

            {onApplyRecommendation && isHighDetour && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-amber-800 font-medium">
                  Recommendation: Calibrate capture rate to 28% for high-circuity corridor
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyRecommendation(250.0, 0.28)}
                  className="text-xs text-[#0F766E]"
                >
                  Apply Calibration
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
