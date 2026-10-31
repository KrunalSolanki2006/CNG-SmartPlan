import { apiClient } from './client';
import { ForecastRequest, ForecastResponse } from '../types/api';

export async function generateForecast(
  request: ForecastRequest,
  signal?: AbortSignal
): Promise<ForecastResponse> {
  return apiClient<ForecastResponse>('/forecast', {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  });
}
