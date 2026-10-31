import React from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';

export const DataQualityPage: React.FC = () => {
  const documentedGaps = [
    {
      gap: 'Verified station coordinates',
      impact: 'Zero map pins displayed; distance-based analysis disabled.',
      remedy: 'Requires physical site verification or authorized operator geocodes.',
    },
    {
      gap: 'Actual station-level daily/hourly sales',
      impact: 'All demand models train and evaluate on synthetic simulation data.',
      remedy: 'Requires operator dispensed volumes export under confidentiality agreement.',
    },
    {
      gap: 'Actual planned supply and deliveries',
      impact: 'Shortfall alerts reflect simulation scenarios, not confirmed stockouts.',
      remedy: 'Requires operator supply-plan and delivery schedules.',
    },
    {
      gap: 'Ahmedabad-specific vehicle registrations',
      impact: 'No local vehicle fleet growth covariate available for demand modeling.',
      remedy: 'Requires RTO-level Vahan registration export categorized by fuel type.',
    },
    {
      gap: 'Official 2024–2025 holiday calendar',
      impact: 'is_public_holiday and event_name are blank across all 8,041 records.',
      remedy: 'Requires sourced Gujarat state gazette holiday calendar.',
    },
    {
      gap: 'Complete cross-operator station inventory',
      impact: '12-station directory is a partial subset (Adani Total Gas missing).',
      remedy: 'Requires comprehensive Ahmedabad CGD locator reconciliation.',
    },
    {
      gap: 'Verified AMC municipal boundary',
      impact: 'Study-area inclusion is locality-screened rather than polygon-tested.',
      remedy: 'Requires official AMC GIS boundary GeoJSON layer.',
    },
    {
      gap: 'Road / traffic / land-use spatial indicators',
      impact: 'Impact simulator operates on user-supplied assumptions only.',
      remedy: 'Requires city road network and traffic sensor density feeds.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-[#0F172A]">
              Data Quality & Provenance Ledger
            </h2>
            <Badge variant="success">Feature F</Badge>
            <DataOriginBadge origin="real_public" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Full transparency documentation regarding data origins, simulation methods, documented gaps, and audit trails per docs/DATA_PROVENANCE.md.
          </p>
        </div>
      </div>

      {/* Baseline Evaluation Audit Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-sm">Baseline Model Benchmark (Synthetic-Only)</CardTitle>
            </div>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <CardDescription>
            Audited results from validate_package.py using a 28-day rolling mean on the chronological test period (2025-10-03 to 2025-12-31, 990 station-days):
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-[#64748B]">Mean Absolute Error</span>
              <div className="text-lg font-bold text-[#0F172A] mt-0.5">150.55 kg/day</div>
              <p className="text-[10px] text-slate-500 mt-1">Synthetic simulation benchmark</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-[#64748B]">Root Mean Squared Error</span>
              <div className="text-lg font-bold text-[#0F172A] mt-0.5">189.69 kg/day</div>
              <p className="text-[10px] text-slate-500 mt-1">Penalty on larger simulated variances</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-[#64748B]">Symmetric MAPE</span>
              <div className="text-lg font-bold text-[#0F172A] mt-0.5">11.41%</div>
              <p className="text-[10px] text-slate-500 mt-1">Normalized percentage error</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8 Documented Gaps Register Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm">Documented Data Gaps Register</CardTitle>
            </div>
            <Badge variant="warning">{documentedGaps.length} Gaps Documented</Badge>
          </div>
          <CardDescription>
            Strict adherence to project honesty rules. The system discloses known limitations upfront:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFCFD] border-b border-[#DCE4E8] text-[#64748B] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Data Gap</th>
                  <th className="py-2.5 px-3">Prototype Impact</th>
                  <th className="py-2.5 px-3">Resolution Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documentedGaps.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                      {item.gap}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">{item.impact}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{item.remedy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
