import React, { useState, useEffect } from 'react';
import { useStations } from '../hooks/useStations';
import { useSupplyCheck } from '../hooks/useSupplyCheck';
import { useFixtureMode } from '../context/FixtureContext';
import { SupplyCheckRequest, UserSupplyOverride } from '../types/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { ErrorState } from '../components/ui/ErrorState';
import { StationSelector } from '../components/forecast/StationSelector';
import { SupplyAlertChart } from '../components/alerts/SupplyAlertChart';
import { SupplySummaryCards } from '../components/alerts/SupplySummaryCards';
import { SupplyOverrideForm } from '../components/alerts/SupplyOverrideForm';
import { SupplyComparisonTable } from '../components/alerts/SupplyComparisonTable';
import { RotateCcw, Calendar, Sliders } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { useFixtures, toggleFixtures } = useFixtureMode();

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

  // 3. User overrides state for future supply planning
  const [userOverrides, setUserOverrides] = useState<UserSupplyOverride[]>([]);

  const handleAddOrUpdateOverride = (override: UserSupplyOverride) => {
    setUserOverrides((prev) => {
      const filtered = prev.filter((o) => o.date !== override.date);
      return [...filtered, override].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleRemoveOverride = (date: string) => {
    setUserOverrides((prev) => prev.filter((o) => o.date !== date));
  };

  const handleClearOverrides = () => {
    setUserOverrides([]);
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

  const handleRefreshAll = () => {
    refetchStations();
    refetchSupply();
  };

  return (
    <div className="space-y-6">
      {/* Dev Fixture Persistent Notice */}
      {useFixtures && (
        <div
          role="status"
          className="rounded-lg bg-amber-500 text-slate-950 p-3 text-xs font-medium flex items-center justify-between shadow-sm border border-amber-600"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] bg-black text-amber-300 px-2 py-0.5 rounded">
              Dev Fixtures Active
            </span>
            <span>
              Offline development fixtures enabled. Real API calls are bypassed; never used as a silent production fallback.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFixtures}
            className="underline hover:text-white font-bold ml-2 cursor-pointer"
          >
            Switch to Live API
          </button>
        </div>
      )}

      {/* Header & Planning Context */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
              Potential Supply-Shortfall Alerts
            </h2>
            <Badge variant="warning">Feature C</Badge>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Compares station-level forecast demand against planned available supply. Identifies theoretical planning deficits to guide delivery allocations, distinguish planning gaps from physical stockouts, and test future delivery scenarios.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFixtures}
            className="text-xs text-[#64748B]"
          >
            {useFixtures ? 'Disable Fixtures' : 'Enable Dev Fixtures'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Station Selector & Horizon Parameter Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card">
            <StationSelector
              stations={stationsData?.stations || []}
              selectedStationId={selectedStationId}
              onSelectStation={(id) => setSelectedStationId(id)}
              isLoading={isStationsLoading}
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card h-full flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
                  Evaluation Horizon (Days)
                </span>
                <span className="font-mono text-[#0F766E] font-bold">{horizonDays}d</span>
              </label>

              <div className="flex items-center gap-1.5">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setHorizonDays(d)}
                    className={`flex-1 py-1.5 px-2 rounded font-medium text-xs border transition-all ${
                      horizonDays === d
                        ? 'bg-[#0F766E] text-white border-[#0F766E]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
                  className="w-14 py-1 px-2 border border-slate-200 rounded text-center text-xs font-mono font-medium focus:ring-1 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={refetchSupply}
              isLoading={isSupplyLoading}
              leftIcon={<Sliders className="w-3.5 h-3.5" />}
              className="w-full justify-center text-xs"
            >
              {isSupplyLoading ? 'Analyzing Shortfalls...' : 'Re-evaluate Supply Balance'}
            </Button>
          </div>
        </div>
      </div>

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

      {/* Multi-Series Recharts Chart */}
      <SupplyAlertChart
        comparison={supplyData?.comparison || []}
        isLoading={isSupplyLoading}
        stationId={selectedStationId}
      />

      {/* Future Supply Overrides Form */}
      <SupplyOverrideForm
        overrides={userOverrides}
        onAddOrUpdateOverride={handleAddOrUpdateOverride}
        onRemoveOverride={handleRemoveOverride}
        onClearOverrides={handleClearOverrides}
        minDate="2026-01-01"
      />

      {/* Tabular Ledger with Status Filtering */}
      {supplyData && (
        <SupplyComparisonTable
          comparison={supplyData.comparison}
          stationId={selectedStationId}
        />
      )}
    </div>
  );
};
