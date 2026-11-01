import { useState, useCallback, useRef } from 'react';
import { ImpactSimulatorRequest, ImpactSimulatorResponse } from '../types/api';
import { simulateImpact } from '../api/impact';
import { ApiError } from '../api/client';
import { useFixtureMode } from '../context/FixtureContext';
import { createImpactFixture } from '../fixtures/impactFixture';

export interface UseImpactSimulatorResult {
  data: ImpactSimulatorResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  runSimulation: (request: ImpactSimulatorRequest) => Promise<ImpactSimulatorResponse | null>;
  isFixtureData: boolean;
  clearError: () => void;
}

export function validateSimulatorRequest(request: ImpactSimulatorRequest): string | null {
  if (isNaN(request.proposed_latitude) || request.proposed_latitude < -90 || request.proposed_latitude > 90) {
    return 'Proposed latitude must be a valid number between -90 and 90 degrees.';
  }
  if (isNaN(request.proposed_longitude) || request.proposed_longitude < -180 || request.proposed_longitude > 180) {
    return 'Proposed longitude must be a valid number between -180 and 180 degrees.';
  }
  if (isNaN(request.catchment_radius_km) || request.catchment_radius_km < 0.1 || request.catchment_radius_km > 50.0) {
    return 'Catchment radius must be between 0.1 km and 50.0 km.';
  }
  if (isNaN(request.catchment_demand_kg_per_day) || request.catchment_demand_kg_per_day <= 0) {
    return 'Assumed catchment demand must be greater than 0 kg/day.';
  }
  if (isNaN(request.capture_proportion) || request.capture_proportion < 0.0 || request.capture_proportion > 1.0) {
    return 'Capture proportion must be between 0.0 and 1.0 (0% to 100%).';
  }
  if (isNaN(request.diversion_proportion) || request.diversion_proportion < 0.0 || request.diversion_proportion > 1.0) {
    return 'Diversion proportion must be between 0.0 and 1.0 (0% to 100%).';
  }
  if (request.accessibility_demand_kg_per_day !== undefined && (isNaN(request.accessibility_demand_kg_per_day) || request.accessibility_demand_kg_per_day < 0)) {
    return 'Accessibility-generated demand must be greater than or equal to 0 kg/day.';
  }
  return null;
}

export function useImpactSimulator(): UseImpactSimulatorResult {
  const { useFixtures } = useFixtureMode();
  const [data, setData] = useState<ImpactSimulatorResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const runSimulation = useCallback(
    async (request: ImpactSimulatorRequest): Promise<ImpactSimulatorResponse | null> => {
      // Input validation check (AT-I04)
      const validationError = validateSimulatorRequest(request);
      if (validationError) {
        const err: ApiError = {
          name: 'ApiError',
          status: 422,
          code: 'VALIDATION_ERROR',
          message: validationError,
        };
        setError(err);
        return null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      if (useFixtures) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const fixture = createImpactFixture(request);
            setData(fixture);
            setIsLoading(false);
            resolve(fixture);
          }, 150);
        });
      }

      try {
        const response = await simulateImpact(request, controller.signal);
        setData(response);
        setIsLoading(false);
        return response;
      } catch (err: unknown) {
        const apiErr = err as ApiError;
        if (apiErr.name !== 'AbortError') {
          setError(apiErr);
          setIsLoading(false);
        }
        return null;
      }
    },
    [useFixtures]
  );

  return {
    data,
    isLoading,
    error,
    runSimulation,
    isFixtureData: useFixtures,
    clearError,
  };
}
