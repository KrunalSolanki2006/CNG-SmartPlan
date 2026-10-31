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

export interface ForecastEvaluation {
  baseline_model: string;
  baseline_mae_kg: number;
  baseline_rmse_kg: number;
  baseline_smape_pct: number;
  model_mae_kg: number | null;
  model_rmse_kg: number | null;
  model_smape_pct: number | null;
  note: string;
}

export interface ForecastReliability {
  data_source: DataOrigin;
  history_days: number;
  missing_values: number;
  missing_holiday_data: boolean;
  confidence_interval_available: boolean;
  evaluation_note: string;
}

export interface ForecastResponse {
  station_id: string;
  station_name: string;
  model_used: string;
  data_origin: DataOrigin;
  horizon_days: number;
  train_period: {
    start: string;
    end: string;
    n_records: number;
  };
  test_period: {
    start: string;
    end: string;
    n_records: number;
  };
  evaluation: ForecastEvaluation;
  forecast: ForecastPoint[];
  baseline_forecast: ForecastPoint[];
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
}

export interface SupplySummary {
  days_with_shortfall: number;
  max_shortfall_kg: number;
  total_shortfall_kg: number;
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
