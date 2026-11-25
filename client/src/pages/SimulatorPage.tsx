import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sliders, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useImpactSimulator } from '../hooks/useImpactSimulator';
import { ImpactSimulatorRequest } from '../types/api';
import { SimulatorInputsPanel } from '../components/simulator/SimulatorInputsPanel';
import { SimulatorResultsCards } from '../components/simulator/SimulatorResultsCards';
import { SimulatorWaterfallChart } from '../components/simulator/SimulatorWaterfallChart';
import { SimulatorSensitivityTable } from '../components/simulator/SimulatorSensitivityTable';
import { ScenarioPersistenceBar } from '../components/simulator/ScenarioPersistenceBar';
import { SimulatorRoadAccessibility } from '../components/simulator/SimulatorRoadAccessibility';
import { MotionSection } from '../components/ui/MotionContainer';

export const BENCHMARK_SIMULATOR_INPUTS: ImpactSimulatorRequest = {
  proposed_latitude: 23.05,
  proposed_longitude: 72.60,
  catchment_radius_km: 3.0,
  catchment_demand_kg_per_day: 5000.0,
  capture_proportion: 0.35,
  diversion_proportion: 0.60,
  accessibility_demand_kg_per_day: 0.0,
};

const STORAGE_KEY_ACTIVE_SCENARIO = 'cng_simulator_active_scenario';

export const SimulatorPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Parse query parameters from Map page (?lat=...&lng=...)
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const hasMapCoords = Boolean(latParam && lngParam);

  const [activeScenarioName, setActiveScenarioName] = useState<string>('Default Benchmark');

  const initialInputs = useMemo<ImpactSimulatorRequest>(() => {
    // If explicit coordinates in URL from Map page, use those
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      return {
        ...BENCHMARK_SIMULATOR_INPUTS,
        proposed_latitude: !isNaN(lat) ? lat : BENCHMARK_SIMULATOR_INPUTS.proposed_latitude,
        proposed_longitude: !isNaN(lng) ? lng : BENCHMARK_SIMULATOR_INPUTS.proposed_longitude,
      };
    }

    // Otherwise check for persistent active scenario in localStorage
    try {
      const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_SCENARIO);
      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        if (parsed && typeof parsed.proposed_latitude === 'number') {
          return parsed;
        }
      }
    } catch {
      // fallback
    }

    return BENCHMARK_SIMULATOR_INPUTS;
  }, [latParam, lngParam]);

  const [inputs, setInputs] = useState<ImpactSimulatorRequest>(initialInputs);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading, error, runSimulation, clearError } = useImpactSimulator();

  // Automatically execute default simulation on initial load
  useEffect(() => {
    runSimulation(initialInputs);
  }, [runSimulation, initialInputs]);

  const handleInputChange = (newInputs: ImpactSimulatorRequest) => {
    setInputs(newInputs);
    setValidationError(null);
    clearError();
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SCENARIO, JSON.stringify(newInputs));
    } catch {
      // ignore
    }
  };

  const handleRunSimulation = useCallback(
    async (requestToRun: ImpactSimulatorRequest) => {
      setValidationError(null);
      await runSimulation(requestToRun);
    },
    [runSimulation]
  );

  const handleResetToBenchmark = () => {
    setInputs(BENCHMARK_SIMULATOR_INPUTS);
    setActiveScenarioName('Default Benchmark');
    setValidationError(null);
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SCENARIO);
    } catch {
      // ignore
    }
    runSimulation(BENCHMARK_SIMULATOR_INPUTS);
  };

  const handleLoadSavedScenario = (savedInputs: ImpactSimulatorRequest, name: string) => {
    setInputs(savedInputs);
    setActiveScenarioName(name);
    setValidationError(null);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SCENARIO, JSON.stringify(savedInputs));
    } catch {
      // ignore
    }
    runSimulation(savedInputs);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  Network Capital Planning
                </span>
                <span className="text-xs text-slate-500 font-medium">Gujarat Gas Company Ltd. • Ahmedabad</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                New-Station Impact Simulator
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-1">
                Transparent decision-support scenario model evaluating whether a candidate station will capture incremental CNG volume or cannibalize sales from existing operating stations.
              </p>
            </div>


          </div>
        </div>
      </MotionSection>

      {/* Scenario Persistence & Export Bar */}
      <MotionSection delay={0.08}>
        <ScenarioPersistenceBar
          currentInputs={inputs}
          currentResults={data}
          onLoadScenario={handleLoadSavedScenario}
          onResetToBenchmark={handleResetToBenchmark}
          activeScenarioName={activeScenarioName}
          setActiveScenarioName={setActiveScenarioName}
        />
      </MotionSection>


      {/* Main Grid: Inputs on Left, Results on Right */}
      <MotionSection delay={0.15}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Scenario Controls */}
          <div className="lg:col-span-5 space-y-4">
            <SimulatorInputsPanel
              inputs={inputs}
              onChange={handleInputChange}
              onSubmit={handleRunSimulation}
              onReset={handleResetToBenchmark}
              isLoading={isLoading}
              validationError={validationError || (error?.status === 422 ? error.message : null)}
              fromMap={hasMapCoords}
            />
          </div>

          {/* Right Column: Calculated Results & Demand Visualizer */}
          <div className="lg:col-span-7 space-y-5">
            {error && error.status !== 422 && (
              <div className="p-4 rounded-2xl bg-[#FDF0EE] border border-[#F5C2BC] text-xs text-[#AE2012] space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-[#AE2012]" />
                  <span>Simulation Service Unavailable</span>
                </div>
                <p>{error.message || 'Unable to compute simulation. Check backend connection.'}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunSimulation(inputs)}
                  className="mt-2"
                >
                  Retry Simulation
                </Button>
              </div>
            )}

            {isLoading && !data && (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-3">
                <Spinner size="lg" />
                <p className="text-xs text-slate-500 font-medium">Computing scenario demand model...</p>
              </div>
            )}

            {data && (
              <>
                {/* Primary Metric Cards */}
                <SimulatorResultsCards data={data} />

                {/* Demand Flow / Waterfall Chart */}
                <SimulatorWaterfallChart data={data} />

                {/* Multi-scenario Sensitivity Matrix (Defect 3.6) */}
                <SimulatorSensitivityTable
                  catchmentDemand={inputs.catchment_demand_kg_per_day}
                  accessibilityDemand={inputs.accessibility_demand_kg_per_day}
                  currentCapture={inputs.capture_proportion}
                  currentDiversion={inputs.diversion_proportion}
                  onSelectScenario={(cap, div) => {
                    const updated = {
                      ...inputs,
                      capture_proportion: cap,
                      diversion_proportion: div,
                    };
                    setInputs(updated);
                    runSimulation(updated);
                  }}
                />

                {/* Google Maps Road Accessibility & Detour Ratio Analysis */}
                <SimulatorRoadAccessibility
                  proposedLat={inputs.proposed_latitude}
                  proposedLng={inputs.proposed_longitude}
                  onApplyRecommendation={(recAcc, recCap) => {
                    const updated = {
                      ...inputs,
                      accessibility_demand_kg_per_day: recAcc,
                      capture_proportion: recCap,
                    };
                    handleInputChange(updated);
                    runSimulation(updated);
                  }}
                />
              </>
            )}

            {!isLoading && !data && !error && (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                <Sliders className="w-6 h-6 mx-auto mb-2 text-slate-500/60" />
                Adjust inputs and click &ldquo;Calculate Network Impact Scenario&rdquo; to view results.
              </div>
            )}
          </div>
        </div>
      </MotionSection>
    </div>
  );
};
