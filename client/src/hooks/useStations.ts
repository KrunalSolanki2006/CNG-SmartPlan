import { useState, useEffect, useCallback } from 'react';
import { StationsResponse } from '../types/api';
import { fetchStations, StationQueryParams } from '../api/stations';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { STATIONS_FIXTURE } from '../fixtures/stationsFixture';

export interface UseStationsResult {
  data: StationsResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  isFixtureData: boolean;
}

export function useStations(params?: StationQueryParams): UseStationsResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<StationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (useFixtures) {
      const timer = setTimeout(() => {
        let filtered = [...STATIONS_FIXTURE.stations];
        if (params?.in_study_area) {
          filtered = filtered.filter((s) => s.in_study_area === params.in_study_area);
        }
        if (params?.eligible_for_simulation !== undefined) {
          filtered = filtered.filter(
            (s) => s.eligible_for_simulation === params.eligible_for_simulation
          );
        }
        setData({
          stations: filtered,
          total: STATIONS_FIXTURE.total,
          eligible_for_simulation: STATIONS_FIXTURE.eligible_for_simulation,
          eligible_for_map_pin: STATIONS_FIXTURE.eligible_for_map_pin,
          map_availability: STATIONS_FIXTURE.map_availability,
        });
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetchStations(params, controller.signal)
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
  }, [useFixtures, params?.in_study_area, params?.eligible_for_simulation]);

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
