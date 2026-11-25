import React from 'react';
import { ScoringWeightsConfig } from '../../types/candidates';
import { Sliders, RotateCcw, Info, Sparkles, CheckCircle2 } from 'lucide-react';

export interface WeightsTuningPanelProps {
  weights: ScoringWeightsConfig;
  onWeightsChange: (newWeights: ScoringWeightsConfig) => void;
  onResetDefaults: () => void;
  isUpdating?: boolean;
}

export const DEFAULT_WEIGHTS: ScoringWeightsConfig = {
  demand_weight: 0.35,
  service_gap_weight: 0.30,
  road_accessibility_weight: 0.20,
  distance_weight: 0.15,
  min_distance_threshold_km: 2.0,
  service_gap_ideal_km: 8.0,
};

export const WeightsTuningPanel: React.FC<WeightsTuningPanelProps> = ({
  weights,
  onWeightsChange,
  onResetDefaults,
  isUpdating = false,
}) => {
  const totalWeightPercent = Math.round(
    (weights.demand_weight +
      weights.service_gap_weight +
      weights.road_accessibility_weight +
      weights.distance_weight) *
      100
  );

  const handleSliderChange = (key: keyof ScoringWeightsConfig, rawValue: number) => {
    onWeightsChange({
      ...weights,
      [key]: rawValue,
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Multi-Criteria Weights</h3>
              <p className="text-[11px] text-slate-400">Dynamic Multi-Criteria Decision Analysis (MCDA)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUpdating ? (
              <span className="flex items-center gap-1 text-[11px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20 animate-pulse">
                <Sparkles className="w-3 h-3" />
                Live Sync
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            )}

            <button
              type="button"
              onClick={onResetDefaults}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Reset default weights"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Weights Sliders Grid */}
        <div className="space-y-4 pt-4">
          {/* Demand Proxy Weight */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Demand Proxy (AADT & Industrial Hub)</span>
              <span className="font-mono font-bold text-teal-400">
                {Math.round(weights.demand_weight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={weights.demand_weight}
              onChange={(e) => handleSliderChange('demand_weight', parseFloat(e.target.value))}
              className="w-full accent-teal-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0%</span>
              <span>Default: 35%</span>
              <span>80%</span>
            </div>
          </div>

          {/* Service Gap Weight */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Network Service Gap (Underserved Radius)</span>
              <span className="font-mono font-bold text-teal-400">
                {Math.round(weights.service_gap_weight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={weights.service_gap_weight}
              onChange={(e) => handleSliderChange('service_gap_weight', parseFloat(e.target.value))}
              className="w-full accent-teal-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0%</span>
              <span>Default: 30%</span>
              <span>80%</span>
            </div>
          </div>

          {/* Road Accessibility Weight */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Road Accessibility & Highway Class</span>
              <span className="font-mono font-bold text-teal-400">
                {Math.round(weights.road_accessibility_weight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={weights.road_accessibility_weight}
              onChange={(e) => handleSliderChange('road_accessibility_weight', parseFloat(e.target.value))}
              className="w-full accent-teal-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0%</span>
              <span>Default: 20%</span>
              <span>80%</span>
            </div>
          </div>

          {/* Distance Weight */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Distance from Nearest Station</span>
              <span className="font-mono font-bold text-teal-400">
                {Math.round(weights.distance_weight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={weights.distance_weight}
              onChange={(e) => handleSliderChange('distance_weight', parseFloat(e.target.value))}
              className="w-full accent-teal-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0%</span>
              <span>Default: 15%</span>
              <span>80%</span>
            </div>
          </div>

          {/* Spatial Thresholds */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Min Buffer:</span>
                <span className="font-mono text-slate-200">{weights.min_distance_threshold_km} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={weights.min_distance_threshold_km}
                onChange={(e) =>
                  handleSliderChange('min_distance_threshold_km', parseFloat(e.target.value))
                }
                className="w-full accent-teal-500 bg-slate-800 h-1 rounded appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Ideal Gap:</span>
                <span className="font-mono text-slate-200">{weights.service_gap_ideal_km} km</span>
              </div>
              <input
                type="range"
                min="4.0"
                max="20.0"
                step="1.0"
                value={weights.service_gap_ideal_km}
                onChange={(e) =>
                  handleSliderChange('service_gap_ideal_km', parseFloat(e.target.value))
                }
                className="w-full accent-teal-500 bg-slate-800 h-1 rounded appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mathematical Disclosure Box */}
      <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between text-slate-300 font-semibold">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-teal-400" />
            Dynamic Weight Renormalization
          </span>
          <span className={`font-mono text-xs ${totalWeightPercent === 100 ? 'text-teal-400' : 'text-amber-400'}`}>
            Sum: {totalWeightPercent}%
          </span>
        </div>
        <p className="leading-relaxed">
          Scores are evaluated dynamically on each slider adjustment. When criteria are missing for a location, the engine rebalances the remaining weights proportionally to 100% instead of penalizing the site with zero.
        </p>
      </div>
    </div>
  );
};
