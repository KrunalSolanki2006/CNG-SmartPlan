import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export type DemoScenarioId = 'normal_supply' | 'reduced_supply' | 'high_demand';

export interface ForecastScenarioConfig {
  id: DemoScenarioId;
  name: string;
  tagline: string;
  horizonDays: number;
  model: 'holt_winters' | 'rolling_mean_baseline';
  assumedSupplyKgPerDay: number;
  demandMultiplier: number;
  description: string;
  expectedOutcome: string;
}

export const FORECAST_SCENARIOS: ForecastScenarioConfig[] = [
  {
    id: 'normal_supply',
    name: '1. Normal Supply Benchmark',
    tagline: 'Standard Pipeline Delivery (1,800 kg/day)',
    horizonDays: 7,
    model: 'holt_winters',
    assumedSupplyKgPerDay: 1800,
    demandMultiplier: 1.0,
    description: 'Calibrated seasonal baseline matching standard GGCL pipeline allocations across the evaluation horizon.',
    expectedOutcome: 'Demand satisfied with nominal operating reserves; zero planning shortfalls.',
  },
  {
    id: 'reduced_supply',
    name: '2. Constrained Delivery Stress Test',
    tagline: 'Restricted Pipeline Delivery (1,100 kg/day, -39%)',
    horizonDays: 14,
    model: 'holt_winters',
    assumedSupplyKgPerDay: 1100,
    demandMultiplier: 1.0,
    description: 'Simulates upstream compression curtailment or pipeline maintenance to identify potential planning deficits.',
    expectedOutcome: 'Triggers theoretical planning shortfall alerts to guide priority delivery allocations.',
  },
  {
    id: 'high_demand',
    name: '3. Seasonal Peak Demand Surge',
    tagline: 'Festive / Winter Peak Fleet Trajectory (+25%)',
    horizonDays: 7,
    model: 'holt_winters',
    assumedSupplyKgPerDay: 1800,
    demandMultiplier: 1.25,
    description: 'Models acute seasonal vehicle volume surge across commercial three-wheelers and taxis to test compressor throughput.',
    expectedOutcome: 'Evaluates maximum dispenser throughput limits and queue build-up risks.',
  },
];

interface ForecastScenariosPanelProps {
  activeScenarioId: DemoScenarioId | null;
  onSelectScenario: (scenario: ForecastScenarioConfig) => void;
  onClearScenario: () => void;
  meanDailyDemandKg?: number | null;
}

export const ForecastScenariosPanel: React.FC<ForecastScenariosPanelProps> = ({
  activeScenarioId,
  onSelectScenario,
  onClearScenario,
  meanDailyDemandKg,
}) => {
  const navigate = useNavigate();
  const activeScenario = FORECAST_SCENARIOS.find((s) => s.id === activeScenarioId);

  return (
    <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="icon-box-teal shrink-0">
              <Sparkles className="w-4 h-4 text-[#005F73]" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Demonstration Planning Scenarios
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            One-click parameter presets for evaluator review
          </span>
        </div>

        {/* 3 Scenario Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FORECAST_SCENARIOS.map((scenario) => {
            const isSelected = activeScenarioId === scenario.id;
            return (
              <div
                key={scenario.id}
                onClick={() => onSelectScenario(scenario)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-xs text-left ${
                  isSelected
                    ? 'border-[#0A9396] bg-[#EAF6F2] shadow-xs ring-1 ring-[#0A9396]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-900">{scenario.name}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-[#005F73] bg-[#94D2BD]/30 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#005F73] block mb-1.5">
                    {scenario.tagline}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Horizon: {scenario.horizonDays}d</span>
                  <span>Supply: {scenario.assumedSupplyKgPerDay} kg/d</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Scenario Evaluation Strip */}
        {activeScenario && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-[#0A9396]" />
                <span>Active Evaluation: {activeScenario.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/alerts')}
                  className="text-xs text-[#005F73] hover:text-[#0A9396]"
                >
                  Manage Supply Overrides &rarr;
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearScenario}
                  className="text-xs"
                >
                  Reset Parameters
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block font-medium">Model Demand</span>
                <span className="text-slate-900 font-bold">
                  {meanDailyDemandKg ? `${(meanDailyDemandKg * activeScenario.demandMultiplier).toFixed(1)} kg/day` : 'Computed dynamically'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block font-medium">Planned Supply</span>
                <span className="text-slate-900 font-bold">
                  {activeScenario.assumedSupplyKgPerDay} kg/day
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block font-medium">Evaluation Period</span>
                <span className="text-slate-900 font-bold">
                  {activeScenario.horizonDays} Calendar Days
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block font-medium">Supply Status</span>
                <span className={`font-bold ${
                  activeScenario.id === 'reduced_supply' ? 'text-[#BB3E03]' : 'text-[#005F73]'
                }`}>
                  {activeScenario.id === 'reduced_supply' ? 'Deficit Warning' : 'Adequate Supply'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#EAF6F2] border border-[#0A9396]/20 text-[11px] text-[#005F73]">
              <strong>Expected Planning Outcome:</strong> {activeScenario.expectedOutcome}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
