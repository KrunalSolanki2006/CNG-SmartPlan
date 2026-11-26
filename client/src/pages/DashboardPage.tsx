import React from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { MotionSection } from '../components/ui/MotionContainer';
import { ExecutiveKPIs } from '../components/dashboard/ExecutiveKPIs';
import { GujaratNetworkOverviewCard } from '../components/dashboard/GujaratNetworkOverviewCard';
import { DemandForecastOverviewCard } from '../components/dashboard/DemandForecastOverviewCard';
import { SupplyAlertsOverviewCard } from '../components/dashboard/SupplyAlertsOverviewCard';
import { NetworkIntelligenceExpansionSection } from '../components/dashboard/NetworkIntelligenceExpansionSection';
import { useDashboardOverview } from '../hooks/useDashboardOverview';
import { useFixtureMode } from '../context/FixtureContext';

export const DashboardPage: React.FC = () => {
  const { useFixtures } = useFixtureMode();
  const { data, isLoading, error, refetch } = useDashboardOverview(7);

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Header */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A9396]" />
                  Gujarat CNG Network Overview
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Main Dashboard — Gujarat CNG Network Overview
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-1">
                Executive network overview for Gujarat Gas Company Limited integrating verified CNG infrastructure, aggregated demand forecasts, supply alerts, and expansion insights.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              {data?.provenance.dashboard_generated_at && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-[#0A9396]" />
                  Updated: {data.provenance.dashboard_generated_at}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="rounded-xl"
              >
                Refresh Overview
              </Button>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Error State with Retry */}
      {error && !useFixtures && (
        <ErrorState
          title="Main Dashboard Overview Unavailable"
          code={error.code}
          message={`${error.message} Ensure the FastAPI service is running on http://localhost:8000.`}
          onRetry={refetch}
        />
      )}

      {/* 2. Section 1: KPI Cards — Network at a Glance */}
      <MotionSection delay={0.1}>
        <ExecutiveKPIs data={data} isLoading={isLoading} />
      </MotionSection>

      {/* 3. Section 2: Gujarat CNG Network Overview */}
      <MotionSection delay={0.14}>
        <GujaratNetworkOverviewCard
          networkSummary={data?.network_summary}
          isLoading={isLoading}
        />
      </MotionSection>

      {/* 4. Section 3: Demand Forecast Overview */}
      <MotionSection delay={0.18}>
        <DemandForecastOverviewCard
          forecast={data?.aggregated_forecast}
          isLoading={isLoading}
        />
      </MotionSection>

      {/* 5. Section 4: Supply Alerts & Notifications */}
      <MotionSection delay={0.22}>
        <SupplyAlertsOverviewCard
          alerts={data?.supply_alerts}
          isLoading={isLoading}
        />
      </MotionSection>

      {/* 6. Section 5: Network Intelligence & Expansion Insights */}
      <MotionSection delay={0.26}>
        <NetworkIntelligenceExpansionSection
          intelligence={data?.network_intelligence}
          expansion={data?.expansion_insights}
          isLoading={isLoading}
        />
      </MotionSection>
    </div>
  );
};
