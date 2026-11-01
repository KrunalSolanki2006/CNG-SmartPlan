import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sliders, RefreshCw, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useImpactSimulator } from '../hooks/useImpactSimulator';
import { ImpactSimulatorRequest } from '../types/api';
import { SimulatorInputsPanel } from '../components/simulator/SimulatorInputsPanel';
import { SimulatorResultsCards } from '../components/simulator/SimulatorResultsCards';
import { SimulatorWaterfallChart } from '../components/simulator/SimulatorWaterfallChart';
import { SimulatorFormulasPanel } from '../components/simulator/SimulatorFormulasPanel';
import { SimulatorGeographicDisclosure } from '../components/simulator/SimulatorGeographicDisclosure';

export const BENCHMARK_SIMULATOR_INPUTS: ImpactSimulatorRequest = {
  proposed_latitude: 23.05,
  proposed_longitude: 72.60,
  catchment_radius_km: 3.0,
  catchment_demand_kg_per_day: 5000.0,
  capture_proportion: 0.35,
  diversion_proportion: 0.60,
  accessibility_demand_kg_per_day: 0.0,
};

export const SimulatorPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Parse query parameters from Map page (?lat=...&lng=...)
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const hasMapCoords = Boolean(latParam && lngParam);

  const initialInputs = useMemo<ImpactSimulatorRequest>(() => {
    const lat = latParam ? parseFloat(latParam) : BENCHMARK_SIMULATOR_INPUTS.proposed_latitude;
    const lng = lngParam ? parseFloat(lngParam) : BENCHMARK_SIMULATOR_INPUTS.proposed_longitude;

    return {
      ...BENCHMARK_SIMULATOR_INPUTS,
      proposed_latitude: !isNaN(lat) ? lat : BENCHMARK_SIMULATOR_INPUTS.proposed_latitude,
      proposed_longitude: !isNaN(lng) ? lng : BENCHMARK_SIMULATOR_INPUTS.proposed_longitude,
    };
  }, [latParam, lngParam]);

  const [inputs, setInputs] = useState<ImpactSimulatorRequest>(initialInputs);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading, error, runSimulation, clearError, isFixtureData } = useImpactSimulator();

  // Automatically execute default simulation on initial load
  useEffect(() => {
    runSimulation(initialInputs);
  }, [runSimulation, initialInputs]);

  const handleInputChange = (newInputs: ImpactSimulatorRequest) => {
    setInputs(newInputs);
    setValidationError(null);
    clearError();
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
    setValidationError(null);
    runSimulation(BENCHMARK_SIMULATOR_INPUTS);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-[#0F172A]">
              New-Station Impact Simulator
            </h2>
            <Badge variant="synthetic">Signature Feature E</Badge>
            <DataOriginBadge origin="illustrative_scenario" size="sm" />
            {isFixtureData && (
              <Badge variant="warning" size="sm">
                Fixture Dev Mode Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Transparent decision-support scenario model evaluating whether a candidate station will capture incremental CNG volume or cannibalize sales from existing operating stations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRunSimulation(inputs)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Recalculate
          </Button>
        </div>
      </div>

      {/* Canonical Simulation Formulas (Preserved & Visible) */}
      <SimulatorFormulasPanel data={data} />

      {/* Main Grid: Inputs on Left, Results on Right */}
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
            <div className="p-4 rounded-card bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600" />
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
            <div className="p-12 rounded-card bg-white border border-[#DCE4E8] shadow-card flex flex-col items-center justify-center space-y-3">
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
            </>
          )}

          {!isLoading && !data && !error && (
            <div className="p-8 rounded-card bg-white border border-[#DCE4E8] text-center text-xs text-slate-500">
              <Sliders className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              Adjust inputs and click &ldquo;Calculate Network Impact Scenario&rdquo; to view results.
            </div>
          )}
        </div>
      </div>

      {/* Spatial Disclosure & Uncertainty Boundaries */}
      {data && <SimulatorGeographicDisclosure data={data} />}
    </div>
  );
};
