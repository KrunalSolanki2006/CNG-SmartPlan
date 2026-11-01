import React from 'react';
import {
  Database,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useDataQuality } from '../hooks/useDataQuality';
import { useFixtureMode } from '../context/FixtureContext';
import { DataOrigin } from '../types/api';
import { DATA_ORIGIN_CONFIG } from '../utils/dataOrigin';

export const DataQualityPage: React.FC = () => {
  const { data, isLoading, error, refetch, isFixtureData } = useDataQuality();
  const { toggleFixtures } = useFixtureMode();

  return (
    <div className="space-y-6">
      {/* Dev Fixture Banner if active */}
      {isFixtureData && (
        <div
          role="status"
          className="rounded-lg bg-amber-500 text-slate-950 p-3 text-xs font-medium flex items-center justify-between shadow-sm border border-amber-600"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] bg-black text-amber-300 px-2 py-0.5 rounded">
              Dev Fixtures Active
            </span>
            <span>
              Isolated local contract fixtures enabled for offline development. Never used as a silent production fallback.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFixtures}
            className="underline hover:text-white font-bold ml-2 cursor-pointer"
          >
            Switch to Live API
          </button>
        </div>
      )}

      {/* Header */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
              Data Quality & Provenance Ledger
            </h2>
            <Badge variant="success">Feature F</Badge>
            <DataOriginBadge origin="real_public" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Transparent audit ledger detailing physical file validation, data classification rules, chronological baseline benchmarks, and documented research gaps per docs/DATA_PROVENANCE.md.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* Critical Distinction Banner: Validation Passing vs. Real-World Completeness */}
      <div className="rounded-card p-4 border border-blue-200 bg-blue-50/70 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-blue-900">
              Technical Validation (PASS) vs. Real-World Completeness (INCOMPLETE)
            </div>
            <p className="text-blue-800 leading-relaxed text-[11px]">
              Technical check passes 10 automated schema tests in <code className="font-mono text-blue-950">validate_package.py</code>. However, this does <strong>not</strong> imply the station census is complete, coordinates are verified, or sales represent actual meter recordings.
            </p>
          </div>
        </div>
      </div>

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
          <div>
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
              Canonical Data Origin Classifications (docs/API_CONTRACT.md)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(DATA_ORIGIN_CONFIG) as DataOrigin[]).map((origin) => {
                const conf = DATA_ORIGIN_CONFIG[origin];
                return (
                  <Card key={origin} className="p-4 border-[#DCE4E8] flex flex-col justify-between">
                    <div>
                      <div className="mb-2">
                        <DataOriginBadge origin={origin} size="sm" />
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {conf.description}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Section 2: Physical Dataset Inventory */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#0F766E]" />
                  <CardTitle className="text-sm">Physical Dataset Inventory</CardTitle>
                </div>
                <span className="text-[11px] text-[#64748B]">
                  Generated: {data.generated_at}
                </span>
              </div>
              <CardDescription>
                Audited files from CNG_SmartPlan_Data/ and active FastAPI backend:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Station Master */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#0F172A]">cng_stations.csv</span>
                    <DataOriginBadge origin={data.station_inventory.data_origin} size="sm" />
                  </div>
                  <div className="text-lg font-bold text-[#0F766E]">
                    {data.station_inventory.total_stations} Records
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {data.station_inventory.eligible_for_simulation} simulation eligible. {data.station_inventory.coordinate_status}.
                  </p>
                </div>

                {/* Daily Sales */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#0F172A]">synthetic_daily_sales.csv</span>
                    <DataOriginBadge origin={data.synthetic_data.daily_sales.data_origin} size="sm" />
                  </div>
                  <div className="text-lg font-bold text-[#6D5BD0]">
                    {data.synthetic_data.daily_sales.rows.toLocaleString()} Rows
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {data.synthetic_data.daily_sales.date_range_start} to {data.synthetic_data.daily_sales.date_range_end} ({data.synthetic_data.daily_sales.stations} stations). Holiday fields blank.
                  </p>
                </div>

                {/* Hourly Demand */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#0F172A]">synthetic_hourly_demand.csv</span>
                    <DataOriginBadge origin={data.synthetic_data.hourly_demand.data_origin} size="sm" />
                  </div>
                  <div className="text-lg font-bold text-[#6D5BD0]">
                    {data.synthetic_data.hourly_demand.rows.toLocaleString()} Rows
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {data.synthetic_data.hourly_demand.stations} station profiles (AMD001, AMD004, AMD008). 24 rows/station-day.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Baseline Evaluation Benchmark */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0F766E]" />
                  <CardTitle className="text-sm">Baseline Model Benchmark (28-Day Rolling Mean)</CardTitle>
                </div>
                <DataOriginBadge origin={data.baseline_evaluation.data_origin} size="sm" />
              </div>
              <CardDescription>
                Chronological evaluation: Train end ≤ {data.baseline_evaluation.train_end}, Test period {data.baseline_evaluation.test_start} to {data.baseline_evaluation.test_end} ({data.baseline_evaluation.test_station_days} station-days).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-[#64748B]">Mean Absolute Error (MAE)</span>
                  <div className="text-xl font-bold text-[#0F172A] mt-0.5">
                    {data.baseline_evaluation.mae_kg} kg/day
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Synthetic simulation benchmark</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-[#64748B]">Root Mean Squared Error (RMSE)</span>
                  <div className="text-xl font-bold text-[#0F172A] mt-0.5">
                    {data.baseline_evaluation.rmse_kg} kg/day
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Penalty on larger simulated errors</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-[#64748B]">Symmetric MAPE (sMAPE)</span>
                  <div className="text-xl font-bold text-[#0F172A] mt-0.5">
                    {data.baseline_evaluation.smape_pct}%
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Normalized percentage error</p>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-snug">
                <span className="font-semibold">Benchmark Note:</span> {data.baseline_evaluation.note}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Documented Research Gaps Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-sm">Documented Data Gaps Register</CardTitle>
                </div>
                <Badge variant="warning">{data.data_gaps.length} Gaps Documented</Badge>
              </div>
              <CardDescription>
                Known package limitations documented upfront to protect decision integrity:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-[#DCE4E8]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFCFD] border-b border-[#DCE4E8] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Research Gap</th>
                      <th className="py-2.5 px-3">Platform Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.data_gaps.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                          {item.gap}
                        </td>
                        <td className="py-2.5 px-3 text-[#64748B]">{item.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Sources & Operator Evidence */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
                <CardTitle className="text-sm">Sourced Primary Directory Evidence</CardTitle>
              </div>
              <CardDescription>
                Public publisher portals reviewed and extracted on access date {data.station_inventory.access_date}:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <a
                  href="https://www.gujarat-energy.com/cng/cng-stations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg border border-[#DCE4E8] hover:border-[#0F766E] hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="font-semibold text-[#0F172A] group-hover:text-[#0F766E]">
                      Gujarat Energy Limited (formerly Gujarat Gas)
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      Official CNG station directory (AMD001, AMD002)
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F766E] shrink-0" />
                </a>

                <a
                  href="https://www.hindustanpetroleum.com/pages/cng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg border border-[#DCE4E8] hover:border-[#0F766E] hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="font-semibold text-[#0F172A] group-hover:text-[#0F766E]">
                      Hindustan Petroleum Corporation Limited (HPCL)
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      CNG retail network locator (AMD003–AMD012)
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F766E] shrink-0" />
                </a>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
