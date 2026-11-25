/**
 * TypeScript interfaces for Candidate Location Ranking, Dossiers, and Gujarat Network.
 * Strictly aligned with backend server/schemas/candidates.py.
 */

export interface ScoringWeightsConfig {
  demand_weight: number;
  service_gap_weight: number;
  road_accessibility_weight: number;
  distance_weight: number;
  min_distance_threshold_km: number;
  service_gap_ideal_km: number;
}

export interface CriterionScore {
  criterion_key: string;
  criterion_name: string;
  raw_value: number | null;
  unit: string;
  normalized_score: number | null;
  base_weight: number;
  effective_weight: number;
  weighted_contribution: number | null;
  is_missing: boolean;
  explanation: string;
}

export interface NearbyStationSummary {
  station_id: string;
  station_name: string;
  city: string;
  district: string;
  straight_line_distance_km: number;
  driving_road_distance_km?: number | null;
  drive_time_text?: string | null;
  is_verified?: boolean;
}

export interface NearestStationEvidence {
  station_id: string;
  station_name: string;
  city: string;
  district: string;
  straight_line_distance_km: number;
  road_distance_km?: number | null;
  driving_road_distance_km?: number | null;
  drive_time_text?: string | null;
  drive_time_mins?: number | null;
  detour_ratio?: number | null;
  is_network_cannibalization_risk?: boolean;
  is_verified?: boolean;
  nearest_lat?: number;
  nearest_lng?: number;
  route_available?: boolean;
  polyline_coords?: number[][];
  nearest_three_stations?: NearbyStationSummary[];
  stations_within_radius?: Record<string, number>;
}

export interface CandidateLocationModel {
  candidate_id: string;
  name: string;
  city: string;
  district: string;
  category: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  highway_corridor: string;
  road_type: string;
  aadt_commercial_traffic: number | null;
  industrial_density_index: number | null;
  service_gap_radius_km: number | null;
  pipeline_proximity_meters: number | null;
  data_completeness_pct: number;
  missing_criteria: string[];
  verification_status: string;
  source_reference: string;
  source_type: string;
  rationale: string;
}

export interface CandidateRankingItem {
  candidate_id: string;
  name: string;
  city: string;
  district: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  highway_corridor: string;
  final_score: number | null;
  rank: number | null;
  is_rankable: boolean;
  unrankable_reason: string | null;
  data_completeness_pct: number;
  confidence_tier: 'High' | 'Moderate' | 'Low' | 'Indeterminate';
  demand_score: number | null;
  service_gap_score: number | null;
  road_accessibility_score: number | null;
  distance_score: number | null;
  nearest_station: NearestStationEvidence | null;
  summary_verdict: string;
}

export interface CandidateRankingsResponse {
  total_candidates: number;
  rankable_count: number;
  unrankable_count: number;
  weights_applied: ScoringWeightsConfig;
  candidates: CandidateRankingItem[];
  available_cities: string[];
  available_districts: string[];
  available_categories: string[];
  governance_notice: string;
}

export interface CandidateDossierResponse {
  candidate: CandidateLocationModel;
  is_rankable: boolean;
  unrankable_reason: string | null;
  rank: number | null;
  final_score: number | null;
  confidence_tier: string;
  data_completeness_pct: float_or_number;
  scoring_breakdown: CriterionScore[];
  weights_applied: Record<string, number>;
  renormalization_applied: boolean;
  nearest_station: NearestStationEvidence | null;
  full_audit_explanation: string;
  feasibility_disclaimer: string;
}

type float_or_number = number;

export interface GujaratStationModel {
  station_id: string;
  station_name: string;
  operator: string;
  brand: string;
  address: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  rating: number | null;
  reviews_count: number | null;
  verification_status: string;
  cng_dispensing_confirmed: boolean;
  data_source: string;
  source_url: string | null;
  retrieved_at: string;
  last_verified_at: string | null;
  notes: string;
  cng_classification?: 'VERIFIED_OPERATING_CNG' | 'DISCOVERED_CNG' | 'POTENTIAL_CNG' | 'NOT_CNG' | 'CONFIRMED_CNG';
  previous_classification?: string;
  status_change_reason?: string;
  cng_audit_reason?: string;
  cng_business_type?: string;
  historical_daily_demand_kg?: number | null;
  forecasted_daily_demand_kg?: number | null;
  demand_data_available?: boolean;
  demand_notes?: string | null;
}

