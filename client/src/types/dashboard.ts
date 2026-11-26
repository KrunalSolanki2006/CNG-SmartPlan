export interface CityStationCount {
  city: string;
  district: string;
  station_count: number;
  share_pct: number;
}

export interface DistrictStationCount {
  district: string;
  station_count: number;
  share_pct: number;
}

export interface VerifiedStationCoordinate {
  station_id: string;
  station_name: string;
  city: string;
  district: string;
  operator: string;
  latitude: number;
  longitude: number;
}

export interface GeographicCoverageSummary {
  min_latitude: number | null;
  max_latitude: number | null;
  min_longitude: number | null;
  max_longitude: number | null;
  verified_coordinate_stations: number;
  total_verified_stations: number;
  data_origin: string;
}

export interface GujaratNetworkSummary {
  total_verified_stations: number;
  excluded_or_unverified_count: number;
  cities_covered_count: number;
  cities_covered: string[];
  districts_covered_count: number;
  districts_covered: string[];
  station_distribution_by_city: CityStationCount[];
  station_distribution_by_district: DistrictStationCount[];
  verified_coordinates: VerifiedStationCoordinate[];
  geographic_coverage: GeographicCoverageSummary;
  data_origin: string;
}

export interface DailyAggregateForecastPoint {
  date: string;
  total_demand_kg: number;
  stations_included: number;
}

export interface PeakDemandDaySummary {
  date: string;
  total_demand_kg: number;
  stations_included: number;
}

export interface ForecastCoverageSummary {
  verified_stations_total: number;
  stations_with_valid_forecast: number;
  stations_unavailable_or_insufficient: number;
  coverage_ratio_label: string;
  coverage_pct: number;
}

export interface AggregatedDemandForecast {
  data_origin: string;
  is_synthetic: boolean;
  model_used: string;
  horizon_days: number;
  date_range_start: string | null;
  date_range_end: string | null;
  total_forecasted_demand_kg: number | null;
  average_daily_forecast_demand_kg: number | null;
  historical_recent_avg_daily_kg: number | null;
  demand_trend: string;
  trend_change_pct: number | null;
  expected_peak_demand_day: PeakDemandDaySummary | null;
  daily_series: DailyAggregateForecastPoint[];
  coverage: ForecastCoverageSummary;
  note: string;
}

export interface DashboardAlertNotification {
  station_id: string;
  station_name: string;
  district: string;
  alert_type: 'potential_supply_shortage' | 'compressor_outage' | 'peak_demand_warning' | string;
  severity: 'critical' | 'warning' | string;
  message: string;
  metric_value: number | null;
  metric_unit: string | null;
  timestamp: string;
  data_origin: string;
}

export interface SupplyAlertAggregation {
  data_origin: string;
  total_active_alerts: number;
  distinct_stations_affected: number;
  critical_alerts_count: number;
  warning_alerts_count: number;
  peak_demand_warnings_count: number;
  potential_supply_shortage_alerts_count: number;
  future_supply_schedule_status: string;
  recent_notifications: DashboardAlertNotification[];
  note: string;
}

export interface ServiceGapArea {
  area_name: string;
  city: string;
  district: string;
  nearest_verified_station_km: number | null;
  service_gap_score: number | null;
  reason: string;
}

export interface NetworkIntelligenceSummary {
  status: string;
  data_origin: string;
  trailing_window_start: string | null;
  trailing_window_end: string | null;
  aggregate_demand_kg_per_day: number | null;
  aggregate_effective_supply_kg_per_day: number | null;
  net_supply_demand_balance_kg_per_day: number | null;
  supply_demand_balance_pct: number | null;
  overall_balance_status: string;
  future_planned_supply_status: string;
  areas_with_insufficient_coverage: ServiceGapArea[];
  areas_for_further_evaluation: ServiceGapArea[];
  note: string;
}

export interface EvaluatedCandidateSummary {
  candidate_id: string;
  name: string;
  city: string;
  district: string;
  category: string;
  rank: number | null;
  evaluation_score: number | null;
  confidence_tier: string;
  nearest_station_distance_km: number | null;
  recommendation_status: 'Beneficial' | 'Not Beneficial' | 'Further Evaluation Required' | string;
  evaluated_at: string | null;
}

export interface ImpactSimulationHistoryStatus {
  available: boolean;
  status: string;
  estimated_additional_demand_kg_per_day: number | null;
  note: string;
}

export interface NetworkExpansionInsights {
  total_evaluated_candidates: number;
  rankable_candidates_count: number;
  recently_evaluated_locations: EvaluatedCandidateSummary[];
  highest_ranked_candidate: EvaluatedCandidateSummary | null;
  recommendation_breakdown: Record<string, number>;
  existing_impact_simulation: ImpactSimulationHistoryStatus;
  data_origin: string;
  note: string;
}

export interface DataProvenanceSummary {
  station_inventory_origin: string;
  demand_forecast_origin: string;
  supply_alerts_origin: string;
  candidate_evaluation_origin: string;
  real_sales_data_present: boolean;
  real_supply_data_present: boolean;
  last_historical_data_date: string | null;
  forecast_generated_at: string;
  dashboard_generated_at: string;
}

export interface MainDashboardOverviewResponse {
  network_summary: GujaratNetworkSummary;
  aggregated_forecast: AggregatedDemandForecast;
  supply_alerts: SupplyAlertAggregation;
  network_intelligence: NetworkIntelligenceSummary;
  expansion_insights: NetworkExpansionInsights;
  provenance: DataProvenanceSummary;
}
