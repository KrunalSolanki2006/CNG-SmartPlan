/**
 * TypeScript types for SerpApi Google Maps integrations, review workflow, and routing.
 */

export type CandidateVerificationStatus =
  | 'unverified_candidate'
  | 'pending_review'
  | 'verified_project_record'
  | 'rejected'
  | 'proposed_simulation_location';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export interface ReviewHistoryEntry {
  timestamp: string;
  previous_status: string;
  new_status: string;
  notes: string;
}

export interface DiscoveredStation {
  id: string;
  station_id: string;
  station_name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  verification_status: CandidateVerificationStatus | string;
  data_source: string;
  rating?: number | null;
  reviews_count?: number | null;
  open_state?: string | null;
  thumbnail?: string | null;
  phone?: string | null;
  place_id?: string | null;
  data_cid?: string | null;
  data_id?: string | null;
  google_maps_url?: string | null;
  operating_status?: string | null;
  is_within_study_area: boolean;
  discovered_at: string;
  is_fixture?: boolean;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  review_history?: ReviewHistoryEntry[];
  potential_duplicate_of?: string | null;
}

export interface MapSearchResponse {
  query: string;
  total_results: number;
  cached: boolean;
  is_fixture?: boolean;
  study_area_bbox: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
  };
  stations: DiscoveredStation[];
}

export interface AutocompleteSuggestion {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  suggestion_type: 'place' | 'keyword' | string;
  place_id?: string | null;
  data_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_selectable_place: boolean;
}

export interface AutocompleteResponse {
  query: string;
  cached: boolean;
  is_fixture?: boolean;
  suggestions: AutocompleteSuggestion[];
}

export interface PlaceDetailsRequest {
  place_id?: string | null;
  data_cid?: string | null;
  data_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PlaceReview {
  author?: string | null;
  rating?: number | null;
  date?: string | null;
  snippet?: string | null;
}

export interface PlaceDetailsResponse {
  place_id?: string | null;
  data_cid?: string | null;
  data_id?: string | null;
  title: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  open_state?: string | null;
  hours?: Array<{ day: string; hours: string }> | null;
  gps_coordinates?: GPSCoordinates | null;
  thumbnail?: string | null;
  images?: string[];
  google_maps_url?: string | null;
  reviews?: PlaceReview[];
  cached?: boolean;
  is_fixture?: boolean;
}

export interface DirectionsRequest {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  travel_mode?: number;
}

export interface RouteStep {
  instruction: string;
  distance?: string | null;
  duration?: string | null;
  gps_coordinates?: GPSCoordinates | null;
}

export interface RouteAlternative {
  route_id: number;
  summary?: string | null;
  distance_km: number;
  distance_text: string;
  duration_mins: number;
  duration_text: string;
  steps: RouteStep[];
  polyline_coords: [number, number][];
}

export interface DirectionsResponse {
  origin: GPSCoordinates;
  destination: GPSCoordinates;
  straight_line_distance_km: number;
  road_distance_km: number;
  detour_ratio: number;
  primary_duration_text: string;
  primary_duration_mins: number;
  routes: RouteAlternative[];
  cached?: boolean;
  is_fixture?: boolean;
}

export interface CandidateStatusUpdateRequest {
  status: CandidateVerificationStatus;
  notes?: string;
}

export interface CandidateSummaryResponse {
  total: number;
  unverified_count: number;
  pending_review_count: number;
  verified_count: number;
  rejected_count: number;
  proposed_simulation_count: number;
}

export interface MapsStatusResponse {
  mode: 'auto' | 'live' | 'demo' | string;
  api_key_configured: boolean;
  cache_entries_count: number;
  discoveries_count: number;
  offline_fixtures_available: boolean;
}
