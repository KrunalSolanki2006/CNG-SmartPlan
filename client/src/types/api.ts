/**
 * Canonical TypeScript types corresponding to docs/API_CONTRACT.md.
 * Authoritative — neither frontend nor backend may diverge from these definitions.
 */

export type DataOrigin =
  | 'synthetic_demo'
  | 'real_public'
  | 'user_entered_scenario'
  | 'illustrative_scenario';

export interface ApiErrorDetail {
  code: string;
  message: string;
  fields?: Record<string, string[]> | null;
}

export interface ApiResponseError {
  error: ApiErrorDetail;
}

/* 1. Health */
export interface HealthLoadedStats {
  stations: number;
  eligible_stations: number;
  daily_sales_rows: number;
  supply_rows: number;
  hourly_rows: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  data_loaded: HealthLoadedStats;
}

/* 2. Overview */
export interface StationCountsOverview {
  total_in_inventory: number;
  eligible_for_simulation: number;
  eligible_for_map_display: number;
  note: string;
}

export interface NetworkSummaryOverview {
  data_origin: DataOrigin;
  date_range_start: string;
  date_range_end: string;
  total_stations_in_series: number;
  mean_daily_network_demand_kg: number;
  note: string;
}

export interface ForecastSummaryOverview {
  data_origin: DataOrigin;
  horizon_days: number;
  stations_forecasted: number;
  note: string;
}

export interface ShortfallAlertsOverview {
  data_origin: DataOrigin;
  total_station_days_with_shortfall: number;
  stations_with_current_alert: string[];
  note: string;
}

export interface HourlySummaryOverview {
  data_origin: DataOrigin;
  stations_with_hourly_data: string[];
  hourly_period_start: string;
  hourly_period_end: string;
}

export interface DataQualityFlagsOverview {
  verified_coordinates: boolean;
  real_sales_data: boolean;
  real_supply_data: boolean;
  holiday_data: boolean;
}

export interface OverviewResponse {
  station_counts: StationCountsOverview;
  network_summary: NetworkSummaryOverview;
  forecast_summary: ForecastSummaryOverview;
  shortfall_alerts: ShortfallAlertsOverview;
  hourly_summary: HourlySummaryOverview;
  data_quality_flags: DataQualityFlagsOverview;
  generated_at: string;
}

/* 3. Stations */
export type SimulationProfile = 'central_urban' | 'commuter_corridor' | 'mixed_urban';

export interface Station {
  station_id: string;
  station_name: string;
  locality: string;
  address: string;
  pincode: string;
  operator: string;
  brand: string;
  cng_status: string;
  in_study_area: 'yes' | 'no' | 'uncertain';
  coordinates_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  verification_status: string;
  data_origin: DataOrigin;
  simulation_profile: SimulationProfile;
  eligible_for_simulation: boolean;
  eligible_for_map_pin: boolean;
}

export interface StationsResponse {
  stations: Station[];
  total: number;
  eligible_for_simulation: number;
  eligible_for_map_pin: number;
  map_availability: {
    available: boolean;
    reason: string;
  };
}

/* 4. History */
export interface DailySalesPoint {
  date: string;
  demand_kg: number;
  day_of_week: string;
  is_weekend: boolean;
  simulation_profile: string;
}

export interface StationHistoryResponse {
  station_id: string;
  station_name: string;
  data_origin: DataOrigin;
  aggregation: 'daily' | 'weekly';
  date_range_start: string;
  date_range_end: string;
  total_records: number;
  missing_records: number;
  missing_holiday_data: boolean;
  series: DailySalesPoint[];
  note: string;
}

/* 5. Forecast */
export type ForecastStatus =
  | 'current'
  | 'stale'
  | 'simulated'
  | 'insufficient_data'
  | 'unavailable';

export type DataFreshness = 'current' | 'stale' | 'unavailable';

export type DemandTrend = 'increasing' | 'decreasing' | 'stable' | 'unavailable';

export interface ForecastRequest {
  station_id: string;
  horizon_days?: number;
  model?: 'holt_winters' | 'rolling_mean_baseline';
  include_baseline?: boolean;
}

export interface ForecastPoint {
  date: string;
  forecast_demand_kg: number;
  lower_bound_kg: number | null;
  upper_bound_kg: number | null;
  model: string;
}

export interface HistoricalContextPoint {
  date: string;
  demand_kg: number;
  day_of_week: string;
  is_weekend: boolean;
  data_type: string;
}

export interface ForecastEvaluation {
  baseline_model: string;
  baseline_mae_kg: number | null;
  baseline_rmse_kg: number | null;
  baseline_smape_pct: number | null;
  model_mae_kg: number | null;
  model_rmse_kg: number | null;
  model_smape_pct: number | null;
  note: string;
}

