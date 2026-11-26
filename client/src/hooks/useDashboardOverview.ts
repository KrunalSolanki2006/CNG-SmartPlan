import { useState, useEffect, useCallback } from 'react';
import { MainDashboardOverviewResponse } from '../types/dashboard';
import { fetchDashboardOverview } from '../api/dashboard';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { DASHBOARD_OVERVIEW_FIXTURE } from '../fixtures/dashboardOverviewFixture';

export interface UseDashboardOverviewResult {
  data: MainDashboardOverviewResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useDashboardOverview(horizonDays: number = 7): UseDashboardOverviewResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<MainDashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      const timer = setTimeout(() => {
        setData(DASHBOARD_OVERVIEW_FIXTURE);
        setIsLoading(false);
      }, 60);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetchDashboardOverview(horizonDays, controller.signal)
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((err: ApiError) => {
        if (err.name !== 'AbortError') {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [useFixtures, horizonDays]);

  useEffect(() => {
    const cleanup = loadData();
    return cleanup;
  }, [loadData]);

  return { data, isLoading, error, refetch: loadData };
}
