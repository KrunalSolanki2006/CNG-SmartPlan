import { apiClient } from './client';
import { HourlyResponse } from '../types/api';

export interface HourlyQueryParams {
  station_id?: string;
  date?: string;
}

export async function fetchHourlyDemand(
  params?: HourlyQueryParams,
  signal?: AbortSignal
): Promise<HourlyResponse> {
  return apiClient<HourlyResponse>('/hourly-demand', {
    params: params as Record<string, string | undefined>,
    signal,
  });
}
