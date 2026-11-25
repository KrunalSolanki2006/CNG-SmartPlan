import React from 'react';
import { Table, Sparkles, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface SimulatorSensitivityTableProps {
  catchmentDemand: number;
  accessibilityDemand?: number;
  currentCapture: number;
  currentDiversion: number;
  onSelectScenario?: (capture: number, diversion: number) => void;
}

const CAPTURE_RATES = [0.20, 0.35, 0.50, 0.81];
const DIVERSION_RATES = [0.40, 0.60, 0.80];

export const SimulatorSensitivityTable: React.FC<SimulatorSensitivityTableProps> = ({
  catchmentDemand,
  accessibilityDemand = 0,
  currentCapture,
  currentDiversion,
  onSelectScenario,
}) => {
  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#EAF6F2] text-[#005F73]">
            <Table className="w-4 h-4 text-[#0A9396]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Sensitivity Analysis Matrix (Capture vs Diversion)
            </h3>
            <p className="text-[11px] text-slate-500">
              Evaluates net incremental network demand across 12 combinations of capture rate and network cannibalization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="teal" size="sm">
            Catchment: {catchmentDemand.toLocaleString()} kg/day
          </Badge>
          <Badge variant="neutral" size="sm">
            12 Scenarios
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="py-2.5 px-3 font-semibold text-slate-900">
                Capture Rate \ Cannibalization
              </th>
              {DIVERSION_RATES.map((div) => (
                <th key={div} className="py-2.5 px-3 text-center font-semibold text-slate-900">
                  <div>{(div * 100).toFixed(0)}% Diversion</div>
                  <span className="text-[10px] font-normal text-slate-500">
                    {div === 0.40 ? 'Low Cannibalization' : div === 0.60 ? 'Benchmark Baseline' : 'High Cannibalization'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECE6D9]">
            {CAPTURE_RATES.map((cap) => {
              return (
                <tr key={cap} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-900 bg-slate-50/50">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#005F73]">{(cap * 100).toFixed(0)}% Capture</span>
                      {cap === 0.35 && (
                        <span className="text-[10px] bg-[#E3DDCE] text-slate-900 px-1.5 py-0.2 rounded font-mono">
                          Standard
                        </span>
                      )}
                      {cap === 0.81 && (
                        <span className="text-[10px] bg-[#EAF6F2] text-[#005F73] px-1.5 py-0.2 rounded font-mono font-bold border border-[#94D2BD]/60">
                          Benchmark
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Gross: {Math.round((catchmentDemand * cap) + accessibilityDemand).toLocaleString()} kg/d
                    </span>
                  </td>

                  {DIVERSION_RATES.map((div) => {
                    const proposed = (catchmentDemand * cap) + accessibilityDemand;
                    const diverted = proposed * div;
                    const netAdditional = proposed - diverted;

                    const isSelected =
                      Math.abs(currentCapture - cap) < 0.04 &&
                      Math.abs(currentDiversion - div) < 0.04;

                    return (
                      <td
                        key={div}
                        onClick={() => onSelectScenario && onSelectScenario(cap, div)}
                        className={`py-3 px-3 text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EAF6F2] ring-2 ring-[#0A9396] rounded-xl font-bold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-xs font-mono ${isSelected ? 'text-[#005F73] font-bold' : 'text-slate-900'}`}>
                              +{Math.round(netAdditional).toLocaleString()} kg/d
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#0A9396]" />
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono">
                            Diverted: {Math.round(diverted).toLocaleString()} kg
                          </div>

                          {isSelected && (
                            <span className="inline-block text-[9px] uppercase tracking-wider text-[#005F73] font-bold bg-white px-1.5 py-0.2 rounded border border-[#94D2BD]/60">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0A9396]" />
          <span>Click any matrix cell above to instantly load that scenario into the simulator.</span>
        </span>
        <span className="font-mono text-slate-500">
          Formula: Net = Proposed &minus; (Proposed &times; Diversion)
        </span>
      </div>
    </div>
  );
};
