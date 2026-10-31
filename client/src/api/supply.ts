import { apiClient } from './client';
import { SupplyCheckRequest, SupplyCheckResponse } from '../types/api';

export async function checkSupplyShortfall(
  request: SupplyCheckRequest,
  signal?: AbortSignal
): Promise<SupplyCheckResponse> {
  return apiClient<SupplyCheckResponse>('/supply-check', {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  });
}
