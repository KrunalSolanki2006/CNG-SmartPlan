import { apiClient } from './client';
import {
  CandidateDossierResponse,
  CandidateRankingsResponse,
  GujaratNetworkStationsResponse,
  RecalculateRankingRequest,
  CandidateCreateRequest,
  CandidateUpdateRequest,
  CandidateCompareResponse,
  CandidateLocationModel,
} from '../types/candidates';

export async function fetchCandidateRankings(
  params?: {
    city?: string;
    district?: string;
    category?: string;
    min_score?: number;
    rankable_only?: boolean;
  },
  signal?: AbortSignal
): Promise<CandidateRankingsResponse> {
  return apiClient<CandidateRankingsResponse>('/candidates', {
    params: params as Record<string, string | number | boolean | undefined>,
    signal,
  });
}

export async function fetchCandidateDossier(
  candidateId: string,
  signal?: AbortSignal
): Promise<CandidateDossierResponse> {
  return apiClient<CandidateDossierResponse>(`/candidates/${candidateId}`, {
    signal,
  });
}

export async function fetchCandidateEvidence(
  candidateId: string,
  signal?: AbortSignal
): Promise<any> {
  return apiClient<any>(`/candidates/${candidateId}/evidence`, {
    signal,
  });
}

export async function recalculateRankings(
  payload: RecalculateRankingRequest,
  signal?: AbortSignal
): Promise<CandidateRankingsResponse> {
  return apiClient<CandidateRankingsResponse>('/candidates/recalculate', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function fetchGujaratNetworkStations(
  params?: {
    city?: string;
    district?: string;
    verification_status?: string;
    operational_status?: string;
    search?: string;
  },
  signal?: AbortSignal
): Promise<GujaratNetworkStationsResponse> {
  return apiClient<GujaratNetworkStationsResponse>('/network/stations', {
    params: params as Record<string, string | undefined>,
    signal,
  });
}

export async function createCandidate(
  payload: CandidateCreateRequest,
  signal?: AbortSignal
): Promise<CandidateLocationModel> {
  return apiClient<CandidateLocationModel>('/candidates', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function updateCandidate(
  candidateId: string,
  payload: CandidateUpdateRequest,
  signal?: AbortSignal
): Promise<CandidateLocationModel> {
  return apiClient<CandidateLocationModel>(`/candidates/${candidateId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function deleteCandidate(
  candidateId: string,
  signal?: AbortSignal
): Promise<{ status: string; message: string; deleted_id: string }> {
  return apiClient<{ status: string; message: string; deleted_id: string }>(`/candidates/${candidateId}`, {
    method: 'DELETE',
    signal,
  });
}

export async function compareCandidates(
  candidateIds: string[],
  signal?: AbortSignal
): Promise<CandidateCompareResponse> {
  return apiClient<CandidateCompareResponse>('/candidates/compare', {
    method: 'POST',
    body: JSON.stringify({ candidate_ids: candidateIds }),
    signal,
  });
}
