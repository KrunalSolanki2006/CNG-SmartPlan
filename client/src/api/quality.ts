import { apiClient } from './client';
import { DataQualityResponse } from '../types/api';

export async function fetchDataQuality(signal?: AbortSignal): Promise<DataQualityResponse> {
  return apiClient<DataQualityResponse>('/data-quality', { signal });
}
