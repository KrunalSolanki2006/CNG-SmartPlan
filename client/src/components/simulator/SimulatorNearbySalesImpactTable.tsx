import React from 'react';
import { AlertCircle, MapPin, TrendingDown } from 'lucide-react';
import { NearbyVerifiedStation, StationSalesImpactRow } from '../../types/candidates';

export interface SimulatorNearbySalesImpactTableProps {
  impactRows?: StationSalesImpactRow[];
  nearbyStations: NearbyVerifiedStation[];
  radiusKm: number;
  nearestOverallStation?: NearbyVerifiedStation | null;
  highlightedStationId?: string | null;
  onSelectStation?: (stationId: string) => void;
}

export const SimulatorNearbySalesImpactTable: React.FC<
  SimulatorNearbySalesImpactTableProps
> = ({
  impactRows,
  nearbyStations,
  radiusKm,
  nearestOverallStation,
  highlightedStationId,
  onSelectStation,
}) => {
  // Prefer backend-computed StationSalesImpactRow; fallback cleanly to spatial nearby rows
  const rows: StationSalesImpactRow[] =
    impactRows && impactRows.length > 0
      ? impactRows
      : nearbyStations.map((st, idx) => ({
          station_id: st.station_id,
          station_name: st.station_name,
          city: st.city,
          operator: st.operator,
          distance_km: st.distance_km,
          is_nearest: idx === 0,
          has_sales_data: Boolean(st.demand_data_available && st.historical_daily_demand_kg != null),
          sales_data_classification: st.demand_data_available
            ? 'Actual historical data'
            : 'Unavailable',
          current_daily_sales_kg: st.historical_daily_demand_kg ?? null,
          forecasted_daily_demand_kg: st.forecasted_daily_demand_kg ?? null,
          estimated_diversion_share: null,
          estimated_sales_loss_kg: null,
          remaining_daily_sales_kg: null,
          reduction_pct: null,
          loss_classification: 'Unavailable',
          capacity_available: false,
          daily_capacity_kg: null,
          status_label: 'VERIFIED',
        }));

  const rowsWithSales = rows.filter(
    (r) => r.has_sales_data && r.current_daily_sales_kg != null
  );
  const totalCurrent = rowsWithSales.reduce(
    (acc, r) => acc + (r.current_daily_sales_kg ?? 0),
    0
  );
  const totalLoss = rowsWithSales.reduce(
    (acc, r) => acc + (r.estimated_sales_loss_kg ?? 0),
    0
  );
  const totalRemaining = rowsWithSales.reduce(
    (acc, r) => acc + (r.remaining_daily_sales_kg ?? 0),
    0
  );

  return (
    <div
      data-testid="nearby-sales-impact-table"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
    >
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#0A9396]" />
            <h3 className="text-sm font-bold text-slate-900">
              Nearby Station Sales Impact
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Distance-decay customer diversion estimate across {rows.length} verified station(s) within{' '}
            {radiusKm} km.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#005F73] border border-teal-200 text-xs font-mono font-bold">
          {rows.length} Verified in {radiusKm} km
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="p-5">
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                No verified existing CNG stations found within {radiusKm} km.
              </p>
              {nearestOverallStation && (
                <p className="text-[11px] text-amber-800">
                  The nearest verified station in Gujarat is{' '}
                  <strong>{nearestOverallStation.station_name}</strong> at{' '}
                  <strong className="font-mono">
                    {nearestOverallStation.distance_km.toFixed(2)} km
                  </strong>
                  .
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold z-10">
              <tr>
                <th className="py-2.5 px-3">Existing Station</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Current Sales</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Est. Sales Loss</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Remaining Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r) => {
                const isHighlighted = highlightedStationId === r.station_id;
                return (
                  <tr
                    key={r.station_id}
                    onClick={() => onSelectStation?.(r.station_id)}
                    className={`transition-colors ${
                      onSelectStation ? 'cursor-pointer hover:bg-teal-50/50' : ''
                    } ${
                      r.is_nearest
                        ? 'bg-teal-50/50'
                        : isHighlighted
                        ? 'bg-blue-50/60'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {r.station_name}
                            </span>
                            {r.is_nearest && (
                              <span className="px-1.5 py-0.5 rounded bg-[#0B1320] text-[#5EEAD4] text-[10px] font-bold uppercase">
                                Nearest
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{r.city || 'Gujarat'}</span>
                            <span className="font-mono text-[#005F73] font-semibold">
                              {r.distance_km.toFixed(2)} km
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {r.has_sales_data && r.current_daily_sales_kg != null ? (
                        <div>
                          <div className="font-mono font-semibold text-slate-900">
                            {r.current_daily_sales_kg.toLocaleString()} kg/d
                          </div>
                          <div className="text-[10px] text-sky-700 font-medium">
                            Baseline (synthetic)
                          </div>
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                          Unavailable
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {r.has_sales_data && r.estimated_sales_loss_kg != null ? (
                        <div>
                          <div className="font-mono font-bold text-amber-800">
                            -{r.estimated_sales_loss_kg.toLocaleString()} kg/d
                          </div>
                          <div className="text-[10px] text-amber-700 font-mono">
                            {r.reduction_pct != null ? `-${r.reduction_pct.toFixed(1)}%` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                          Unavailable
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {r.has_sales_data && r.remaining_daily_sales_kg != null ? (
                        <div>
                          <div className="font-mono font-semibold text-slate-900">
                            {r.remaining_daily_sales_kg.toLocaleString()} kg/d
                          </div>
                          <div className="text-[10px] text-teal-700">Estimated</div>
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                          Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {rowsWithSales.length > 0 && (
              <tfoot className="bg-slate-100 border-t border-slate-200 font-bold text-slate-900 text-xs">
                <tr>
                  <td className="py-2.5 px-3">
                    Total ({rowsWithSales.length} station(s) with baseline)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {totalCurrent.toFixed(1)} kg/d
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    -{totalLoss.toFixed(1)} kg/d
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {totalRemaining.toFixed(1)} kg/d
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};
