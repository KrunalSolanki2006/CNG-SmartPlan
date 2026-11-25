import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GitCompare, Info } from 'lucide-react';
import { NetworkImpactSimulationResponse } from '../../types/candidates';

export interface SimulatorExistingVsProposedTableProps {
  simulation: NetworkImpactSimulationResponse;
}

function ProvenanceBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'actual' | 'estimate' | 'input' | 'unavailable';
}) {
  const cls =
    tone === 'actual'
      ? 'bg-sky-50 text-sky-800 border-sky-200'
      : tone === 'estimate'
      ? 'bg-teal-50 text-teal-800 border-teal-200'
      : tone === 'input'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export const SimulatorExistingVsProposedTable: React.FC<
  SimulatorExistingVsProposedTableProps
> = ({ simulation }) => {
  const de = simulation.demand_estimate;
  const gm = simulation.geographical_metrics;
  const proposed = simulation.proposed_station;
  const rows = simulation.station_impact_rows ?? [];
  const nearestWithin = gm.nearest_within_radius;
  const nearestOverall = gm.nearest_station;
  const nearestRef = nearestWithin ?? nearestOverall;

  const nearestRow = rows.find((r) => r.station_id === nearestRef?.station_id);
  const withSalesRows = rows.filter((r) => r.has_sales_data && r.current_daily_sales_kg != null);

  const chartData =
    de?.available && de.potential_daily_sales_kg != null
      ? [
          {
            name: 'Proposed (Est.)',
            kgPerDay: de.potential_daily_sales_kg,
            fill: '#0A9396',
          },
          ...withSalesRows.slice(0, 5).map((r) => ({
            name:
              r.station_name.length > 18
                ? `${r.station_name.slice(0, 17)}…`
                : r.station_name,
            kgPerDay: r.current_daily_sales_kg ?? 0,
            fill: r.is_nearest ? '#2563EB' : '#64748B',
          })),
        ]
      : [];

  return (
    <div
      data-testid="existing-vs-proposed-comparison"
      className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden"
    >
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-[#0A9396]" />
          <h2 className="text-sm font-bold text-slate-900">
            Existing vs Proposed Station Comparison
          </h2>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Compares proposed location against {gm.nearby_verified_count} nearby verified station(s) within{' '}
          {simulation.radius_km} km
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
              <th className="py-2.5 px-4 w-44">Parameter</th>
              <th className="py-2.5 px-4">Proposed Station</th>
              <th className="py-2.5 px-4">Existing Nearby Stations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-800">Station Status</td>
              <td className="py-2.5 px-4">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                  PROPOSED
                </span>
              </td>
              <td className="py-2.5 px-4">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[11px]">
                  VERIFIED ({gm.nearby_verified_count} within {simulation.radius_km} km)
                </span>
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-800">Location</td>
              <td className="py-2.5 px-4 text-slate-800">
                <div className="font-medium">
                  {proposed.location_label || proposed.name || 'Selected Proposed Location'}
                </div>
                <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                  {proposed.latitude.toFixed(5)}°N, {proposed.longitude.toFixed(5)}°E
                </div>
              </td>
              <td className="py-2.5 px-4 text-slate-800">
                {nearestRef ? (
                  <div>
                    <div className="font-medium">
                      Nearest: {nearestRef.station_name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {nearestRef.city}
                      {nearestRef.district ? `, ${nearestRef.district}` : ''}
                    </div>
                  </div>
                ) : (
                  <ProvenanceBadge label="Unavailable" tone="unavailable" />
                )}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-800">Distance</td>
              <td className="py-2.5 px-4 text-slate-700">
                <span className="font-mono font-semibold text-emerald-700">Reference Point (0.00 km)</span>
              </td>
              <td className="py-2.5 px-4 text-slate-800">
                {nearestRef ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[#005F73]">
                      Nearest: {nearestRef.distance_km.toFixed(2)} km
                    </span>
                    {gm.average_nearby_distance_km != null && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        (Avg in radius: {gm.average_nearby_distance_km.toFixed(2)} km)
                      </span>
                    )}
                    <ProvenanceBadge label="Haversine geodesic" tone="actual" />
                  </div>
                ) : (
                  <ProvenanceBadge label="Unavailable" tone="unavailable" />
                )}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-800">Daily Demand</td>
              <td className="py-2.5 px-4">
                {de?.available && de.potential_daily_demand_kg != null ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {de.potential_daily_demand_kg.toLocaleString()} kg/day
                    </span>
                    <ProvenanceBadge label="Model-based estimate" tone="estimate" />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <ProvenanceBadge label="Insufficient Data" tone="unavailable" />
                    <span className="text-[11px] text-slate-500">
                      Requires nearby station demand baseline
                    </span>
                  </div>
                )}
              </td>
              <td className="py-2.5 px-4">
                {nearestRow?.has_sales_data && nearestRow.forecasted_daily_demand_kg != null ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">
                        Nearest forecast: {nearestRow.forecasted_daily_demand_kg.toLocaleString()} kg/day
                      </span>
                      <ProvenanceBadge label="Forecasted value (synthetic)" tone="actual" />
                    </div>
                    {de?.avg_nearby_daily_sales_kg != null && (
                      <div className="text-[11px] text-slate-500">
                        Nearby baseline mean ({de.nearby_with_sales_count} stations):{' '}
                        <span className="font-mono font-medium">
                          {de.avg_nearby_daily_sales_kg.toLocaleString()} kg/day
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <ProvenanceBadge label="Unavailable" tone="unavailable" />
                    <span className="text-[11px] text-slate-500">
                      No station-level demand records for nearby corridor
                    </span>
                  </div>
                )}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-800">Daily Sales</td>
              <td className="py-2.5 px-4">
                {de?.available && de.potential_daily_sales_kg != null ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {de.potential_daily_sales_kg.toLocaleString()} kg/day
                    </span>
                    <ProvenanceBadge label="Model-based estimate" tone="estimate" />
                  </div>
                ) : (
                  <ProvenanceBadge label="Insufficient Data" tone="unavailable" />
                )}
              </td>
              <td className="py-2.5 px-4">
                {nearestRow?.has_sales_data && nearestRow.current_daily_sales_kg != null ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900">
                      Nearest: {nearestRow.current_daily_sales_kg.toLocaleString()} kg/day
                    </span>
                    <ProvenanceBadge label="Historical baseline (synthetic demo)" tone="actual" />
                  </div>
                ) : (
                  <ProvenanceBadge label="Unavailable" tone="unavailable" />
                )}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-800">Daily Capacity</td>
              <td className="py-2.5 px-4">
                {proposed.expected_daily_capacity_kg != null ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900">
                      {proposed.expected_daily_capacity_kg.toLocaleString()} kg/day
                    </span>
                    <ProvenanceBadge label="Provided scenario input" tone="input" />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <ProvenanceBadge label="Unavailable" tone="unavailable" />
                    <span className="text-[11px] text-slate-500">Not specified by user</span>
                  </div>
                )}
              </td>
              <td className="py-2.5 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ProvenanceBadge label="Unavailable" tone="unavailable" />
                  <span className="text-[11px] text-slate-500">
                    Rated station capacity not disclosed in verified dataset
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comparison Bar Chart when baseline data is available */}
      {chartData.length > 0 ? (
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Daily Sales Comparison (kg/day): Proposed (Estimated) vs Nearby Existing Stations
            </span>
            <span className="text-[10px] text-slate-500">
              Note: Existing station baselines come from synthetic Ahmedabad demo series
            </span>
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" kg" />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} kg/day`, 'Daily Sales']}
                  contentStyle={{
                    borderRadius: 10,
                    borderColor: '#CBD5E1',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="kgPerDay" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-start gap-2 text-[11px] text-slate-600">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Sales comparison chart is omitted because existing verified stations in this corridor do not have historical sales records. Only verified spatial metrics are displayed.
          </span>
        </div>
      )}
    </div>
  );
};