export interface DiscoveryDiagnosticsModel {
  last_discovery_time: string | null;
  cities_searched: string[];
  api_requests_total: number;
  api_requests_successful: number;
  api_requests_cached: number;
  api_requests_failed: number;
  results_discovered: number;
  new_records_added: number;
  duplicate_records: number;
  manual_verification_required: number;
  mode: 'LIVE API RESULTS' | 'CACHED RESULTS' | 'OFFLINE DEMO DATA';
  city_breakdown?: Record<
    string,
    {
      status: string;
      raw_results?: number;
      new_stations_added?: number;
      cached?: boolean;
      error?: string;
    }
  >;
}

export interface GujaratNetworkStationsResponse {
  total_stations: number;
  verified_count: number;
  discovered_count: number;
  requires_review_count: number;
  verified_operating_count?: number;
  discovered_cng_count?: number;
  potential_count?: number;
  rejected_count?: number;
  confirmed_count?: number;
  stations: GujaratStationModel[];
  available_cities?: string[];
  available_districts?: string[];
  diagnostics?: DiscoveryDiagnosticsModel | null;
}

export interface RecalculateRankingRequest {
  weights?: Partial<ScoringWeightsConfig>;
  city_filter?: string;
  district_filter?: string;
  category_filter?: string;
  min_score?: number;
  rankable_only?: boolean;
}

export interface CandidateCreateRequest {
  name: string;
  city?: string;
  district?: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  selected_location?: string;
  locality?: string;
  road_corridor?: string;
  nearest_major_highway?: string;
  highway_tier?: string;
  traffic_pcu_per_day?: number | null;
  commercial_vehicle_density_proxy?: number | null;
  pipeline_proximity_meters?: number | null;
  land_zoning?: string;
  expected_daily_capacity_kg?: number | null;
  place_id?: string | null;
  notes?: string;
}

export type ValueClassification =
  | 'Actual historical data'
  | 'Forecasted value'
  | 'Model-based estimate'
  | 'Scenario assumption'
  | 'Provided scenario input'
  | 'Unavailable';

export interface NearbyVerifiedStation {
  station_id: string;
  station_name: string;
  distance_km: number;
  address: string;
  locality: string;
  city: string;
  district: string;
  operator: string;
  brand: string;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  data_source: string;
  demand_data_available: boolean;
  historical_daily_demand_kg?: number | null;
  forecasted_daily_demand_kg?: number | null;
  daily_capacity_kg?: number | null;
  capacity_data_available?: boolean;
}

export interface ProposedLocationPoint {
  name?: string | null;
  location_label?: string | null;
  latitude: number;
  longitude: number;
  expected_daily_capacity_kg?: number | null;
  in_gujarat_bounds: boolean;
  status?: string;
}

export interface NearbyStationsResponse {
  proposed_location: ProposedLocationPoint;
  radius_km: number;
  total_verified_stations_checked: number;
  nearby_count: number;
  nearby_stations: NearbyVerifiedStation[];
  nearest_station: NearbyVerifiedStation | null;
  farthest_nearby_station: NearbyVerifiedStation | null;
  nearest_overall_station: NearbyVerifiedStation | null;
  distance_method: string;
  data_integrity_note: string;
}

export interface NetworkImpactSimulationRequest {
  proposed_name?: string;
  proposed_location_label?: string;
  proposed_latitude: number;
  proposed_longitude: number;
  radius_km: number;
  expected_daily_capacity_kg?: number | null;
  candidate_id?: string | null;
}

export type OverallAssessmentLabel =
  | 'Potential Coverage Gap'
  | 'High Existing Station Density'
  | 'Moderate Geographical Overlap'
  | 'Potential Network Expansion Opportunity'
  | 'Insufficient Data';

export type BeneficialOutcomeLabel =
  | 'Potentially Beneficial'
  | 'Potentially Not Beneficial'
  | 'Inconclusive / Insufficient Data';

export interface DiversionAssessment {
  status: string;
  available: boolean;
  spatial_overlap_risk: 'None' | 'Low' | 'Moderate' | 'High' | 'Unknown';
  explanation: string;
  demand_data_origin?: string;
  stations_with_demand_data?: number;
  stations_without_demand_data?: number;
}

export interface StationSalesImpactRow {
  station_id: string;
  station_name: string;
  city: string;
  operator: string;
  distance_km: number;
  is_nearest: boolean;
  has_sales_data: boolean;
  sales_data_classification: ValueClassification;
  current_daily_sales_kg: number | null;
  forecasted_daily_demand_kg: number | null;
  estimated_diversion_share: number | null;
  estimated_sales_loss_kg: number | null;
  remaining_daily_sales_kg: number | null;
  reduction_pct: number | null;
  loss_classification: ValueClassification;
  capacity_available: boolean;
  daily_capacity_kg: number | null;
  status_label: string;
}

