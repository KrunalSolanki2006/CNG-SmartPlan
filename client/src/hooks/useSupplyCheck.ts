import { useState, useEffect, useCallback, useRef } from 'react';
import { SupplyCheckRequest, SupplyCheckResponse } from '../types/api';
import { checkSupplyShortfall } from '../api/supply';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { createSupplyCheckFixture } from '../fixtures/supplyFixture';

export interface UseSupplyCheckResult {
  data: SupplyCheckResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  isFixtureData: boolean;
}

export function useSupplyCheck(request: SupplyCheckRequest | null): UseSupplyCheckResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<SupplyCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(() => {
    if (!request || !request.station_id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const horizon = request.horizon_days ?? 7;
    if (horizon < 1 || horizon > 30) {
      setError({
        name: 'ApiError',
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Horizon must be between 1 and 30 days.',
      });
      setIsLoading(false);
      return;
    }

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
          createSupplyCheckFixture(
            request.station_id,
            request.station_id === 'AMD001' ? 'Visat Automobile' : `Station ${request.station_id}`,
            horizon,
            request.user_supply_overrides
          )
        );
        setIsLoading(false);
      }, 120);

      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }

    checkSupplyShortfall(request, controller.signal)
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
  }, [
    request?.station_id,
    request?.horizon_days,
    request?.supply_source,
    JSON.stringify(request?.user_supply_overrides),
    useFixtures,
  ]);

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
