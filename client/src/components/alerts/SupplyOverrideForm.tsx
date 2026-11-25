import React, { useState } from 'react';
import { UserSupplyOverride } from '../../types/api';
import { Plus, Trash2, Edit3, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface SupplyOverrideFormProps {
  overrides: UserSupplyOverride[];
  onAddOrUpdateOverride: (override: UserSupplyOverride) => void;
  onRemoveOverride: (date: string) => void;
  onClearOverrides: () => void;
  minDate?: string;
}

export const SupplyOverrideForm: React.FC<SupplyOverrideFormProps> = ({
  overrides,
  onAddOrUpdateOverride,
  onRemoveOverride,
  onClearOverrides,
  minDate = '2026-01-01',
}) => {
  const [date, setDate] = useState<string>(minDate);
  const [supplyKg, setSupplyKg] = useState<string>('1500');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (!date) {
      setInputError('Please select a target date.');
      return;
    }

    const kg = parseFloat(supplyKg);
    if (isNaN(kg) || kg < 0) {
      setInputError('Supply amount must be a positive number.');
      return;
    }

    onAddOrUpdateOverride({
      date,
      supply_kg: Math.round(kg * 10) / 10,
    });
  };

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="icon-box-teal shrink-0">
            <Edit3 className="w-4 h-4 text-[#005F73]" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Planner Supply Schedule Overrides (Future Dates)
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[#005F73] bg-[#EAF6F2] px-2.5 py-0.5 rounded-full border border-[#0A9396]/20">
          {overrides.length} Active Override(s)
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Baseline planned supply schedule concludes 2025-12-31. For forecast dates in 2026 or operational scenario testing, enter planned delivery allocations below.
      </p>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 text-xs">
        <div className="space-y-1">
          <label htmlFor="override-date-input" className="font-semibold text-slate-900">Target Date:</label>
          <input
            id="override-date-input"
            type="date"
            aria-label="Target date for supply override"
            value={date}
            min="2024-01-01"
            onChange={(e) => setDate(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0A9396]"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="override-supply-kg-input" className="font-semibold text-slate-900">Planned Supply (kg):</label>
          <input
            id="override-supply-kg-input"
            type="number"
            min={0}
            step={10}
            aria-label="Planned supply in kilograms"
            value={supplyKg}
            onChange={(e) => setSupplyKg(e.target.value)}
            placeholder="e.g. 1500"
            className="w-32 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0A9396]"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="rounded-xl shadow-xs font-bold"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add / Update Override
        </Button>

        {overrides.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearOverrides}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
            className="text-slate-500 hover:text-[#AE2012]"
          >
            Clear All Overrides
          </Button>
        )}
      </form>

      {inputError && (
        <div className="text-xs text-[#AE2012] font-semibold">{inputError}</div>
      )}

      {/* Overrides List */}
      {overrides.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Registered Overrides for API Dispatch:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {overrides.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-slate-900">{item.date}</span>
                  <div className="text-[11px] text-[#005F73] font-mono font-bold">
                    {item.supply_kg.toLocaleString()} kg
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove override for ${item.date}`}
                  onClick={() => onRemoveOverride(item.date)}
                  className="text-slate-400 hover:text-[#AE2012] transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
