import React from 'react';
import { Calendar, Sliders, Play, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface ForecastControlPanelProps {
  horizonDays: number;
  onChangeHorizon: (days: number) => void;
  model: 'holt_winters' | 'rolling_mean_baseline';
  onChangeModel: (model: 'holt_winters' | 'rolling_mean_baseline') => void;
  includeBaseline: boolean;
  onToggleBaseline: (include: boolean) => void;
  aggregation: 'daily' | 'weekly';
  onChangeAggregation: (agg: 'daily' | 'weekly') => void;
  isLoading: boolean;
  onRunForecast: () => void;
}

export const ForecastControlPanel: React.FC<ForecastControlPanelProps> = ({
  horizonDays,
  onChangeHorizon,
  model,
  onChangeModel,
  includeBaseline,
  onToggleBaseline,
  aggregation,
  onChangeAggregation,
  isLoading,
  onRunForecast,
}) => {
  const horizonPresets = [7, 14, 30];

  return (
    <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#0F766E]" />
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Forecast Parameters
          </h3>
        </div>
        <span className="text-[11px] text-[#64748B]">
          docs/API_CONTRACT.md: POST /api/v1/forecast
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* 1. Horizon Selection */}
        <div className="space-y-1.5">
          <label className="font-semibold text-[#0F172A] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Horizon (Days)
            </span>
            <span className="text-[11px] font-mono text-[#0F766E]">{horizonDays}d</span>
          </label>
          <div className="flex items-center gap-1.5">
            {horizonPresets.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onChangeHorizon(days)}
                className={`flex-1 py-1.5 px-2 rounded font-medium text-xs border transition-all ${
                  horizonDays === days
                    ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {days}d
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={30}
              aria-label="Custom forecast horizon in days"
              value={horizonDays}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  onChangeHorizon(Math.min(30, Math.max(1, val)));
                }
              }}
              className="w-14 py-1 px-2 border border-slate-200 rounded text-center text-xs font-mono font-medium focus:ring-1 focus:ring-[#0F766E] focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-400">Allowed range: 1 to 30 days</p>
        </div>

        {/* 2. Model Selection */}
        <div className="space-y-1.5">
          <label htmlFor="model-select" className="font-semibold text-[#0F172A]">
            Forecasting Model
          </label>
          <select
            id="model-select"
            aria-label="Select forecast model"
            value={model}
            onChange={(e) =>
              onChangeModel(e.target.value as 'holt_winters' | 'rolling_mean_baseline')
            }
            className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E] cursor-pointer"
          >
            <option value="holt_winters">Holt-Winters (Seasonal)</option>
            <option value="rolling_mean_baseline">28-Day Rolling Mean Baseline</option>
          </select>
          <p className="text-[10px] text-slate-400">
            {model === 'holt_winters'
              ? 'Includes lower & upper bounds'
              : 'Deterministic benchmark baseline'}
          </p>
        </div>

        {/* 3. Aggregation & Baseline Options */}
        <div className="space-y-1.5">
          <label className="font-semibold text-[#0F172A]">Presentation View</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeAggregation('daily')}
              className={`flex-1 py-1.5 px-2 rounded font-medium text-xs border transition-all ${
                aggregation === 'daily'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Daily (kg/day)
            </button>
            <button
              type="button"
              onClick={() => onChangeAggregation('weekly')}
              className={`flex-1 py-1.5 px-2 rounded font-medium text-xs border transition-all ${
                aggregation === 'weekly'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Weekly Sum
            </button>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={includeBaseline}
              onChange={(e) => onToggleBaseline(e.target.checked)}
              className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
            />
            <span className="text-[11px] text-slate-600">Overlay 28d Baseline</span>
          </label>
        </div>

        {/* 4. Action CTA */}
        <div className="flex flex-col justify-end space-y-1.5">
          <Button
            variant="primary"
            size="sm"
            onClick={onRunForecast}
            isLoading={isLoading}
            leftIcon={isLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            className="w-full justify-center"
          >
            {isLoading ? 'Computing Model...' : 'Generate Forecast'}
          </Button>
          <span className="text-[10px] text-slate-400 text-center">
            Backend evaluated on 990 station-days
          </span>
        </div>
      </div>
    </div>
  );
};
