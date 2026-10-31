import React from 'react';
import { ForecastPoint } from '../../types/api';
import { Badge } from '../ui/Badge';
import { FileSpreadsheet } from 'lucide-react';

interface ForecastDataTableProps {
  forecastPoints: ForecastPoint[];
  baselinePoints: ForecastPoint[];
  stationId: string;
}

export const ForecastDataTable: React.FC<ForecastDataTableProps> = ({
  forecastPoints,
  baselinePoints,
  stationId,
}) => {
  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#0F766E]" />
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Tabular Forecast Ledger ({stationId})
          </h3>
        </div>
        <span className="text-[11px] text-[#64748B]">
          {forecastPoints.length} Daily Projections
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#0F172A]">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Target Date</th>
              <th className="py-2.5 px-3">Day</th>
              <th className="py-2.5 px-3 text-right">Forecast Demand</th>
              <th className="py-2.5 px-3 text-right">Lower Bound</th>
              <th className="py-2.5 px-3 text-right">Upper Bound</th>
              <th className="py-2.5 px-3 text-right">28d Baseline</th>
              <th className="py-2.5 px-3 text-center">Model</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {forecastPoints.map((point) => {
              const baseline = baselinePoints.find((b) => b.date === point.date);
              const day = getDayName(point.date);
              const isWeekend = day === 'Sun' || day === 'Sat';

              return (
                <tr key={point.date} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-slate-800">
                    {point.date}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        isWeekend ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-[#2563EB]">
                    {point.forecast_demand_kg.toLocaleString()} kg/day
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {point.lower_bound_kg !== null
                      ? `${point.lower_bound_kg.toLocaleString()} kg/day`
                      : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {point.upper_bound_kg !== null
                      ? `${point.upper_bound_kg.toLocaleString()} kg/day`
                      : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500">
                    {baseline ? `${baseline.forecast_demand_kg.toLocaleString()} kg/day` : '—'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant="neutral" size="sm">
                      {point.model}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
