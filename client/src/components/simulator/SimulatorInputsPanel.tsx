import React from 'react';
import { Sliders, RotateCcw, Play, MapPin, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { ImpactSimulatorRequest } from '../../types/api';

interface SimulatorInputsPanelProps {
  inputs: ImpactSimulatorRequest;
  onChange: (inputs: ImpactSimulatorRequest) => void;
  onSubmit: (inputs: ImpactSimulatorRequest) => void;
  onReset: () => void;
  isLoading: boolean;
  validationError?: string | null;
  fromMap?: boolean;
}

export const AHMEDABAD_SCREENING_BOUNDS = {
  minLat: 22.85,
  maxLat: 23.25,
  minLng: 72.40,
  maxLng: 72.75,
};

export const SimulatorInputsPanel: React.FC<SimulatorInputsPanelProps> = ({
  inputs,
  onChange,
  onSubmit,
  onReset,
  isLoading,
  validationError,
  fromMap = false,
}) => {
  const isOutsideBounds =
    inputs.proposed_latitude < AHMEDABAD_SCREENING_BOUNDS.minLat ||
    inputs.proposed_latitude > AHMEDABAD_SCREENING_BOUNDS.maxLat ||
    inputs.proposed_longitude < AHMEDABAD_SCREENING_BOUNDS.minLng ||
    inputs.proposed_longitude > AHMEDABAD_SCREENING_BOUNDS.maxLng;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputs);
  };

  const updateField = <K extends keyof ImpactSimulatorRequest>(field: K, value: ImpactSimulatorRequest[K]) => {
    onChange({
      ...inputs,
      [field]: value,
    });
  };

  const applyPreset = (preset: Partial<ImpactSimulatorRequest>) => {
    onChange({
      ...inputs,
      ...preset,
    });
  };

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-5">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-md bg-[#0F766E]/10 text-[#0F766E]">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-[#0F172A] uppercase tracking-wider">
            Scenario Planning Inputs
          </h3>
          <DataOriginBadge origin="user_entered_scenario" size="sm" />
          {fromMap && (
            <Badge variant="teal" size="sm">
              📍 Pre-filled from Map
            </Badge>
          )}
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[#0F766E] hover:text-[#0F766E]/80 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Illustrative Example
        </button>
      </div>

      {/* Preset Quick-Buttons */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Quick Scenario Presets (Illustrative Assumptions):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              applyPreset({
                proposed_latitude: 23.05,
                proposed_longitude: 72.60,
                catchment_radius_km: 3.0,
                catchment_demand_kg_per_day: 5000.0,
                capture_proportion: 0.35,
                diversion_proportion: 0.60,
                accessibility_demand_kg_per_day: 0.0,
              })
            }
            className="py-1 px-2.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            Standard Case (35% Cap, 60% Div)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset({
                proposed_latitude: 23.05,
                proposed_longitude: 72.60,
                catchment_radius_km: 3.0,
                catchment_demand_kg_per_day: 5000.0,
                capture_proportion: 0.81,
                diversion_proportion: 0.60,
                accessibility_demand_kg_per_day: 0.0,
              })
            }
            className="py-1 px-2.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-800 transition-colors shadow-xs cursor-pointer"
          >
            Screenshot Benchmark (81% Cap, 60% Div → 1,620 kg/d)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset({
                proposed_latitude: 23.035,
                proposed_longitude: 72.528,
                catchment_radius_km: 2.0,
                catchment_demand_kg_per_day: 8000.0,
                capture_proportion: 0.45,
                diversion_proportion: 0.70,
                accessibility_demand_kg_per_day: 400.0,
              })
            }
            className="py-1 px-2.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            Urban High-Density Corridor
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset({
                proposed_latitude: 23.067,
                proposed_longitude: 72.65,
                catchment_radius_km: 6.0,
                catchment_demand_kg_per_day: 6500.0,
                capture_proportion: 0.25,
                diversion_proportion: 0.35,
                accessibility_demand_kg_per_day: 1200.0,
              })
            }
            className="py-1 px-2.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            Peripheral Ring Highway Outlet
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Proposed Coordinates */}
        <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
              Proposed Candidate Location Coordinates
            </label>
            <span className="text-[10px] text-slate-400">Decimal Degrees (WGS84)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sim-lat" className="text-[11px] font-medium text-slate-600 block mb-1">
                Latitude (°N) [−90 to 90]:
              </label>
              <input
                id="sim-lat"
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={inputs.proposed_latitude}
                onChange={(e) => updateField('proposed_latitude', parseFloat(e.target.value) || 0)}
                aria-label="Proposed latitude"
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                required
              />
            </div>

            <div>
              <label htmlFor="sim-lng" className="text-[11px] font-medium text-slate-600 block mb-1">
                Longitude (°E) [−180 to 180]:
              </label>
              <input
                id="sim-lng"
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={inputs.proposed_longitude}
                onChange={(e) => updateField('proposed_longitude', parseFloat(e.target.value) || 0)}
                aria-label="Proposed longitude"
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                required
              />
            </div>
          </div>

          {isOutsideBounds && (
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200/80 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Location lies outside the default Ahmedabad study perimeter [22.85–23.25°N, 72.40–72.75°E].</span>
            </p>
          )}
        </div>

        {/* Dual Slider + Numeric Control 1: Catchment Radius */}
        <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="sim-radius-input" className="font-semibold text-slate-800">
                Catchment Radius
              </label>
              <span className="text-[11px] text-slate-500 block">
                Estimated service zone envelope around the station
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="sim-radius-input"
                type="number"
                min="0.1"
                max="50.0"
                step="0.1"
                value={inputs.catchment_radius_km}
                onChange={(e) => updateField('catchment_radius_km', Math.max(0.1, Math.min(50, parseFloat(e.target.value) || 0.1)))}
                aria-label="Catchment radius in km"
                className="w-20 py-1 px-2 border border-slate-200 rounded text-right font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
              <span className="text-xs font-medium text-slate-600">km</span>
            </div>
          </div>
          <input
            type="range"
            min="0.5"
            max="20.0"
            step="0.5"
            value={inputs.catchment_radius_km}
            onChange={(e) => updateField('catchment_radius_km', parseFloat(e.target.value))}
            aria-label="Catchment radius slider"
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0.5 km (Local)</span>
            <span>3.0 km (Benchmark)</span>
            <span>20.0 km (Regional)</span>
          </div>
        </div>

        {/* Dual Slider + Numeric Control 2: Assumed Catchment Demand */}
        <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="sim-demand-input" className="font-semibold text-slate-800">
                Assumed Catchment Demand
              </label>
              <span className="text-[11px] text-slate-500 block">
                Aggregate daily CNG fuel consumption across the zone (&gt; 0 kg/day)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="sim-demand-input"
                type="number"
                min="100"
                max="50000"
                step="100"
                value={inputs.catchment_demand_kg_per_day}
                onChange={(e) => updateField('catchment_demand_kg_per_day', Math.max(1, parseFloat(e.target.value) || 1))}
                aria-label="Assumed catchment demand in kg per day"
                className="w-24 py-1 px-2 border border-slate-200 rounded text-right font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
              <span className="text-xs font-medium text-slate-600">kg/day</span>
            </div>
          </div>
          <input
            type="range"
            min="500"
            max="20000"
            step="250"
            value={Math.min(20000, Math.max(500, inputs.catchment_demand_kg_per_day))}
            onChange={(e) => updateField('catchment_demand_kg_per_day', parseFloat(e.target.value))}
            aria-label="Assumed catchment demand slider"
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>500 kg/day</span>
            <span>5,000 kg/day (Standard)</span>
            <span>20,000 kg/day</span>
          </div>
        </div>

        {/* Dual Slider + Numeric Control 3: Capture Proportion */}
        <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="sim-capture-input" className="font-semibold text-slate-800">
                Market Capture Proportion
              </label>
              <span className="text-[11px] text-slate-500 block">
                Share of catchment demand won by the proposed station (0.0 to 1.0)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="sim-capture-input"
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(inputs.capture_proportion * 100)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateField('capture_proportion', Math.max(0, Math.min(1, (isNaN(val) ? 0 : val) / 100)));
                }}
                aria-label="Market capture percentage"
                className="w-20 py-1 px-2 border border-slate-200 rounded text-right font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
              <span className="text-xs font-medium text-slate-600">%</span>
              <span className="text-[11px] font-mono text-slate-400">({inputs.capture_proportion.toFixed(2)})</span>
            </div>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={inputs.capture_proportion}
            onChange={(e) => updateField('capture_proportion', parseFloat(e.target.value))}
            aria-label="Capture proportion slider"
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0% (No capture)</span>
            <span>35% (Benchmark)</span>
            <span>100% (Monopoly)</span>
          </div>
        </div>

        {/* Dual Slider + Numeric Control 4: Diversion Proportion */}
        <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="sim-diversion-input" className="font-semibold text-slate-800">
                Network Diversion Proportion (Cannibalization Rate)
              </label>
              <span className="text-[11px] text-slate-500 block">
                Portion of captured volume drawn from existing network stations (0.0 to 1.0)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="sim-diversion-input"
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(inputs.diversion_proportion * 100)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateField('diversion_proportion', Math.max(0, Math.min(1, (isNaN(val) ? 0 : val) / 100)));
                }}
                aria-label="Network diversion percentage"
                className="w-20 py-1 px-2 border border-slate-200 rounded text-right font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
              <span className="text-xs font-medium text-slate-600">%</span>
              <span className="text-[11px] font-mono text-slate-400">({inputs.diversion_proportion.toFixed(2)})</span>
            </div>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={inputs.diversion_proportion}
            onChange={(e) => updateField('diversion_proportion', parseFloat(e.target.value))}
            aria-label="Diversion proportion slider"
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0% (Pure new demand)</span>
            <span>60% (Benchmark)</span>
            <span>100% (Full cannibalization)</span>
          </div>
        </div>

        {/* Dual Slider + Numeric Control 5: Accessibility-Generated Demand */}
        <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="sim-access-input" className="font-semibold text-slate-800">
                Accessibility-Generated Demand
              </label>
              <span className="text-[11px] text-slate-500 block">
                Latent traffic or fleet conversions unlocked by convenient physical access (≥ 0 kg/day)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="sim-access-input"
                type="number"
                min="0"
                max="10000"
                step="50"
                value={inputs.accessibility_demand_kg_per_day ?? 0}
                onChange={(e) => updateField('accessibility_demand_kg_per_day', Math.max(0, parseFloat(e.target.value) || 0))}
                aria-label="Accessibility-generated demand in kg per day"
                className="w-24 py-1 px-2 border border-slate-200 rounded text-right font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
              <span className="text-xs font-medium text-slate-600">kg/day</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="3000"
            step="50"
            value={Math.min(3000, inputs.accessibility_demand_kg_per_day ?? 0)}
            onChange={(e) => updateField('accessibility_demand_kg_per_day', parseFloat(e.target.value))}
            aria-label="Accessibility-generated demand slider"
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0 kg/day (Standard baseline)</span>
            <span>1,000 kg/day</span>
            <span>3,000 kg/day (High arterial access)</span>
          </div>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Validation Constraint Not Met:</p>
              <p>{validationError}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            leftIcon={<Play className="w-4 h-4 fill-white" />}
            className="w-full justify-center text-xs py-2.5 font-bold tracking-wide"
          >
            Calculate Network Impact Scenario
          </Button>
        </div>
      </form>
    </div>
  );
};
