import React, { useEffect, useState } from 'react';
import { UserSupplyOverride } from '../../types/api';
import { Plus, Edit3, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface SupplyOverrideFormProps {
  stationId?: string;
  overrides: UserSupplyOverride[];
  onAddOrUpdateOverride: (override: UserSupplyOverride) => void;
  onRemoveOverride?: (date: string) => void;
  onClearOverrides?: () => void;
  minDate?: string;
}

export const SupplyOverrideForm: React.FC<SupplyOverrideFormProps> = ({
  stationId = 'default',
  overrides,
  onAddOrUpdateOverride,
  minDate = '2026-01-01',
}) => {
  const storageKey = `fuelcast_supply_old_values_${stationId}`;
  const loadSavedOldValues = (key: string): Record<string, number> => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const [date, setDate] = useState<string>(overrides[0]?.date || minDate);
  const [supplyKg, setSupplyKg] = useState<string>('1600');
  const [inputError, setInputError] = useState<string | null>(null);
  // Tracks original value before user updated a date so we can show "old -> updated" and revert
  const [oldValuesByDate, setOldValuesByDate] = useState<Record<string, number>>(() =>
    loadSavedOldValues(storageKey)
  );

  useEffect(() => {
    setOldValuesByDate(loadSavedOldValues(storageKey));
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(oldValuesByDate));
    } catch {
      // Ignore storage quota errors
    }
  }, [storageKey, oldValuesByDate]);

  useEffect(() => {
    if (overrides.length > 0 && date === minDate) {
      setDate(overrides[0].date);
      setSupplyKg(String(overrides[0].supply_kg));
    }
  }, [overrides, date, minDate]);

  // Prune oldValuesByDate entries if overrides were cleared or removed
  useEffect(() => {
    const activeDates = new Set(overrides.map((o) => o.date));
    setOldValuesByDate((prev) => {
      const next: Record<string, number> = {};
      let changed = false;
      for (const [d, val] of Object.entries(prev)) {
        if (activeDates.has(d)) {
          next[d] = val;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [overrides]);

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

    const roundedKg = Math.round(kg * 10) / 10;
    const existing = overrides.find((o) => o.date === date);
    if (existing && existing.supply_kg !== roundedKg) {
      setOldValuesByDate((prev) => ({
        ...prev,
        [date]: prev[date] !== undefined ? prev[date] : existing.supply_kg,
      }));
    }

    onAddOrUpdateOverride({
      date,
      supply_kg: roundedKg,
    });
  };

  const handleRevertUpdated = (targetDate: string) => {
    const oldVal = oldValuesByDate[targetDate];
    if (oldVal === undefined) return;
    setOldValuesByDate((prev) => {
      const next = { ...prev };
      delete next[targetDate];
      return next;
    });
    onAddOrUpdateOverride({
      date: targetDate,
      supply_kg: oldVal,
    });
    if (date === targetDate) {
      setSupplyKg(String(oldVal));
    }
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
      </form>

      {inputError && (
        <div className="text-xs text-[#AE2012] font-semibold">{inputError}</div>
      )}

      {/* Overrides List */}
      {overrides.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Scheduled Dates (click any date to edit):
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {overrides.map((item) => {
              const isSelected = item.date === date;
              const oldVal = oldValuesByDate[item.date];
              const isUpdated = oldVal !== undefined && oldVal !== item.supply_kg;

              return (
                <div
                  key={item.date}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    isUpdated
                      ? `bg-amber-50 border-amber-400 text-amber-950 shadow-xs ${
                          isSelected ? 'ring-2 ring-amber-300' : ''
                        }`
                      : isSelected
                      ? 'bg-[#EAF6F2] border-[#0A9396] text-[#005F73] shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDate(item.date);
                      setSupplyKg(String(item.supply_kg));
                      setInputError(null);
                    }}
                    className="flex items-center gap-1.5 font-mono cursor-pointer text-left"
                    title="Click to edit this date's planned supply"
                  >
                    {isUpdated && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 font-sans text-[9px] font-bold uppercase tracking-wide">
                        Updated
                      </span>
                    )}
                    <span className="font-bold">{item.date}</span>
                    <span className="text-slate-400">•</span>
                    {isUpdated ? (
                      <span className="flex items-center gap-1">
                        <span className="line-through text-slate-400">
                          {oldVal.toLocaleString()}
                        </span>
                        <span className="text-amber-600 font-sans">→</span>
                        <span className="font-bold text-amber-900">
                          {item.supply_kg.toLocaleString()} kg
                        </span>
                      </span>
                    ) : (
                      <span className="font-bold text-[#005F73]">
                        {item.supply_kg.toLocaleString()} kg
                      </span>
                    )}
                  </button>

                  {isUpdated && (
                    <button
                      type="button"
                      aria-label={`Revert override for ${item.date}`}
                      title={`Revert ${item.date} back to ${oldVal.toLocaleString()} kg`}
                      onClick={() => handleRevertUpdated(item.date)}
                      className="text-amber-700 hover:text-amber-950 transition-colors p-0.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
