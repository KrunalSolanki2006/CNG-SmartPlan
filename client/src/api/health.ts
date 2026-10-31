import { apiClient } from './client';
import { HealthResponse } from '../types/api';

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiClient<HealthResponse>('/health', { signal });
}
