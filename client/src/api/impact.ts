import { apiClient } from './client';
import { ImpactSimulatorRequest, ImpactSimulatorResponse } from '../types/api';

export async function simulateImpact(
  request: ImpactSimulatorRequest,
  signal?: AbortSignal
): Promise<ImpactSimulatorResponse> {
  return apiClient<ImpactSimulatorResponse>('/impact-simulator', {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  });
}
