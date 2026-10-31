import React, { useState } from 'react';
import { SupplyComparisonPoint } from '../../types/api';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SupplyComparisonTableProps {
  comparison: SupplyComparisonPoint[];
  stationId: string;
}

export const SupplyComparisonTable: React.FC<SupplyComparisonTableProps> = ({
  comparison,
  stationId,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'shortfall_only' | 'balanced_only'>('all');

  const filteredPoints = comparison.filter((point) => {
    if (filterMode === 'shortfall_only') {
      return point.has_shortfall === true;
    }
    if (filterMode === 'balanced_only') {
      return point.has_shortfall === false;
    }
    return true;
  });

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#0F766E]" />
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Daily Supply-Demand Balance Ledger ({stationId})
          </h3>
        </div>

        {/* Filter controls based on contract-returned has_shortfall field */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium mr-1">Status Filter:</span>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`py-1 px-2.5 rounded font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({comparison.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('shortfall_only')}
            className={`py-1 px-2.5 rounded font-medium transition-colors ${
              filterMode === 'shortfall_only'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Shortfall Only
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('balanced_only')}
            className={`py-1 px-2.5 rounded font-medium transition-colors ${
              filterMode === 'balanced_only'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Balanced Only
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#0F172A]">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Target Date</th>
              <th className="py-2.5 px-3 text-right">Forecast Demand</th>
              <th className="py-2.5 px-3 text-right">Planned Supply</th>
              <th className="py-2.5 px-3 text-right">Potential Shortfall</th>
              <th className="py-2.5 px-3 text-center">Balance Status</th>
              <th className="py-2.5 px-3 text-center">Data Origin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPoints.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-xs text-slate-500">
                  No dates matching the selected status filter.
                </td>
              </tr>
            ) : (
              filteredPoints.map((point) => {
                const isShortfall = point.has_shortfall === true;
                const isUnavailable = point.planned_supply_kg === null;

                return (
                  <tr
                    key={point.date}
                    className={`transition-colors ${
                      isShortfall ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono font-medium text-slate-800">
                      {point.date}
                    </td>

                    <td className="py-2 px-3 text-right font-mono font-bold text-[#2563EB]">
                      {point.forecast_demand_kg.toLocaleString()} kg/day
                    </td>

                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {point.planned_supply_kg !== null ? (
                        `${point.planned_supply_kg.toLocaleString()} kg/day`
                      ) : (
                        <span className="text-amber-700 italic text-[11px]">
                          Unavailable (Post-2025)
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right font-mono">
                      {point.potential_shortfall_kg !== null ? (
                        point.potential_shortfall_kg > 0 ? (
                          <span className="font-bold text-red-600">
                            +{point.potential_shortfall_kg.toLocaleString()} kg/day
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">0.0 kg/day</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-center">
                      {isUnavailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Override Needed
                        </span>
                      ) : isShortfall ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          Shortfall
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Balanced
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <DataOriginBadge origin={point.supply_data_origin} size="sm" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
