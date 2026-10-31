import { useState, useEffect, useCallback } from 'react';
import { OverviewResponse } from '../types/api';
import { fetchOverview } from '../api/overview';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { OVERVIEW_FIXTURE } from '../fixtures/overviewFixture';

export interface UseOverviewResult {
  data: OverviewResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  isFixtureData: boolean;
}

export function useOverview(): UseOverviewResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      // Return isolated development fixture with clean async transition
      const timer = setTimeout(() => {
        setData(OVERVIEW_FIXTURE);
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetchOverview(controller.signal)
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
  }, [useFixtures]);

  useEffect(() => {
    const cleanup = loadData();
    return () => {
      if (cleanup) cleanup();
    };
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch: loadData,
    isFixtureData: useFixtures,
  };
}
