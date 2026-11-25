import { apiClient } from './client';
import {
  ForecastDataStatusResponse,
  ForecastRequest,
  ForecastResponse,
  ForecastStationsListResponse,
  NetworkForecastSummaryResponse,
} from '../types/api';

export async function generateForecast(
  request: ForecastRequest,
  signal?: AbortSignal
): Promise<ForecastResponse> {
  return apiClient<ForecastResponse>('/forecast', {
    method: 'POST',
    body: JSON.stringify(request),
    timeoutMs: 30000,
    signal,
  });
}

export async function fetchForecastStations(
  signal?: AbortSignal
): Promise<ForecastStationsListResponse> {
  return apiClient<ForecastStationsListResponse>('/forecast/stations', {
    timeoutMs: 30000,
    signal,
  });
}

export async function fetchNetworkForecastSummary(
  horizonDays: number = 7,
  model: 'holt_winters' | 'rolling_mean_baseline' = 'holt_winters',
  signal?: AbortSignal
): Promise<NetworkForecastSummaryResponse> {
  return apiClient<NetworkForecastSummaryResponse>('/forecast/network/summary', {
    params: {
      horizon_days: horizonDays,
      model,
    },
    timeoutMs: 300000,
    signal,
  });
}

export async function fetchForecastDataStatus(
  signal?: AbortSignal
): Promise<ForecastDataStatusResponse> {
  return apiClient<ForecastDataStatusResponse>('/forecast/data-status', {
    signal,
  });
}
