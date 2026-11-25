import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, HelpCircle, Scale } from 'lucide-react';
import { NetworkSalesImpactSummary } from '../../types/candidates';

export interface SimulatorNetworkImpactSectionProps {
  networkImpact?: NetworkSalesImpactSummary;
}

export const SimulatorNetworkImpactSection: React.FC<
  SimulatorNetworkImpactSectionProps
> = ({ networkImpact }) => {
  if (!networkImpact) {
    return null;
  }

  const chartData =
    networkImpact.available &&
    networkImpact.network_sales_before_kg != null &&
    networkImpact.network_sales_after_kg != null
      ? [
          {
            stage: 'Before New Station',
            'Existing Stations Sales': networkImpact.network_sales_before_kg,
            'Proposed Station Sales': 0,
          },
          {
            stage: 'After New Station',
            'Existing Stations Sales': networkImpact.existing_stations_sales_after_kg ?? 0,
            'Proposed Station Sales': networkImpact.proposed_station_daily_sales_kg ?? 0,
          },
        ]
      : [];

  return (
    <div
      data-testid="network-impact-section"
      className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden"
    >
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#0A9396]" />
          <h2 className="text-sm font-bold text-slate-900">
            Overall Network Impact & Before vs After Comparison
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            networkImpact.available
              ? 'bg-teal-50 text-teal-900 border-teal-300'
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}
        >
          {networkImpact.status}
        </span>
      </div>

      {!networkImpact.available ? (
        <div className="p-5 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-slate-800">
                Before vs After Sales Comparison Unavailable (Insufficient Data)
              </div>
              <p className="text-slate-600 leading-relaxed">
                {networkImpact.reason_unavailable || networkImpact.note}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200">
              <div className="text-[10px] font-bold uppercase text-[#005F73]">
                Proposed Station Sales
              </div>
              <div className="text-xl font-bold font-mono text-[#005F73] mt-1">
                {networkImpact.proposed_station_daily_sales_kg?.toLocaleString()} kg/day
              </div>
              <div className="text-[11px] text-teal-800 mt-0.5">Model-based estimate</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[10px] font-bold uppercase text-amber-900">
                Total Nearby Station Loss
              </div>
              <div className="text-xl font-bold font-mono text-amber-800 mt-1">
                -{networkImpact.total_nearby_sales_loss_kg?.toLocaleString()} kg/day
              </div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Diverted across {networkImpact.station_count_with_sales} baseline station(s)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-900">
                Net Network Sales Change
              </div>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
                +{networkImpact.net_network_sales_change_kg?.toLocaleString()} kg/day
              </div>
              <div className="text-[11px] text-emerald-800 mt-0.5">
                Proposed Sales minus Total Loss
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-600">
                Net Network Impact %
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                +{networkImpact.net_network_impact_pct?.toFixed(2)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Relative to baseline ({networkImpact.network_sales_before_kg?.toLocaleString()} kg/day)
              </div>
            </div>
          </div>

          {/* Before vs After Table + Stacked Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-2.5 px-3.5">Network Metric</th>
                    <th className="py-2.5 px-3.5 text-right">Before New Station</th>
                    <th className="py-2.5 px-3.5 text-right">After New Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                      Existing Stations Total Sales
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-slate-900">
                      {networkImpact.network_sales_before_kg?.toLocaleString()} kg/d
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-amber-800 font-semibold">
                      {networkImpact.existing_stations_sales_after_kg?.toLocaleString()} kg/d
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                      Proposed Station Daily Sales
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">0 kg/d</td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-[#005F73] font-bold">
                      {networkImpact.proposed_station_daily_sales_kg?.toLocaleString()} kg/d
                    </td>
                  </tr>
                  <tr className="bg-teal-50/50 font-bold text-slate-900">
                    <td className="py-2.5 px-3.5">Combined Corridor Network Sales</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {networkImpact.network_sales_before_kg?.toLocaleString()} kg/d
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-emerald-800">
                      {networkImpact.network_sales_after_kg?.toLocaleString()} kg/d
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600">
                {networkImpact.note}
              </div>
            </div>

            <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-[#0A9396]" />
                <span>Network Sales: Before vs After (kg/day)</span>
              </div>
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height={205}>
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#334155' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" kg" />
                    <Tooltip
                      formatter={(val: number) => `${val.toLocaleString()} kg/day`}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="Existing Stations Sales"
                      stackId="net"
                      fill="#2563EB"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="Proposed Station Sales"
                      stackId="net"
                      fill="#0A9396"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
