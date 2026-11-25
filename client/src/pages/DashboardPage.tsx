import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { OverviewKPIs } from '../components/dashboard/OverviewKPIs';
import { HistoricalDemandOverview } from '../components/dashboard/HistoricalDemandOverview';
import { StationInventoryTable } from '../components/dashboard/StationInventoryTable';
import { ForecastSummaryCard } from '../components/dashboard/ForecastSummaryCard';
import { MotionSection } from '../components/ui/MotionContainer';
import { useOverview } from '../hooks/useOverview';
import { useStations } from '../hooks/useStations';
import { useFixtureMode } from '../context/FixtureContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { useFixtures } = useFixtureMode();

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useOverview();

  const {
    data: stationsData,
    isLoading: isStationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useStations();

  const handleRefreshAll = () => {
    refetchOverview();
    refetchStations();
  };

  return (
    <div className="space-y-6">
      {/* Operations Dashboard Hero & Controls */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  CGD Intelligent Network
                </span>
                <span className="text-xs text-slate-500 font-medium">Gujarat Gas Company Ltd. • Ahmedabad</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Network Operations & Demand Intelligence
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-1">
                Executive decision-support platform delivering real-time station inventory intelligence, predictive Holt-Winters demand forecasting, and geospatial network expansion simulation.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">


              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/simulator')}
                className="font-medium rounded-xl shadow-xs"
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
              >
                Impact Simulator
              </Button>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Global API Error State if Backend fails and Fixtures are NOT enabled */}
      {overviewError && !useFixtures && (
        <ErrorState
          title="Backend Connection Required"
          code={overviewError.code}
          message={`${overviewError.message} Ensure Member 2's FastAPI service is running on http://localhost:8000 (uvicorn main:app).`}
          onRetry={handleRefreshAll}
        />
      )}

      {/* 4 Core Overview KPI Cards */}
      <MotionSection delay={0.1}>
        <OverviewKPIs data={overviewData} isLoading={isOverviewLoading} />
      </MotionSection>

      {/* Main Analysis Section: Historical Demand Chart & Forecast Pipeline Card */}
      <MotionSection delay={0.2}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <HistoricalDemandOverview stations={stationsData?.stations || []} />
          </div>

          <div className="space-y-4">
            <ForecastSummaryCard summary={overviewData?.forecast_summary} />
          </div>
        </div>
      </MotionSection>

      {/* Station Inventory View / Master Table */}
      <MotionSection delay={0.25}>
        <StationInventoryTable
          data={stationsData}
          isLoading={isStationsLoading}
          error={stationsError}
          onRetry={refetchStations}
        />
      </MotionSection>
    </div>
  );
};