export interface DemandAndSalesEstimate {
  available: boolean;
  status: 'Estimated (Scenario-Based)' | 'Insufficient Data';
  data_origin: string;
  methodology: string;
  nearest_station_name: string | null;
  nearest_station_distance_km: number | null;
  nearby_with_sales_count: number;
  nearby_total_count: number;
  avg_nearby_daily_sales_kg: number | null;
  potential_daily_demand_kg: number | null;
  potential_daily_sales_kg: number | null;
  potential_monthly_sales_kg: number | null;
  diverted_from_nearby_kg: number | null;
  incremental_coverage_gain_kg: number | null;
  capacity_provided_kg: number | null;
  capacity_utilization_pct: number | null;
  capacity_status: string;
  demand_classification: ValueClassification;
  sales_classification: ValueClassification;
  assumptions: string[];
  limitations: string[];
  reason_unavailable: string | null;
}

export interface NetworkSalesImpactSummary {
  available: boolean;
  status: 'Calculated (Scenario-Based)' | 'Insufficient Data';
  proposed_station_daily_sales_kg: number | null;
  total_nearby_sales_loss_kg: number | null;
  net_network_sales_change_kg: number | null;
  network_sales_before_kg: number | null;
  network_sales_after_kg: number | null;
  existing_stations_sales_after_kg: number | null;
  net_network_impact_pct: number | null;
  station_count_with_sales: number;
  station_count_without_sales: number;
  classification: ValueClassification;
  note: string;
  reason_unavailable: string | null;
}

export interface BeneficialAssessment {
  outcome: BeneficialOutcomeLabel;
  confidence: 'Scenario-based' | 'Insufficient data';
  summary: string;
  criteria_evaluated: string[];
  missing_data_requirements: string[];
  caveat: string;
}

export interface GeographicalMetrics {
  nearby_verified_count: number;
  total_verified_stations_checked: number;
  nearest_station: NearbyVerifiedStation | null;
  nearest_within_radius: NearbyVerifiedStation | null;
  farthest_nearby_station: NearbyVerifiedStation | null;
  average_nearby_distance_km: number | null;
  coverage_improvement_level: 'High' | 'Moderate' | 'Low' | 'Minimal' | 'Insufficient Data';
  coverage_improvement_summary: string;
  overlap_level: 'None' | 'Low' | 'Moderate' | 'High' | 'Insufficient Data';
  overlap_summary: string;
}

export interface NetworkImpactSimulationResponse {
  proposed_station: ProposedLocationPoint;
  radius_km: number;
  candidate_id?: string | null;
  overall_assessment: OverallAssessmentLabel;
  assessment_summary: string;
  geographical_metrics: GeographicalMetrics;
  nearby_stations: NearbyVerifiedStation[];
  diversion_assessment: DiversionAssessment;
  station_impact_rows?: StationSalesImpactRow[];
  demand_estimate?: DemandAndSalesEstimate;
  network_sales_impact?: NetworkSalesImpactSummary;
  beneficial_assessment?: BeneficialAssessment;
  metric_methodology_note: string;
  data_integrity_note: string;
  warnings: string[];
}

export interface CandidateUpdateRequest {
  name?: string;
  city?: string;
  district?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  locality?: string;
  road_corridor?: string;
  nearest_major_highway?: string;
  highway_tier?: string;
  traffic_pcu_per_day?: number | null;
  commercial_vehicle_density_proxy?: number | null;
  pipeline_proximity_meters?: number | null;
  land_zoning?: string;
  notes?: string;
}

export interface CandidateCompareRequest {
  candidate_ids: string[];
}

export interface CandidateComparisonItem {
  candidate_id: string;
  name: string;
  city: string;
  district: string;
  category: string;
  rank: number | null;
  final_score: number | null;
  confidence_tier: string;
  data_completeness_pct: number;
  demand_score: number | null;
  service_gap_score: number | null;
  road_accessibility_score: number | null;
  distance_score: number | null;
  nearest_station_name: string | null;
  nearest_station_distance_km: number | null;
  summary_verdict: string;
}

export interface CandidateCompareResponse {
  candidates: CandidateComparisonItem[];
  best_overall_candidate: string;
  highest_demand_candidate: string;
  largest_service_gap_candidate: string;
  best_accessibility_candidate: string;
  closest_to_existing_network: string;
  most_isolated_candidate: string;
  comparison_summary: string;
}