export interface ForecastReliability {
  data_source: DataOrigin | string;
  history_days: number;
  missing_values: number;
  missing_holiday_data: boolean;
  confidence_interval_available: boolean;
  evaluation_note: string;
}

export interface ExclusionRecord {
  reason: string;
  count: number;
}

export interface DataAuditSummary {
  earliest_date: string | null;
  latest_date: string | null;
  total_raw_records: number;
  valid_records: number;
  excluded_records: number;
  duplicate_records: number;
  invalid_or_negative_records: number;
  missing_dates_in_range: number;
  provenance_counts: Record<string, number>;
  exclusion_reasons: ExclusionRecord[];
}

export interface FreshnessPolicy {
  max_age_days_for_current: number;
  data_age_days: number | null;
  is_stale: boolean;
  is_simulated: boolean;
  policy_note: string;
}

export interface ModelInfo {
  model_id: string;
  model_name: string;
  model_version?: string;
  seasonal_period_days: number | null;
  confidence_interval_method: string | null;
  parameters_note: string;
}

export interface ValidationPeriod {
  start: string | null;
  end: string | null;
  n_records: number;
}

export interface ForecastStationSummaryItem {
  station_id: string;
  station_name: string;
  district: string;
  city: string;
  operator: string;
  simulation_profile: string;
  eligible_for_simulation: boolean;
  history_records: number;
  earliest_date: string | null;
  latest_date: string | null;
  data_origin: string;
}

export interface ForecastStationsListResponse {
  total_eligible_stations: number;
  stations: ForecastStationSummaryItem[];
  data_origin: string;
  generated_at: string;
}

export interface NetworkStationForecastSummary {
  station_id: string;
  station_name: string;
  district: string;
  simulation_profile: string;
  forecast_status: string;
  historical_recent_avg_kg: number | null;
  forecast_avg_demand_kg: number | null;
  demand_trend: string;
  model_mae_kg: number | null;
  baseline_mae_kg: number | null;
  model_smape_pct: number | null;
  baseline_smape_pct: number | null;
}

export interface NetworkEvaluationSummary {
  stations_evaluated: number;
  mean_hw_mae_kg: number | null;
  mean_hw_rmse_kg: number | null;
  mean_hw_smape_pct: number | null;
  mean_baseline_mae_kg: number | null;
  mean_baseline_rmse_kg: number | null;
  mean_baseline_smape_pct: number | null;
  holt_winters_outperforms_baseline_count: number;
  note: string;
}

export interface NetworkForecastSummaryResponse {
  horizon_days: number;
  model_used: string;
  model_version: string;
  data_origin: string;
  forecast_status: ForecastStatus;
  data_freshness: DataFreshness;
  data_through_date: string | null;
  target_start_date: string | null;
  target_end_date: string | null;
  forecast_generated_at: string;
  eligible_stations: number;
  successfully_forecasted_stations: number;
  insufficient_data_stations: number;
  failed_stations: number;
  failed_or_insufficient_station_ids: string[];
  simulated_network_demand_kg_per_day: number;
  historical_network_recent_avg_kg_per_day: number;
  network_demand_trend: DemandTrend;
  network_trend_change_pct: number | null;
  network_evaluation: NetworkEvaluationSummary;
  station_summaries: NetworkStationForecastSummary[];
  note: string;
}

export interface ForecastDataStatusResponse {
  data_origin: string;
  current_date: string;
  data_through_date: string | null;
  data_age_days: number | null;
  data_freshness: DataFreshness;
  forecast_status: ForecastStatus;
  eligible_stations: number;
  stations_with_data: number;
  total_historical_records: number;
  cache_entries: number;
  model_version: string;
  freshness_policy: FreshnessPolicy;
  external_datasets_loaded: Record<string, number>;
  limitations: string[];
  checked_at: string;
}

export interface ForecastResponse {
  station_id: string;
  station_name: string;
  model_used: string;
  model_version?: string;
  data_origin: DataOrigin | string;
  horizon_days: number;
  forecast_generated_at: string;
  current_date: string;
  data_age_days: number | null;
  forecast_status: ForecastStatus;
  data_freshness: DataFreshness;
  forecast_origin_date: string | null;
  data_through_date: string | null;
  target_start_date: string | null;
  target_end_date: string | null;
  is_historical_replay: boolean;
  historical_demo_notice: string;
  historical_avg_demand_kg: number | null;
  historical_recent_avg_kg: number | null;
  forecast_avg_demand_kg: number | null;
  demand_trend: DemandTrend;
  trend_change_pct: number | null;
  key_insight: string;
  train_period: {
    start: string | null;
    end: string | null;
    n_records: number;
  };
  validation_period?: ValidationPeriod | null;
  test_period: {
    start: string | null;
    end: string | null;
    n_records: number;
  };
  validation_evaluation?: ForecastEvaluation | null;
  evaluation: ForecastEvaluation;
  model_info: ModelInfo;
  freshness_policy: FreshnessPolicy;
  data_audit: DataAuditSummary;
  historical_context: HistoricalContextPoint[];
  forecast: ForecastPoint[];
  baseline_forecast: ForecastPoint[] | null;
  reliability: ForecastReliability;
  limitations: string[];
}

