import React, { useState, useEffect } from 'react';
import {
  useForecast,
  useForecastStations,
} from '../hooks/useForecast';
import { useHourlyDemand } from '../hooks/useHourlyDemand';
import { useFixtureMode } from '../context/FixtureContext';
import { ForecastRequest } from '../types/api';
import { ErrorState } from '../components/ui/ErrorState';
import { StationSelector } from '../components/forecast/StationSelector';
import { ForecastControlPanel } from '../components/forecast/ForecastControlPanel';
import { ForecastSummaryMetrics } from '../components/forecast/ForecastSummaryMetrics';
import { ForecastChart } from '../components/forecast/ForecastChart';
import { ForecastDataTable } from '../components/forecast/ForecastDataTable';
import { HourlyProfileChart } from '../components/hourly/HourlyProfileChart';
import { MotionSection } from '../components/ui/MotionContainer';
import { TrendingUp, Clock, FlaskConical } from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const { useFixtures } = useFixtureMode();

  // Tab State: Main Multi-Horizon Forecast vs. Diurnal Hourly Explorer
  const [activeTab, setActiveTab] = useState<'forecast' | 'hourly'>('forecast');

  // 1. Fetch all 151 eligible verified Gujarat stations from backend
  const {
    data: stationsData,
    isLoading: isStationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useForecastStations();

  const eligibleStations = stationsData?.stations || [];
  const [selectedStationId, setSelectedStationId] = useState<string>('AMD001');

  useEffect(() => {
    if (
      eligibleStations.length > 0 &&
      !eligibleStations.some((s) => s.station_id === selectedStationId)
    ) {
      setSelectedStationId(eligibleStations[0].station_id);
    }
  }, [eligibleStations, selectedStationId]);

  // 2. Forecast parameters (7d, 14d, 30d horizons)
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [model, setModel] = useState<'holt_winters' | 'rolling_mean_baseline'>('holt_winters');
  const [includeBaseline, setIncludeBaseline] = useState<boolean>(true);

  // 3. Hourly profile state (defaults to current IST date)
  const [hourlyStationId, setHourlyStationId] = useState<string>('AMD001');
  const [hourlyDate, setHourlyDate] = useState<string>(() => {
    const now = new Date();
    const istMs = now.getTime() + (330 + now.getTimezoneOffset()) * 60000;
    return new Date(istMs).toISOString().slice(0, 10);
  });

  // 4. Station Forecast Query
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

  return (
    <div className="space-y-6">
      {/* Header with Persistent Synthetic Notice */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  Station Demand Analytics
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-bold tracking-wide uppercase text-purple-800">
                  <FlaskConical className="w-3 h-3" />
                  SIMULATED DATA — DEMONSTRATION ONLY
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Gujarat Gas Network • {eligibleStations.length || 151} Verified Stations
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Station-Level Demand Forecasting
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-1">
                Station-level CNG demand forecasting (7, 14, or 30 days) using additive Holt-Winters (7-day weekly seasonality) and 28-day rolling mean chronological validation.
              </p>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Navigation Tabs */}
      <MotionSection delay={0.08}>
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
            Diurnal Hourly Demand Profiles ({eligibleStations.length || 151} Stations)
          </button>
        </div>
      </MotionSection>

      {activeTab === 'forecast' ? (
        <div className="space-y-6">
          {/* Station Selection & Forecast Parameters */}
          <MotionSection delay={0.1}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs h-full flex flex-col justify-between">
                  <StationSelector
                    stations={eligibleStations}
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
              message={`${forecastError.message} Ensure the FastAPI service is running on http://localhost:8000 and station ${selectedStationId} is eligible.`}
              onRetry={refetchForecast}
            />
          )}

          {/* Important Metrics (4 KPIs) */}
          <MotionSection delay={0.14}>
            <ForecastSummaryMetrics forecastData={forecastData} isLoading={isForecastLoading} />
          </MotionSection>

          {/* Main Historical vs. Forecasted Demand Chart */}
          <MotionSection delay={0.18}>
            <ForecastChart
              forecastData={forecastData}
              historyPoints={forecastData?.historical_context}
              isLoading={isForecastLoading}
              includeBaseline={includeBaseline}
            />
          </MotionSection>

          {/* Tabular Forecast Ledger */}
          {forecastData && forecastData.forecast.length > 0 && (
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
        <MotionSection delay={0.15}>
          <div className="space-y-6">
            <HourlyProfileChart
              data={hourlyData}
              isLoading={isHourlyLoading}
              selectedStationId={hourlyStationId}
              onSelectStation={setHourlyStationId}
              selectedDate={hourlyDate}
              onSelectDate={setHourlyDate}
              stations={eligibleStations}
            />
          </div>
        </MotionSection>
      )}
    </div>
  );
};
