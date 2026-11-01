import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { ErrorState } from '../components/ui/ErrorState';
import { OverviewKPIs } from '../components/dashboard/OverviewKPIs';
import { HistoricalDemandOverview } from '../components/dashboard/HistoricalDemandOverview';
import { StationInventoryTable } from '../components/dashboard/StationInventoryTable';
import { ForecastSummaryCard } from '../components/dashboard/ForecastSummaryCard';
import { DataQualityFlagsBanner } from '../components/dashboard/DataQualityFlagsBanner';
import { useOverview } from '../hooks/useOverview';
import { useStations } from '../hooks/useStations';
import { useFixtureMode } from '../context/FixtureContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { useFixtures, toggleFixtures } = useFixtureMode();

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
      {/* Dev Fixture Persistent Notice (Only visible when developer explicitly activates it) */}
      {useFixtures && (
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

      {/* Operations Dashboard Hero & Controls */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
              Network Operations & Planning Dashboard
            </h2>
            <Badge variant="success">Milestone 2 Active</Badge>
            <DataOriginBadge origin="synthetic_demo" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Ahmedabad CNG network decision support for Gujarat Gas Company Limited. Current prototype data snapshot connecting station inventory, synthetic time series, and data quality flags.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFixtures}
            className="text-xs text-[#64748B]"
          >
            {useFixtures ? 'Disable Fixtures' : 'Enable Dev Fixtures'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/simulator')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Impact Simulator
          </Button>
        </div>
      </div>

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
      <OverviewKPIs data={overviewData} isLoading={isOverviewLoading} />

      {/* Live Data Quality & Verification Audit Banner */}
      <DataQualityFlagsBanner
        flags={overviewData?.data_quality_flags}
        hourly={overviewData?.hourly_summary}
      />

      {/* Main Analysis Section: Historical Demand Chart & Forecast Pipeline Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HistoricalDemandOverview stations={stationsData?.stations || []} />
        </div>

        <div className="space-y-4">
          <ForecastSummaryCard summary={overviewData?.forecast_summary} />

          {/* Quick Nav to Signature Modules */}
          <div className="rounded-card bg-white p-4 border border-[#DCE4E8] shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              <h4 className="text-xs font-bold text-[#0F172A]">Direct Module Access</h4>
            </div>
            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => navigate('/alerts')}
                className="w-full text-left p-2 rounded hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-slate-800 group-hover:text-[#0F766E]">
                    Supply Shortfall Alerts
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Formula: max(0, forecast − supply)
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F766E]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/map')}
                className="w-full text-left p-2 rounded hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-slate-800 group-hover:text-[#0F766E]">
                    Ahmedabad Network Map
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Spatial explorer & candidate selection
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F766E]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/data-quality')}
                className="w-full text-left p-2 rounded hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-slate-800 group-hover:text-[#0F766E]">
                    Data Quality & Gaps Ledger
                  </span>
                  <p className="text-[11px] text-slate-500">
                    8 documented research gaps
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F766E]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Station Inventory View / Master Table */}
      <StationInventoryTable
        data={stationsData}
        isLoading={isStationsLoading}
        error={stationsError}
        onRetry={refetchStations}
      />
    </div>
  );
};
