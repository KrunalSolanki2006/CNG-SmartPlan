import { useState, useEffect, useCallback } from 'react';
import { DataQualityResponse } from '../types/api';
import { fetchDataQuality } from '../api/quality';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { DATA_QUALITY_FIXTURE } from '../fixtures/dataQualityFixture';

export interface UseDataQualityResult {
  data: DataQualityResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  isFixtureData: boolean;
}

export function useDataQuality(): UseDataQualityResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<DataQualityResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      const timer = setTimeout(() => {
        setData(DATA_QUALITY_FIXTURE);
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetchDataQuality(controller.signal)
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
