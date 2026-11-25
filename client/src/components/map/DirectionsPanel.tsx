import React, { useState } from 'react';
import {
  Navigation,
  Car,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
  X,
  Shuffle,
  Info,
} from 'lucide-react';
import { DirectionsResponse } from '../../types/maps';

export interface DirectionsPanelProps {
  directions: DirectionsResponse | null;
  onClear: () => void;
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  originLabel?: string;
  destinationLabel?: string;
}

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  directions,
  onClear,
  selectedRouteIndex,
  onSelectRouteIndex,
  originLabel = 'Proposed Candidate',
  destinationLabel = 'Target CNG Station',
}) => {
  const [showSteps, setShowSteps] = useState(false);

  if (!directions) return null;

  const currentRoute = directions.routes[selectedRouteIndex] || directions.routes[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EAF6F2] text-[#005F73] flex items-center justify-center border border-[#94D2BD]/60">
            <Car className="w-4 h-4 text-[#0A9396]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Road Accessibility & Routing Analysis
            </h4>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="font-medium text-slate-900">{originLabel}</span>
              <span>→</span>
              <span className="font-medium text-slate-900">{destinationLabel}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Clear routing analysis"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Road Distance */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Car className="w-3 h-3 text-[#005F73]" />
            Road Distance
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 font-mono">
            {currentRoute?.distance_text || `${directions.road_distance_km} km`}
          </div>
          <div className="text-[10px] text-slate-500">via driving network</div>
        </div>

        {/* Metric 2: Straight-line Distance */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Compass className="w-3 h-3 text-slate-500" />
            Straight Line
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 font-mono">
            {directions.straight_line_distance_km} km
          </div>
          <div className="text-[10px] text-slate-500">Haversine geodesic</div>
        </div>

        {/* Metric 3: Travel Duration */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#EE9B00]" />
            Drive Time
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 font-mono">
            {currentRoute?.duration_text || directions.primary_duration_text}
          </div>
          <div className="text-[10px] text-slate-500">under typical traffic</div>
        </div>

        {/* Metric 4: Detour Ratio (Circuity Factor) */}
        <div className="bg-[#EAF6F2] p-3 rounded-xl border border-[#94D2BD]/60">
          <div className="text-[10px] uppercase font-bold text-[#005F73] flex items-center gap-1">
            <Shuffle className="w-3 h-3 text-[#0A9396]" />
            Detour Ratio
          </div>
          <div className="text-base font-bold text-[#005F73] mt-1 font-mono">
            {directions.detour_ratio.toFixed(2)}×
          </div>
          <div className="text-[10px] text-[#0A9396]">road circuity factor</div>
        </div>
      </div>

      {/* Explanatory banner */}
      <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 border border-slate-200 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span>A detour ratio of </span>
          <span className="font-semibold text-slate-900 font-mono">{directions.detour_ratio.toFixed(2)}×</span>
          <span> means the actual road transit distance is </span>
          <span className="font-semibold text-slate-900">
            {Math.round((directions.detour_ratio - 1) * 100)}% longer
          </span>
          <span> than the Euclidean straight-line radius due to urban street grid constraints.</span>
        </div>
      </div>

      {/* Route Switcher (if alternatives present) */}
      {directions.routes.length > 1 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-900">Alternative Road Corridors:</div>
          <div className="flex flex-wrap gap-2">
            {directions.routes.map((route, idx) => (
              <button
                key={route.route_id}
                type="button"
                onClick={() => onSelectRouteIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer flex items-center gap-2 ${
                  idx === selectedRouteIndex
                    ? 'bg-[#005F73] text-white border-[#005F73] shadow-xs'
                    : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{route.summary || `Route ${idx + 1}`}</span>
                <span className={`text-[10px] ${idx === selectedRouteIndex ? 'text-[#94D2BD]' : 'text-slate-500'}`}>
                  {route.distance_text} • {route.duration_text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Turn-by-Turn Navigation Steps */}
      {currentRoute?.steps && currentRoute.steps.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowSteps(!showSteps)}
            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#0A9396]" />
              <span>Turn-by-Turn Navigation Directions ({currentRoute.steps.length} steps)</span>
            </span>
            {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSteps && (
            <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto p-2 bg-slate-50/50 rounded-xl border border-slate-200">
              {currentRoute.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-100 text-xs text-slate-900"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-50 text-[#005F73] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{step.instruction}</div>
                    {(step.distance || step.duration) && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {[step.distance, step.duration].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
