import { apiClient } from './client';
import { OverviewResponse } from '../types/api';

export async function fetchOverview(signal?: AbortSignal): Promise<OverviewResponse> {
  return apiClient<OverviewResponse>('/overview', { signal });
}
