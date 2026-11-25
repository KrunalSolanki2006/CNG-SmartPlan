import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ForecastRequest,
  ForecastResponse,
  ForecastStationsListResponse,
  NetworkForecastSummaryResponse,
} from '../types/api';
import {
  fetchForecastStations,
  fetchNetworkForecastSummary,
  generateForecast,
} from '../api/forecast';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import {
  createForecastFixture,
  FORECAST_STATIONS_FIXTURE,
  NETWORK_FORECAST_SUMMARY_FIXTURE,
} from '../fixtures/forecastFixture';

export interface UseForecastResult {
  data: ForecastResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  isFixtureData: boolean;
}

export function useForecast(request: ForecastRequest | null): UseForecastResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Keep track of latest request to prevent stale overwrite
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(() => {
    if (!request || !request.station_id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Client-side horizon bounds check
    const horizon = request.horizon_days ?? 7;
    if (horizon < 1 || horizon > 30) {
      setError({
        name: 'ApiError',
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Forecast horizon must be between 1 and 30 days.',
      });
      setIsLoading(false);
      return;
    }

    // Cancel in-flight request
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
          createForecastFixture(
            request.station_id,
            request.station_id === 'AMD001' ? 'Visat Automobile' : `Station ${request.station_id}`,
            horizon,
            request.model || 'holt_winters',
            request.include_baseline ?? true
          )
        );
        setIsLoading(false);
      }, 120);

      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }

    generateForecast(request, controller.signal)
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
    request?.model,
    request?.include_baseline,
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

export function useForecastStations() {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<ForecastStationsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadStations = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      const timer = setTimeout(() => {
        setData(FORECAST_STATIONS_FIXTURE);
        setIsLoading(false);
      }, 60);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetchForecastStations(controller.signal)
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
    const cleanup = loadStations();
    return () => {
      if (cleanup) cleanup();
    };
  }, [loadStations]);

  return { data, isLoading, error, refetch: loadStations };
}

export function useNetworkForecastSummary(
  horizonDays: number,
  model: 'holt_winters' | 'rolling_mean_baseline',
  enabled: boolean = true
) {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<NetworkForecastSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadSummary = useCallback(() => {
    if (!enabled) {
      return;
    }
    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      const timer = setTimeout(() => {
        setData({
          ...NETWORK_FORECAST_SUMMARY_FIXTURE,
          horizon_days: horizonDays,
          model_used: model,
        });
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetchNetworkForecastSummary(horizonDays, model, controller.signal)
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
  }, [horizonDays, model, enabled, useFixtures]);

  useEffect(() => {
    const cleanup = loadSummary();
    return () => {
      if (cleanup) cleanup();
    };
  }, [loadSummary]);

  return { data, isLoading, error, refetch: loadSummary };
}
