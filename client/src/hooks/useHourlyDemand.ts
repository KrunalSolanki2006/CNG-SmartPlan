import { useState, useEffect, useCallback, useRef } from 'react';
import { HourlyResponse } from '../types/api';
import { fetchHourlyDemand, HourlyQueryParams } from '../api/hourly';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { createHourlyFixture } from '../fixtures/hourlyFixture';

export interface UseHourlyDemandResult {
  data: HourlyResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  isFixtureData: boolean;
}

export function useHourlyDemand(params?: HourlyQueryParams): UseHourlyDemandResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<HourlyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      const timer = setTimeout(() => {
        setData(
          createHourlyFixture(
            params?.station_id || 'AMD001',
            params?.date || '2025-12-15'
          )
        );
        setIsLoading(false);
      }, 100);

      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }

    fetchHourlyDemand(params, controller.signal)
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
  }, [params?.station_id, params?.date, useFixtures]);

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
