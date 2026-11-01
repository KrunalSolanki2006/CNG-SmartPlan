import React, { useState, useEffect } from 'react';
import { useStations } from '../hooks/useStations';
import { useHistory } from '../hooks/useHistory';
import { useForecast } from '../hooks/useForecast';
import { useHourlyDemand } from '../hooks/useHourlyDemand';
import { useFixtureMode } from '../context/FixtureContext';
import { ForecastRequest } from '../types/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { ErrorState } from '../components/ui/ErrorState';
import { StationSelector } from '../components/forecast/StationSelector';
import { ForecastControlPanel } from '../components/forecast/ForecastControlPanel';
import { ForecastChart } from '../components/forecast/ForecastChart';
import { ForecastMetricsPanel } from '../components/forecast/ForecastMetricsPanel';
import { ForecastReliabilityCard } from '../components/forecast/ForecastReliabilityCard';
import { ForecastDataTable } from '../components/forecast/ForecastDataTable';
import { HourlyProfileChart } from '../components/hourly/HourlyProfileChart';
import { TrendingUp, Clock, RotateCcw } from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const { useFixtures, toggleFixtures } = useFixtureMode();

  // 1. Fetch eligible stations inventory
  const {
    data: stationsData,
    isLoading: isStationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useStations({ eligible_for_simulation: true });

  const eligibleStations = stationsData?.stations.filter(
    (s) => s.eligible_for_simulation || s.in_study_area === 'yes'
  ) || [];

  const [selectedStationId, setSelectedStationId] = useState<string>('AMD001');

  // Sync station when eligible list loads
  useEffect(() => {
    if (eligibleStations.length > 0 && !eligibleStations.some((s) => s.station_id === selectedStationId)) {
      setSelectedStationId(eligibleStations[0].station_id);
    }
  }, [eligibleStations, selectedStationId]);

  // 2. Forecast Parameters State
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [model, setModel] = useState<'holt_winters' | 'rolling_mean_baseline'>('holt_winters');
  const [includeBaseline, setIncludeBaseline] = useState<boolean>(true);
  const [aggregation, setAggregation] = useState<'daily' | 'weekly'>('daily');

  // Tab switch between Main Forecast and Hourly Profile explorer
  const [activeTab, setActiveTab] = useState<'forecast' | 'hourly'>('forecast');

  // Hourly state
  const [hourlyStationId, setHourlyStationId] = useState<string>('AMD001');
  const [hourlyDate, setHourlyDate] = useState<string>('2025-12-15');

  // 3. Historical series for chosen station
  const {
    data: historyData,
    isLoading: isHistoryLoading,
  } = useHistory(selectedStationId, {
    aggregation,
  });

  // 4. Forecast API Query
  const forecastRequest: ForecastRequest = {
    station_id: selectedStationId,
    horizon_days: horizonDays,
    model,
    include_baseline: includeBaseline,
  };

  const {
    data: forecastData,
    isLoading: isForecastLoading,
    error: forecastError,
    refetch: refetchForecast,
  } = useForecast(forecastRequest);

  // 5. Hourly Demand Query
  const {
    data: hourlyData,
    isLoading: isHourlyLoading,
  } = useHourlyDemand({
    station_id: hourlyStationId,
    date: hourlyDate,
  });

  const handleRefreshAll = () => {
    refetchStations();
    refetchForecast();
  };

  return (
    <div className="space-y-6">
      {/* Dev Fixture Persistent Indicator */}
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
              Station-Level Demand Forecasting
            </h2>
            <Badge variant="teal">Feature B</Badge>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Multi-horizon seasonal forecasting (1–30 days) across 11 eligible Ahmedabad stations. Models trained on synthetic daily sales and evaluated on a strict chronological holdout split without random shuffling.
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

      {/* Historical Synthetic Demo Notice Banner (Defect 3.1) */}
      <div className="p-3.5 bg-blue-50/80 rounded-lg border border-blue-200/80 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-blue-950">
            Historical synthetic demo — source data ends 31 Dec 2025; forecast shown from 1 Jan 2026. Not a current operational forecast.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-blue-700 bg-white/80 px-2.5 py-1 rounded border border-blue-200 shrink-0">
          <span>Data Cutoff: 2025-12-31</span>
          <span>&rarr;</span>
          <span>Target Start: 2026-01-01</span>
        </div>
      </div>

      {/* Navigation Tabs (Forecast vs Diurnal Hourly Explorer) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-1.5 py-2 px-3.5 font-bold rounded-t transition-all ${
            activeTab === 'forecast'
              ? 'text-[#0F766E] border-b-2 border-[#0F766E] bg-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Demand Forecasting Engine
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hourly')}
          className={`flex items-center gap-1.5 py-2 px-3.5 font-bold rounded-t transition-all ${
            activeTab === 'hourly'
              ? 'text-[#0F766E] border-b-2 border-[#0F766E] bg-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Diurnal Hourly Demand Profiles (3 Stations)
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'forecast' ? (
        <div className="space-y-6">
          {/* Station Selection & Horizon Control Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card h-full flex flex-col justify-between">
                <StationSelector
                  stations={stationsData?.stations || []}
                  selectedStationId={selectedStationId}
                  onSelectStation={(id) => setSelectedStationId(id)}
                  isLoading={isStationsLoading}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <ForecastControlPanel
                horizonDays={horizonDays}
                onChangeHorizon={setHorizonDays}
                model={model}
                onChangeModel={setModel}
                includeBaseline={includeBaseline}
                onToggleBaseline={setIncludeBaseline}
                aggregation={aggregation}
                onChangeAggregation={setAggregation}
                isLoading={isForecastLoading}
                onRunForecast={refetchForecast}
              />
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

          {forecastError && !useFixtures && (
            <ErrorState
              title="Forecast Computation Error"
              code={forecastError.code}
              message={`${forecastError.message} Ensure Member 2's backend service is running on http://localhost:8000 and station ${selectedStationId} is eligible.`}
              onRetry={refetchForecast}
            />
          )}

          {/* Interactive Recharts Forecast Chart */}
          <ForecastChart
            forecastData={forecastData}
            historyPoints={historyData?.series || []}
            isLoading={isForecastLoading || isHistoryLoading}
            aggregation={aggregation}
            includeBaseline={includeBaseline}
          />

          {/* Model Evaluation Metrics Panel */}
          <ForecastMetricsPanel
            evaluation={
              forecastData?.evaluation || {
                baseline_model: 'rolling_mean_28d',
                baseline_mae_kg: 150.55,
                baseline_rmse_kg: 189.69,
                baseline_smape_pct: 11.41,
                model_mae_kg: null,
                model_rmse_kg: null,
                model_smape_pct: null,
                note: 'Metrics computed from synthetic data only. Do not claim real-world accuracy.',
              }
            }
            trainPeriod={
              forecastData?.train_period || {
                start: '2024-01-01',
                end: '2025-10-02',
                n_records: 641,
              }
            }
            testPeriod={
              forecastData?.test_period || {
                start: '2025-10-03',
                end: '2025-12-31',
                n_records: 90,
              }
            }
            modelUsed={forecastData?.model_used || model}
          />

          {/* Reliability Checklist & Limitations Notice */}
          {forecastData && (
            <ForecastReliabilityCard
              reliability={forecastData.reliability}
              limitations={forecastData.limitations}
            />
          )}

          {/* Tabular Ledger of Projected Points */}
          {forecastData && (
            <ForecastDataTable
              forecastPoints={forecastData.forecast}
              baselinePoints={forecastData.baseline_forecast}
              stationId={forecastData.station_id}
            />
          )}
        </div>
      ) : (
        /* Diurnal Hourly Profile Explorer */
        <div className="space-y-6">
          <HourlyProfileChart
            data={hourlyData}
            isLoading={isHourlyLoading}
            selectedStationId={hourlyStationId}
            onSelectStation={setHourlyStationId}
            selectedDate={hourlyDate}
            onSelectDate={setHourlyDate}
          />
        </div>
      )}
    </div>
  );
};
