import { apiClient } from './client';
import { MainDashboardOverviewResponse } from '../types/dashboard';

export async function fetchDashboardOverview(
  horizonDays: number = 7,
  signal?: AbortSignal
): Promise<MainDashboardOverviewResponse> {
  return apiClient<MainDashboardOverviewResponse>('/dashboard/overview', {
    params: { horizon_days: horizonDays },
    timeoutMs: 300000,
    signal,
  });
}
