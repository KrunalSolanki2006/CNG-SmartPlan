import React, { useState, useEffect } from 'react';
import { useStations } from '../hooks/useStations';
import { useSupplyCheck } from '../hooks/useSupplyCheck';
import { useFixtureMode } from '../context/FixtureContext';
import { SupplyCheckRequest, UserSupplyOverride } from '../types/api';
import { ErrorState } from '../components/ui/ErrorState';
import { StationSelector } from '../components/forecast/StationSelector';
import { SupplyAlertChart } from '../components/alerts/SupplyAlertChart';
import { SupplySummaryCards } from '../components/alerts/SupplySummaryCards';
import { SupplyOverrideForm } from '../components/alerts/SupplyOverrideForm';
import { SupplyComparisonTable } from '../components/alerts/SupplyComparisonTable';
import { MotionSection } from '../components/ui/MotionContainer';
import { Calendar } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { useFixtures } = useFixtureMode();

  // 1. Fetch eligible stations inventory
  const {
    data: stationsData,
    isLoading: isStationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useStations({ eligible_for_simulation: true });

  const eligibleStations =
    stationsData?.stations.filter(
      (s) => s.eligible_for_simulation || s.in_study_area === 'yes'
    ) || [];

  const [selectedStationId, setSelectedStationId] = useState<string>('AMD001');

  // Sync station when eligible list loads
  useEffect(() => {
    if (
      eligibleStations.length > 0 &&
      !eligibleStations.some((s) => s.station_id === selectedStationId)
    ) {
      setSelectedStationId(eligibleStations[0].station_id);
    }
  }, [eligibleStations, selectedStationId]);

  // 2. Horizon state
  const [horizonDays, setHorizonDays] = useState<number>(7);

  // 3. User overrides state for future supply planning (persisted per station in localStorage)
  const loadSavedOverrides = (sid: string): UserSupplyOverride[] => {
    try {
      const raw = localStorage.getItem(`fuelcast_supply_overrides_${sid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const loadSavedAutoKg = (sid: string): number | null => {
    try {
      const raw = localStorage.getItem(`fuelcast_supply_auto_kg_${sid}`);
      if (raw === null) return 1600;
      const parsed = JSON.parse(raw);
      return typeof parsed === 'number' || parsed === null ? parsed : 1600;
    } catch {
      return 1600;
    }
  };

  const [userOverrides, setUserOverrides] = useState<UserSupplyOverride[]>(() =>
    loadSavedOverrides('AMD001')
  );
  const [autoSupplyKg, setAutoSupplyKg] = useState<number | null>(() =>
    loadSavedAutoKg('AMD001')
  );

  // Reload saved overrides when switching stations
  useEffect(() => {
    setUserOverrides(loadSavedOverrides(selectedStationId));
    setAutoSupplyKg(loadSavedAutoKg(selectedStationId));
  }, [selectedStationId]);

  // Persist overrides and auto baseline to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        `fuelcast_supply_overrides_${selectedStationId}`,
        JSON.stringify(userOverrides)
      );
      localStorage.setItem(
        `fuelcast_supply_auto_kg_${selectedStationId}`,
        JSON.stringify(autoSupplyKg)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [selectedStationId, userOverrides, autoSupplyKg]);

  const handleAddOrUpdateOverride = (override: UserSupplyOverride) => {
    setUserOverrides((prev) => {
      const filtered = prev.filter((o) => o.date !== override.date);
      return [...filtered, override].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleRemoveOverride = (date: string) => {
    setAutoSupplyKg(null);
    setUserOverrides((prev) => prev.filter((o) => o.date !== date));
  };

  const handleClearOverrides = () => {
    setAutoSupplyKg(null);
    setUserOverrides([]);
  };

  const handleApplyPresetSupply = (targetKg: number) => {
    setAutoSupplyKg(targetKg);
    if (!supplyData?.comparison) return;
    const newOverrides: UserSupplyOverride[] = supplyData.comparison.map((pt) => ({
      date: pt.date,
      supply_kg: targetKg,
    }));
    setUserOverrides(newOverrides);
  };

  // 4. Supply check API request payload
  const supplyRequest: SupplyCheckRequest = {
    station_id: selectedStationId,
    horizon_days: horizonDays,
    supply_source: userOverrides.length > 0 ? 'user_entered' : 'synthetic',
    user_supply_overrides: userOverrides.length > 0 ? userOverrides : null,
  };

  const {
    data: supplyData,
    isLoading: isSupplyLoading,
    error: supplyError,
    refetch: refetchSupply,
  } = useSupplyCheck(supplyRequest);

  // Auto-populate intelligent baseline supply if future dates lack allocation (including horizon switches)
  useEffect(() => {
    if (autoSupplyKg === null || !supplyData?.comparison) return;
    const existingDates = new Set(userOverrides.map((o) => o.date));
    const missingDates = supplyData.comparison.filter(
      (pt) => pt.supply_data_origin !== 'synthetic_demo' && !existingDates.has(pt.date)
    );
    if (missingDates.length > 0) {
      setUserOverrides((prev) => {
        const merged = [...prev];
        for (const pt of missingDates) {
          merged.push({ date: pt.date, supply_kg: autoSupplyKg });
        }
        return merged.sort((a, b) => a.date.localeCompare(b.date));
      });
    }
  }, [supplyData, userOverrides, autoSupplyKg]);



  return (
    <div className="space-y-6">
      {/* Header & Planning Context */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold tracking-wide uppercase text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Logistics & Continuity
                </span>
                <span className="text-xs text-slate-500 font-medium">Gujarat Gas Company Ltd. • Ahmedabad</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Potential Supply-Shortfall Alerts
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-1">
                Compares station-level forecast demand against planned available supply. Identifies theoretical planning deficits to guide delivery allocations, distinguish planning gaps from physical stockouts, and test future delivery scenarios.
              </p>
            </div>


          </div>
        </div>
      </MotionSection>

      {/* Station Selector & Horizon Parameter Bar */}
      <MotionSection delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
              <StationSelector
                stations={stationsData?.stations || []}
                selectedStationId={selectedStationId}
                onSelectStation={(id) => setSelectedStationId(id)}
                isLoading={isStationsLoading}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs h-full flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#005F73]" />
                    Evaluation Horizon (Days)
                  </span>
                  <span className="font-mono text-[#005F73] font-bold">{horizonDays}d</span>
                </label>

                <div className="flex items-center gap-1.5">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setHorizonDays(d)}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs border transition-all cursor-pointer ${
                        horizonDays === d
                          ? 'bg-[#005F73] text-white border-[#005F73] shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    aria-label="Custom evaluation horizon in days"
                    value={horizonDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setHorizonDays(Math.min(30, Math.max(1, val)));
                    }}
                    className="w-14 py-1 px-2 border border-slate-200 bg-slate-50 rounded-lg text-center text-xs font-mono font-medium focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-teal-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Live Balance Evaluation Active
                </span>
                <span className="font-mono text-slate-400">Auto-calculated</span>
              </div>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Error States */}
      {stationsError && !useFixtures && (
        <ErrorState
          title="Station Inventory Unavailable"
          code={stationsError.code}
          message={stationsError.message}
          onRetry={refetchStations}
        />
      )}

      {supplyError && !useFixtures && (
        <ErrorState
          title="Supply Check Computation Error"
          code={supplyError.code}
          message={`${supplyError.message} Ensure Member 2's backend service is running on http://localhost:8000.`}
          onRetry={refetchSupply}
        />
      )}

      {/* Shortfall Summary Metrics Strip */}
      <MotionSection delay={0.15}>
        <SupplySummaryCards
          summary={
            supplyData?.summary || {
              days_with_shortfall: 3,
              max_shortfall_kg: 210.4,
              total_shortfall_kg: 450.2,
            }
          }
          totalDays={supplyData?.comparison.length || horizonDays}
        />
      </MotionSection>

      {/* Multi-Series Recharts Chart */}
      <MotionSection delay={0.2}>
        <SupplyAlertChart
          comparison={supplyData?.comparison || []}
          isLoading={isSupplyLoading}
          stationId={selectedStationId}
          onApplyPresetSupply={handleApplyPresetSupply}
        />
      </MotionSection>

      {/* Future Supply Overrides Form */}
      <MotionSection delay={0.25}>
        <SupplyOverrideForm
          stationId={selectedStationId}
          overrides={userOverrides}
          onAddOrUpdateOverride={handleAddOrUpdateOverride}
          onRemoveOverride={handleRemoveOverride}
          onClearOverrides={handleClearOverrides}
          minDate="2026-01-01"
        />
      </MotionSection>

      {/* Tabular Ledger with Status Filtering */}
      {supplyData && (
        <MotionSection delay={0.3}>
          <SupplyComparisonTable
            comparison={supplyData.comparison}
            stationId={selectedStationId}
          />
        </MotionSection>
      )}
    </div>
  );
};