/* 6. Supply Check */
export interface UserSupplyOverride {
  date: string;
  supply_kg: number;
}

export interface SupplyCheckRequest {
  station_id: string;
  horizon_days?: number;
  supply_source?: 'synthetic' | 'user_entered';
  user_supply_overrides?: UserSupplyOverride[] | null;
}

export interface SupplyComparisonPoint {
  date: string;
  forecast_demand_kg: number;
  planned_supply_kg: number | null;
  supply_data_origin: DataOrigin;
  potential_shortfall_kg: number | null;
  has_shortfall: boolean | null;
  supply_status?: string;
}

export interface SupplySummary {
  days_with_shortfall: number;
  max_shortfall_kg: number;
  total_shortfall_kg: number;
  days_covered?: number;
  days_missing_supply?: number;
  active_user_overrides_count?: number;
  dates_requiring_override?: string[];
  alert_label?: string;
}

export interface SupplyCheckResponse {
  station_id: string;
  station_name: string;
  data_origin: DataOrigin;
  supply_source: string;
  comparison: SupplyComparisonPoint[];
  summary: SupplySummary;
  warnings: string[];
}

/* 7. Hourly Demand */
export interface HourlyRecord {
  station_id: string;
  datetime: string;
  date: string;
  hour: number;
  hourly_demand_kg: number;
  day_of_week: string;
  is_weekend: boolean;
  simulation_profile: string;
}

export interface HourlyResponse {
  data_origin: DataOrigin;
  available_stations: string[];
  period_start: string;
  period_end: string;
  records: HourlyRecord[];
  total_records: number;
  note: string;
}

/* 8. Impact Simulator */
export interface ImpactSimulatorRequest {
  proposed_latitude: number;
  proposed_longitude: number;
  catchment_radius_km: number;
  catchment_demand_kg_per_day: number;
  capture_proportion: number;
  diversion_proportion: number;
  accessibility_demand_kg_per_day?: number;
}

export interface ImpactSimulatorResults {
  proposed_station_demand_kg_per_day: number;
  estimated_diverted_demand_kg_per_day: number;
  net_additional_network_demand_kg_per_day: number;
  network_baseline_daily_demand_kg?: number;
  scenario_network_daily_demand_kg?: number;
}

export interface SensitivityPoint {
  capture_proportion: number;
  diversion_proportion: number;
  proposed_station_demand_kg: number;
  diverted_demand_kg: number;
  net_additional_demand_kg: number;
}

export interface ImpactSimulatorResponse {
  data_origin: DataOrigin;
  assumptions: {
    proposed_latitude: number;
    proposed_longitude: number;
    catchment_radius_km: number;
    catchment_demand_kg_per_day: number;
    capture_proportion: number;
    diversion_proportion: number;
    accessibility_demand_kg_per_day: number;
  };
  results: ImpactSimulatorResults;
  formulas_applied: {
    proposed_station_demand: string;
    estimated_diverted_demand: string;
    net_additional_network_demand: string;
  };
  geographic_analysis: {
    available: boolean;
    reason: string;
    nearby_stations: null | unknown[];
  };
  sensitivity_analysis?: SensitivityPoint[];
  warnings: string[];
}

/* 9. Data Quality */
export interface StationInventoryQuality {
  total_stations: number;
  eligible_for_simulation: number;
  eligible_for_map_pin: number;
  data_origin: DataOrigin;
  sources: string[];
  access_date: string;
  coordinate_status: string;
}

export interface SyntheticSeriesQuality {
  rows: number;
  columns: number;
  stations?: number;
  date_range_start?: string;
  date_range_end?: string;
  period_start?: string;
  period_end?: string;
  missing_holiday_rows?: number;
  data_origin: DataOrigin;
}

export interface BaselineEvaluationQuality {
  model: string;
  evaluation_type: string;
  train_end: string;
  test_start: string;
  test_end: string;
  test_station_days: number;
  mae_kg: number;
  rmse_kg: number;
  smape_pct: number;
  data_origin: DataOrigin;
  note: string;
}

export interface DataGapItem {
  gap: string;
  impact: string;
}

export interface DataQualityResponse {
  generated_at: string;
  station_inventory: StationInventoryQuality;
  synthetic_data: {
    daily_sales: SyntheticSeriesQuality;
    supply: SyntheticSeriesQuality;
    hourly_demand: SyntheticSeriesQuality;
  };
  baseline_evaluation: BaselineEvaluationQuality;
  data_gaps: DataGapItem[];
}
