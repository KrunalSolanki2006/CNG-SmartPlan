import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertCircle,
  MapPin,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Station-Level Demand Forecasting',
      feature: 'Feature B',
      description: 'Chronological forecasting (7, 14, 30 days) comparing 28-day rolling mean baseline against Holt-Winters.',
      path: '/forecast',
      icon: TrendingUp,
      status: 'Awaiting Milestone 2 & 3 Backend Integration',
    },
    {
      title: 'Supply Shortfall Alerts',
      feature: 'Feature C',
      description: 'Detects potential planning shortfalls: max(0, forecast_demand - planned_supply).',
      path: '/alerts',
      icon: AlertCircle,
      status: 'Awaiting Milestone 3 Backend Integration',
    },
    {
      title: 'Network Station Map',
      feature: 'Feature D',
      description: 'Ahmedabad spatial analysis with explicit unverified coordinate handling and OSM attribution.',
      path: '/map',
      icon: MapPin,
      status: 'Awaiting Milestone 4 Backend Integration',
    },
    {
      title: 'New-Station Impact Simulator',
      feature: 'Feature E (Signature)',
      description: 'Three-stage demand capture, network diversion, and net additional demand estimation.',
      path: '/simulator',
      icon: Sliders,
      status: 'Awaiting Milestone 5 Backend Integration',
      highlight: true,
    },
    {
      title: 'Data Quality & Provenance',
      feature: 'Feature F',
      description: 'Transparent audit ledger of 12 directory stations, 8 data gaps, and synthetic methodology.',
      path: '/data-quality',
      icon: ShieldCheck,
      status: 'Awaiting Milestone 2 Backend Integration',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Provenance & Architecture Status */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#DDF3EF] text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-sm font-bold text-[#0F172A]">
                PS000002 — CNG SmartPlan Foundation
              </h2>
              <Badge variant="success">Milestone 1 Active</Badge>
              <DataOriginBadge origin="synthetic_demo" size="sm" />
            </div>
            <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
              Decision support prototype for Gujarat Gas Company Limited. Strict separation: Frontend shell & design system established. Zero invented operational figures or unverified coordinates displayed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/data-quality')}
            leftIcon={<ShieldCheck className="w-4 h-4 text-[#0F766E]" />}
          >
            Review Provenance
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/simulator')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Signature Simulator
          </Button>
        </div>
      </div>

      {/* Foundation Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#64748B]">Frontend Shell</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg font-bold text-[#0F172A] mb-1">React + Vite + TS</div>
            <p className="text-[11px] text-[#64748B]">
              Navy sidebar, light canvas (#F5F7FA), and design system tokens ready.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#64748B]">API Integration</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="text-lg font-bold text-[#0F172A] mb-1">Typed Client Ready</div>
            <p className="text-[11px] text-[#64748B]">
              Full TypeScript schemas from docs/API_CONTRACT.md implemented in src/types/api.ts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#64748B]">Data Package Audit</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg font-bold text-[#0F172A] mb-1">9 Datasets Audited</div>
            <p className="text-[11px] text-[#64748B]">
              Recalculated: 12 stations, 8,041 daily sales, 8,041 supply, 2,160 hourly records.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#64748B]">Map Pins Approved</span>
              <span className="w-2 h-2 rounded-full bg-red-400" />
            </div>
            <div className="text-lg font-bold text-[#0F172A] mb-1">0 Verified Pins</div>
            <p className="text-[11px] text-[#64748B]">
              All 8 candidates unapproved (approved_for_map_pin=no). Honest unavailable state active.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Overview Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
              Platform Modules & Milestone Roadmap
            </h3>
            <p className="text-xs text-[#64748B]">
              Sequential 5-milestone progression aligned with paired Member 2 backend services
            </p>
          </div>
          <Badge variant="neutral">Milestone 1 of 5</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card
                key={m.path}
                hoverEffect
                className={`flex flex-col justify-between ${
                  m.highlight ? 'border-[#0F766E]/40 ring-1 ring-[#0F766E]/20' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wider">
                      {m.feature}
                    </span>
                    {m.highlight && (
                      <Badge variant="synthetic" size="sm">
                        Signature Feature
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#DDF3EF] text-[#0F766E] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm">{m.title}</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="py-2">
                  <CardDescription className="leading-relaxed">
                    {m.description}
                  </CardDescription>
                </CardContent>

                <CardFooter className="justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Planned</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(m.path)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Open Shell
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Integration Handoff Information for Member 2 */}
      <Card className="bg-[#FAFCFD]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0F766E]" />
            <CardTitle className="text-sm">Milestone 1 Pairing Handoff Status</CardTitle>
          </div>
          <CardDescription>
            Frontend shell operational. Ready to link to Member 2 FastAPI endpoints as they are implemented.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 p-3 bg-white rounded-lg border border-[#DCE4E8]">
              <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Frontend Dev Server Ready</span>
              </div>
              <p className="text-[#64748B]">
                Origin: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">http://localhost:5173</code>
                <br />
                Reverse Proxy: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">/api/v1/* &rarr; http://localhost:8000/api/v1/*</code>
              </p>
            </div>

            <div className="space-y-2 p-3 bg-white rounded-lg border border-[#DCE4E8]">
              <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Canonical Contract Enforced</span>
              </div>
              <p className="text-[#64748B]">
                All 9 endpoints from <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">docs/API_CONTRACT.md</code> defined with typed request/response contracts and request cancellation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
