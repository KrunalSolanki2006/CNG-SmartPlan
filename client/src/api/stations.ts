import { apiClient } from './client';
import { StationsResponse, StationHistoryResponse } from '../types/api';

export interface StationQueryParams {
  in_study_area?: 'yes' | 'no' | 'uncertain';
  eligible_for_simulation?: boolean;
}

export async function fetchStations(
  params?: StationQueryParams,
  signal?: AbortSignal
): Promise<StationsResponse> {
  return apiClient<StationsResponse>('/stations', {
    params: params as Record<string, string | boolean | undefined>,
    signal,
  });
}

export interface StationHistoryParams {
  start_date?: string;
  end_date?: string;
  aggregation?: 'daily' | 'weekly';
}

export async function fetchStationHistory(
  stationId: string,
  params?: StationHistoryParams,
  signal?: AbortSignal
): Promise<StationHistoryResponse> {
  return apiClient<StationHistoryResponse>(`/stations/${stationId}/history`, {
    params: params as Record<string, string | undefined>,
    signal,
  });
}
