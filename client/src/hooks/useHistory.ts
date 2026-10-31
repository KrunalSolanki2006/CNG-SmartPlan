import { useState, useEffect, useCallback } from 'react';
import { StationHistoryResponse } from '../types/api';
import { fetchStationHistory, StationHistoryParams } from '../api/stations';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { HISTORY_FIXTURE_AMD001 } from '../fixtures/historyFixture';

export interface UseHistoryResult {
  data: StationHistoryResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  isFixtureData: boolean;
}

export function useHistory(
  stationId: string,
  params?: StationHistoryParams
): UseHistoryResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<StationHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadData = useCallback(() => {
    if (!stationId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      const timer = setTimeout(() => {
        // Return AMD001 fixture or adapted copy
        setData({
          ...HISTORY_FIXTURE_AMD001,
          station_id: stationId,
          aggregation: params?.aggregation || 'daily',
        });
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetchStationHistory(stationId, params, controller.signal)
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
  }, [stationId, useFixtures, params?.aggregation, params?.start_date, params?.end_date]);

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
