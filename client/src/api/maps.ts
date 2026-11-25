import { apiClient } from './client';
import {
  AutocompleteResponse,
  CandidateStatusUpdateRequest,
  CandidateSummaryResponse,
  CandidateVerificationStatus,
  DirectionsRequest,
  DirectionsResponse,
  DiscoveredStation,
  MapSearchResponse,
  MapsStatusResponse,
  PlaceDetailsRequest,
  PlaceDetailsResponse,
} from '../types/maps';

export async function searchCngStations(
  query?: string,
  lat = 23.0225,
  lng = 72.5714,
  zoom = 12,
  signal?: AbortSignal
): Promise<MapSearchResponse> {
  return apiClient<MapSearchResponse>('/maps/search', {
    params: { q: query, lat, lng, zoom },
    signal,
    timeoutMs: 25000,
  });
}

export async function autocompleteLocations(
  query: string,
  lat = 23.0225,
  lng = 72.5714,
  signal?: AbortSignal
): Promise<AutocompleteResponse> {
  return apiClient<AutocompleteResponse>('/maps/autocomplete', {
    params: { q: query, lat, lng },
    signal,
    timeoutMs: 15000,
  });
}

export async function getPlaceDetails(
  req: PlaceDetailsRequest,
  signal?: AbortSignal
): Promise<PlaceDetailsResponse> {
  return apiClient<PlaceDetailsResponse>('/maps/place-details', {
    method: 'POST',
    body: JSON.stringify(req),
    signal,
    timeoutMs: 25000,
  });
}

export async function calculateDirections(
  req: DirectionsRequest,
  signal?: AbortSignal
): Promise<DirectionsResponse> {
  return apiClient<DirectionsResponse>('/maps/directions', {
    method: 'POST',
    body: JSON.stringify(req),
    signal,
    timeoutMs: 25000,
  });
}

export async function getDiscoveredStations(
  signal?: AbortSignal
): Promise<DiscoveredStation[]> {
  return apiClient<DiscoveredStation[]>('/maps/discoveries', {
    signal,
    timeoutMs: 10000,
  });
}

export async function getCandidateStations(
  verification_status?: string,
  signal?: AbortSignal
): Promise<DiscoveredStation[]> {
  return apiClient<DiscoveredStation[]>('/maps/candidates', {
    params: verification_status ? { verification_status } : undefined,
    signal,
    timeoutMs: 10000,
  });
}

export async function getCandidateSummary(
  signal?: AbortSignal
): Promise<CandidateSummaryResponse> {
  return apiClient<CandidateSummaryResponse>('/maps/candidates/summary', {
    signal,
    timeoutMs: 10000,
  });
}

export async function updateCandidateStatus(
  candidateId: string,
  newStatus: CandidateVerificationStatus,
  notes?: string,
  signal?: AbortSignal
): Promise<DiscoveredStation> {
  const payload: CandidateStatusUpdateRequest = {
    status: newStatus,
    notes,
  };
  return apiClient<DiscoveredStation>(`/maps/candidates/${encodeURIComponent(candidateId)}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    signal,
    timeoutMs: 10000,
  });
}

export async function getMapsStatus(
  signal?: AbortSignal
): Promise<MapsStatusResponse> {
  return apiClient<MapsStatusResponse>('/maps/status', {
    signal,
    timeoutMs: 10000,
  });
}

export async function setMapsMode(
  mode: 'auto' | 'live' | 'demo',
  signal?: AbortSignal
): Promise<MapsStatusResponse> {
  return apiClient<MapsStatusResponse>('/maps/mode', {
    method: 'POST',
    body: JSON.stringify({ mode }),
    signal,
    timeoutMs: 10000,
  });
}
