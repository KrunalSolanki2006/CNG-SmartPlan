import React from 'react';
import {
  Database,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { MotionSection } from '../components/ui/MotionContainer';
import { useDataQuality } from '../hooks/useDataQuality';
import { DataOrigin } from '../types/api';
import { DATA_ORIGIN_CONFIG } from '../utils/dataOrigin';

export const DataQualityPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useDataQuality();

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  Enterprise Audit & Compliance
                </span>
                <span className="text-xs text-slate-500 font-medium">Gujarat Gas Company Ltd. • Ahmedabad</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Data Quality & Provenance Ledger
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-1">
                Transparent audit ledger detailing physical file validation, data classification rules, chronological baseline benchmarks, and documented research gaps per docs/DATA_PROVENANCE.md.
              </p>
            </div>


          </div>
        </div>
      </MotionSection>

      {/* Critical Distinction Banner: Validation Passing vs. Real-World Completeness */}
      <MotionSection delay={0.08}>
        <div className="rounded-2xl p-4 border border-slate-200 bg-white text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200 mt-0.5">
              <FileCheck2 className="w-4 h-4 text-teal-600" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-sm text-slate-900">
                Technical Validation (PASS) vs. Real-World Completeness (INCOMPLETE)
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Technical check passes 10 automated schema tests in <code className="font-mono text-teal-700 font-semibold">validate_package.py</code>. However, this does <strong>not</strong> imply the station census is complete, coordinates are verified, or sales represent actual meter recordings.
              </p>
            </div>
          </div>
        </div>
      </MotionSection>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Data Quality Endpoint"
          code={error.code}
          message={`${error.message} Ensure Member 2's GET /api/v1/data-quality endpoint is accessible.`}
          onRetry={refetch}
        />
      ) : !data ? null : (
        <>
          {/* Section 1: Data Origin Matrix */}
          <MotionSection delay={0.12}>
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Canonical Data Origin Classifications (docs/API_CONTRACT.md)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {(Object.keys(DATA_ORIGIN_CONFIG) as DataOrigin[]).map((origin) => {
                  const conf = DATA_ORIGIN_CONFIG[origin];
                  return (
                    <Card key={origin} className="p-4 border-slate-200 bg-white flex flex-col justify-between card-interactive rounded-2xl shadow-xs">
                      <div>
                        <div className="mb-2">
                          <DataOriginBadge origin={origin} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {conf.description}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </MotionSection>

          {/* Section 2: Physical Dataset Inventory */}
          <MotionSection delay={0.16}>
            <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EAF6F2] text-[#005F73] flex items-center justify-center shrink-0 border border-[#94D2BD]/60">
                      <Database className="w-4 h-4 text-[#0A9396]" />
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900">Physical Dataset Inventory</CardTitle>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Generated: {data.generated_at}
                  </span>
                </div>
                <CardDescription className="text-slate-500">
                  Audited files from CNG_SmartPlan_Data/ and active FastAPI backend:
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Station Master */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900">cng_stations.csv</span>
                      <DataOriginBadge origin={data.station_inventory.data_origin} size="sm" />
                    </div>
                    <div className="text-lg font-bold text-[#005F73] font-mono">
                      {data.station_inventory.total_stations} Records
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {data.station_inventory.eligible_for_simulation} simulation eligible. {data.station_inventory.coordinate_status}.
                    </p>
                  </div>

                  {/* Daily Sales */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900">synthetic_daily_sales.csv</span>
                      <DataOriginBadge origin={data.synthetic_data.daily_sales.data_origin} size="sm" />
                    </div>
                    <div className="text-lg font-bold text-[#0A9396] font-mono">
                      {data.synthetic_data.daily_sales.rows.toLocaleString()} Rows
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {data.synthetic_data.daily_sales.date_range_start} to {data.synthetic_data.daily_sales.date_range_end} ({data.synthetic_data.daily_sales.stations} stations). Holiday fields blank.
                    </p>
                  </div>

                  {/* Hourly Demand */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900">synthetic_hourly_demand.csv</span>
                      <DataOriginBadge origin={data.synthetic_data.hourly_demand.data_origin} size="sm" />
                    </div>
                    <div className="text-lg font-bold text-[#0A9396] font-mono">
                      {data.synthetic_data.hourly_demand.rows.toLocaleString()} Rows
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {data.synthetic_data.hourly_demand.stations} station profiles (AMD001, AMD004, AMD008). 24 rows/station-day.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionSection>

          {/* Section 3: Baseline Evaluation Benchmark */}
          <MotionSection delay={0.2}>
            <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EAF6F2] text-[#005F73] flex items-center justify-center shrink-0 border border-[#94D2BD]/60">
                      <Layers className="w-4 h-4 text-[#0A9396]" />
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900">Baseline Model Benchmark (28-Day Rolling Mean)</CardTitle>
                  </div>
                  <DataOriginBadge origin={data.baseline_evaluation.data_origin} size="sm" />
                </div>
                <CardDescription className="text-slate-500">
                  Chronological evaluation: Train end ≤ {data.baseline_evaluation.train_end}, Test period {data.baseline_evaluation.test_start} to {data.baseline_evaluation.test_end} ({data.baseline_evaluation.test_station_days} station-days).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500">Mean Absolute Error (MAE)</span>
                    <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
                      {data.baseline_evaluation.mae_kg} kg/day
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Synthetic simulation benchmark</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500">Root Mean Squared Error (RMSE)</span>
                    <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
                      {data.baseline_evaluation.rmse_kg} kg/day
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Penalty on larger simulated errors</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500">Symmetric MAPE (sMAPE)</span>
                    <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
                      {data.baseline_evaluation.smape_pct}%
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Normalized percentage error</p>
                  </div>
                </div>

                <div className="mt-3.5 p-3 rounded-xl bg-[#FEF6E9] border border-[#E9D8A6] text-xs text-[#CA6702] leading-snug">
                  <span className="font-semibold">Benchmark Note:</span> {data.baseline_evaluation.note}
                </div>
              </CardContent>
            </Card>
          </MotionSection>

          {/* Section 4: Documented Research Gaps Table */}
          <MotionSection delay={0.24}>
            <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FEF6E9] text-[#CA6702] flex items-center justify-center shrink-0 border border-[#E9D8A6]">
                      <AlertTriangle className="w-4 h-4 text-[#CA6702]" />
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900">Documented Data Gaps Register</CardTitle>
                  </div>
                  <Badge variant="warning">{data.data_gaps.length} Gaps Documented</Badge>
                </div>
                <CardDescription className="text-slate-500">
                  Known package limitations documented upfront to protect decision integrity:
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Research Gap</th>
                        <th className="py-2.5 px-3">Platform Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE6D9] bg-white">
                      {data.data_gaps.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.gap}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{item.impact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </MotionSection>

          {/* Section 5: Sources & Operator Evidence */}
          <MotionSection delay={0.28}>
            <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF6F2] text-[#005F73] flex items-center justify-center shrink-0 border border-[#94D2BD]/60">
                    <CheckCircle2 className="w-4 h-4 text-[#0A9396]" />
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900">Sourced Primary Directory Evidence</CardTitle>
                </div>
                <CardDescription className="text-slate-500">
                  Public publisher portals reviewed and extracted on access date {data.station_inventory.access_date}:
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <a
                    href="https://www.gujarat-energy.com/cng/cng-stations/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-[#0A9396] hover:bg-[#EAF6F2] transition-colors flex items-center justify-between group shadow-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 group-hover:text-[#005F73]">
                        Gujarat Energy Limited (formerly Gujarat Gas)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Official CNG station directory (AMD001, AMD002)
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#005F73] shrink-0" />
                  </a>

                  <a
                    href="https://www.hindustanpetroleum.com/pages/cng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-[#0A9396] hover:bg-[#EAF6F2] transition-colors flex items-center justify-between group shadow-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 group-hover:text-[#005F73]">
                        Hindustan Petroleum Corporation Limited (HPCL)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        CNG retail network locator (AMD003–AMD012)
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#005F73] shrink-0" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </MotionSection>
        </>
      )}
    </div>
  );
};
