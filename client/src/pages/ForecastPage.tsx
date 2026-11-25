import React, { useState, useEffect } from 'react';
import { useStations } from '../hooks/useStations';
import { useForecast } from '../hooks/useForecast';
import { useHistory } from '../hooks/useHistory';
import { useHourlyDemand } from '../hooks/useHourlyDemand';
import { useFixtureMode } from '../context/FixtureContext';
import { ForecastRequest } from '../types/api';
import { ErrorState } from '../components/ui/ErrorState';
import { StationSelector } from '../components/forecast/StationSelector';
import { ForecastControlPanel } from '../components/forecast/ForecastControlPanel';
import { ForecastChart } from '../components/forecast/ForecastChart';
import { ForecastMetricsPanel } from '../components/forecast/ForecastMetricsPanel';
import { ForecastReliabilityCard } from '../components/forecast/ForecastReliabilityCard';
import { ForecastDataTable } from '../components/forecast/ForecastDataTable';
import { ForecastScenariosPanel, DemoScenarioId, ForecastScenarioConfig } from '../components/forecast/ForecastScenariosPanel';
import { HourlyProfileChart } from '../components/hourly/HourlyProfileChart';
import { MotionSection } from '../components/ui/MotionContainer';
import { TrendingUp, Clock } from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const { useFixtures } = useFixtureMode();

  // Tab State: Main Multi-Horizon Forecast vs. Diurnal Hourly Explorer
  const [activeTab, setActiveTab] = useState<'forecast' | 'hourly'>('forecast');

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

  // 2. Control panel parameters
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [model, setModel] = useState<'holt_winters' | 'rolling_mean_baseline'>('holt_winters');
  const [includeBaseline, setIncludeBaseline] = useState<boolean>(true);
  const [aggregation, setAggregation] = useState<'daily' | 'weekly'>('daily');

  // 3. Planning scenario preset state
  const [activeScenarioId, setActiveScenarioId] = useState<DemoScenarioId | null>(null);

  const handleSelectScenario = (scenario: ForecastScenarioConfig) => {
    setActiveScenarioId(scenario.id);
    setHorizonDays(scenario.horizonDays);
    setModel(scenario.model);
  };

  const handleClearScenario = () => {
    setActiveScenarioId(null);
  };

  // 4. Hourly profile station state
  const [hourlyStationId, setHourlyStationId] = useState<string>('AMD001');
  const [hourlyDate, setHourlyDate] = useState<string>('2025-12-15');

  // 4. Historical Demand Query (for actual series overlay)
  const {
    data: historyData,
    isLoading: isHistoryLoading,
  } = useHistory(selectedStationId, {
    start_date: '2025-08-01',
    end_date: '2025-10-02',
  });

  // 5. Forecast Query
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



  const meanDailyDemandKg = forecastData?.forecast?.length
    ? forecastData.forecast.reduce((sum, p) => sum + p.forecast_demand_kg, 0) / forecastData.forecast.length
    : null;

  return (
    <div className="space-y-6">
      {/* Header & Planning Context */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  Predictive Analytics
                </span>
                <span className="text-xs text-slate-500 font-medium">Gujarat Gas Company Ltd. • Ahmedabad</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Station-Level Demand Forecasting
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-1">
                Multi-horizon seasonal forecasting (1–30 days) across operational Ahmedabad CNG stations powered by double-seasonal Holt-Winters and chronological baseline models.
              </p>
            </div>


          </div>
        </div>
      </MotionSection>

      {/* Navigation Tabs (Forecast vs Diurnal Hourly Explorer) */}
      <MotionSection delay={0.1}>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs max-w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'forecast'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Demand Forecasting Engine
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hourly')}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'hourly'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Clock className="w-4 h-4 text-[#005F73]" />
            Diurnal Hourly Demand Profiles (3 Stations)
          </button>
        </div>
      </MotionSection>

      {/* Main Tab Content */}
      {activeTab === 'forecast' ? (
        <div className="space-y-6">
          {/* Demonstration Planning Presets */}
          <MotionSection delay={0.12}>
            <ForecastScenariosPanel
              activeScenarioId={activeScenarioId}
              onSelectScenario={handleSelectScenario}
              onClearScenario={handleClearScenario}
              meanDailyDemandKg={meanDailyDemandKg}
            />
          </MotionSection>

          {/* Station Selection & Horizon Control Panels */}
          <MotionSection delay={0.15}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs h-full flex flex-col justify-between">
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

          {forecastError && !useFixtures && (
            <ErrorState
              title="Forecast Computation Error"
              code={forecastError.code}
              message={`${forecastError.message} Ensure Member 2's backend service is running on http://localhost:8000 and station ${selectedStationId} is eligible.`}
              onRetry={refetchForecast}
            />
          )}

          {/* Interactive Recharts Forecast Chart */}
          <MotionSection delay={0.18}>
            <ForecastChart
              forecastData={forecastData}
              historyPoints={historyData?.series || []}
              isLoading={isForecastLoading || isHistoryLoading}
              aggregation={aggregation}
              includeBaseline={includeBaseline}
            />
          </MotionSection>

          {/* Model Evaluation Metrics Panel */}
          <MotionSection delay={0.21}>
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
          </MotionSection>

          {/* Reliability Checklist & Limitations Notice */}
          {forecastData && (
            <MotionSection delay={0.24}>
              <ForecastReliabilityCard
                reliability={forecastData.reliability}
                limitations={forecastData.limitations}
              />
            </MotionSection>
          )}

          {/* Tabular Ledger of Projected Points */}
          {forecastData && (
            <MotionSection delay={0.27}>
              <ForecastDataTable
                forecastPoints={forecastData.forecast}
                baselinePoints={forecastData.baseline_forecast}
                stationId={forecastData.station_id}
              />
            </MotionSection>
          )}
        </div>
      ) : (
        /* Diurnal Hourly Profile Explorer */
        <MotionSection delay={0.15}>
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
        </MotionSection>
      )}
    </div>
  );
};
