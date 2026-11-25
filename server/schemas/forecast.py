"""Forecasting request and response schemas for station-level and network-level endpoints."""

from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ForecastRequest(BaseModel):
    """Request payload for POST /api/v1/forecast."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Eligible station identifier (e.g. AMD001)")
    horizon_days: int = Field(default=7, ge=1, le=30, description="Forecast horizon in days (1-30; 7, 14, 30 supported)")
    model: str = Field(
        default="holt_winters",
        pattern="^(holt_winters|rolling_mean_baseline)$",
        description="Model candidate: 'holt_winters' or 'rolling_mean_baseline'",
    )
    include_baseline: bool = Field(default=True, description="Whether to include 28-day rolling mean baseline")
    cutoff_date: Optional[str] = Field(default=None, description="Optional simulation cutoff date (YYYY-MM-DD)")


class TrainPeriod(BaseModel):
    """Chronological training window metadata."""

    model_config = ConfigDict(extra="forbid")

    start: Optional[str] = Field(default=None, description="Train start date (YYYY-MM-DD)")
    end: Optional[str] = Field(default=None, description="Train end date (YYYY-MM-DD)")
    n_records: int = Field(default=0, description="Number of daily training records")


class ValidationPeriod(BaseModel):
    """Chronological validation window metadata."""

    model_config = ConfigDict(extra="forbid")

    start: Optional[str] = Field(default=None, description="Validation start date (YYYY-MM-DD)")
    end: Optional[str] = Field(default=None, description="Validation end date (YYYY-MM-DD)")
    n_records: int = Field(default=0, description="Number of daily validation records")


class TestPeriod(BaseModel):
    """Chronological final evaluation (test) holdout window metadata."""

    model_config = ConfigDict(extra="forbid")

    start: Optional[str] = Field(default=None, description="Test start date (YYYY-MM-DD)")
    end: Optional[str] = Field(default=None, description="Test end date (YYYY-MM-DD)")
    n_records: int = Field(default=0, description="Number of daily test records")


class ForecastEvaluation(BaseModel):
    """Evaluation metrics on chronological holdout."""

    model_config = ConfigDict(extra="forbid")

    baseline_model: str = Field(default="rolling_mean_28d", description="Baseline benchmark model name")
    baseline_mae_kg: Optional[float] = Field(default=None, description="Station baseline Mean Absolute Error (kg/day)")
    baseline_rmse_kg: Optional[float] = Field(default=None, description="Station baseline Root Mean Squared Error (kg/day)")
    baseline_smape_pct: Optional[float] = Field(default=None, description="Station baseline sMAPE (%)")
    model_mae_kg: Optional[float] = Field(default=None, description="Candidate model MAE (kg/day)")
    model_rmse_kg: Optional[float] = Field(default=None, description="Candidate model RMSE (kg/day)")
    model_smape_pct: Optional[float] = Field(default=None, description="Candidate model sMAPE (%)")
    note: str = Field(..., description="Validation scope and synthetic caveat")


class ForecastPoint(BaseModel):
    """Individual forecast prediction point."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="Prediction date (YYYY-MM-DD)")
    forecast_demand_kg: float = Field(..., description="Forecast demand in kg/day")
    lower_bound_kg: Optional[float] = Field(default=None, description="Lower simulated prediction interval bound (kg/day)")
    upper_bound_kg: Optional[float] = Field(default=None, description="Upper simulated prediction interval bound (kg/day)")
    model: str = Field(..., description="Model identifier used for this point")


class HistoricalContextPoint(BaseModel):
    """Historical daily observation included for chart alignment."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="Observation date (YYYY-MM-DD)")
    demand_kg: float = Field(..., description="Historical CNG demand (kg/day)")
    day_of_week: str = Field(..., description="Day of week")
    is_weekend: bool = Field(..., description="True for Saturday/Sunday")
    data_type: str = Field(..., description="Record provenance tag")


class ForecastReliability(BaseModel):
    """Reliability indicators and confidence evaluation metadata."""

    model_config = ConfigDict(extra="forbid")

    data_source: str = Field(..., description="Data provenance classification")
    history_days: int = Field(..., description="Valid days of historical data available")
    missing_values: int = Field(..., description="Count of missing daily values in date span")
    missing_holiday_data: bool = Field(..., description="True if holiday flags are unassigned")
    confidence_interval_available: bool = Field(..., description="Whether prediction intervals are provided")
    evaluation_note: str = Field(..., description="Reliability explanation")


class ExclusionRecord(BaseModel):
    """Documented exclusion during station historical data audit."""

    model_config = ConfigDict(extra="forbid")

    reason: str = Field(..., description="Reason records were excluded")
    count: int = Field(..., description="Number of excluded records")


class DataAuditSummary(BaseModel):
    """Station-level historical data audit summary."""

    model_config = ConfigDict(extra="forbid")

    earliest_date: Optional[str] = Field(default=None, description="Earliest valid date (YYYY-MM-DD)")
    latest_date: Optional[str] = Field(default=None, description="Latest valid date (YYYY-MM-DD)")
    total_raw_records: int = Field(..., description="Total raw records for station")
    valid_records: int = Field(..., description="Valid eligible daily records")
    excluded_records: int = Field(..., description="Records excluded due to data quality rules")
    duplicate_records: int = Field(..., description="Duplicate station-date rows resolved")
    invalid_or_negative_records: int = Field(..., description="Missing, invalid, or negative rows excluded")
    missing_dates_in_range: int = Field(..., description="Missing calendar dates between earliest and latest date")
    provenance_counts: Dict[str, int] = Field(default_factory=dict, description="Record counts by provenance data_type")
    exclusion_reasons: List[ExclusionRecord] = Field(default_factory=list, description="Breakdown of exclusions")


class FreshnessPolicy(BaseModel):
    """Data freshness policy evaluation relative to current reference date."""

    model_config = ConfigDict(extra="forbid")

    max_age_days_for_current: int = Field(..., description="Maximum age (days) to qualify as current")
    data_age_days: Optional[int] = Field(default=None, description="Days elapsed between historical cutoff and reference date")
    is_stale: bool = Field(..., description="True if historical data exceeds freshness threshold")
    is_simulated: bool = Field(..., description="True if underlying demand records are synthetic/simulated")
    policy_note: str = Field(..., description="Plain-language freshness assessment")


class ModelInfo(BaseModel):
    """Metadata describing the forecasting model, version, and interval method."""

    model_config = ConfigDict(extra="forbid")

    model_id: str = Field(..., description="Model identifier")
    model_name: str = Field(..., description="Human-readable model name")
    model_version: str = Field(default="2.0.0", description="Forecasting engine version")
    seasonal_period_days: Optional[int] = Field(default=None, description="Seasonal period in days, if applicable")
    confidence_interval_method: Optional[str] = Field(default=None, description="Simulated prediction interval method")
    parameters_note: str = Field(..., description="Model configuration summary")


class ForecastResponse(BaseModel):
    """Authoritative response schema for station-level forecast endpoints."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Station identifier")
    station_name: str = Field(..., description="Station name")
    model_used: str = Field(..., description="Model selected for primary forecast")
    model_version: str = Field(default="2.0.0", description="Forecasting engine version")
    data_origin: str = Field(..., description="Provenance tag")
    horizon_days: int = Field(..., description="Forecast horizon in days")
    forecast_generated_at: str = Field(..., description="UTC ISO 8601 timestamp when forecast was generated")
    current_date: str = Field(..., description="Reference current date (Asia/Kolkata, YYYY-MM-DD)")
    data_age_days: Optional[int] = Field(default=None, description="Days between data_through_date and current_date")
    forecast_status: str = Field(
        ...,
        description="Status: current, stale, simulated, insufficient_data, or unavailable",
    )
    data_freshness: str = Field(..., description="Freshness classification: current, stale, or unavailable")
    forecast_origin_date: Optional[str] = Field(default=None, description="Historical cutoff date (YYYY-MM-DD)")
    data_through_date: Optional[str] = Field(default=None, description="Historical cutoff date (YYYY-MM-DD)")
    target_start_date: Optional[str] = Field(default=None, description="First forecast date (YYYY-MM-DD)")
    target_end_date: Optional[str] = Field(default=None, description="Last forecast date (YYYY-MM-DD)")
    is_historical_replay: bool = Field(..., description="True if cutoff is older than current reference date")
    historical_demo_notice: str = Field(..., description="Dynamic status, provenance, and freshness disclaimer")
    historical_avg_demand_kg: Optional[float] = Field(default=None, description="Overall mean historical demand (kg/day)")
    historical_recent_avg_kg: Optional[float] = Field(default=None, description="Trailing 30-day mean historical demand (kg/day)")
    forecast_avg_demand_kg: Optional[float] = Field(default=None, description="Mean forecasted demand across horizon (kg/day)")
    demand_trend: str = Field(default="unavailable", description="increasing, decreasing, stable, or unavailable")
    trend_change_pct: Optional[float] = Field(default=None, description="Percentage change vs trailing 30-day average")
    key_insight: str = Field(..., description="Data-driven forecast insight or limitation explanation")
    train_period: TrainPeriod
    validation_period: Optional[ValidationPeriod] = Field(default=None, description="Chronological validation window")
    test_period: TestPeriod
    validation_evaluation: Optional[ForecastEvaluation] = Field(default=None, description="Validation window metrics")
    evaluation: ForecastEvaluation
    model_info: ModelInfo
    freshness_policy: FreshnessPolicy
    data_audit: DataAuditSummary
    historical_context: List[HistoricalContextPoint] = Field(default_factory=list)
    forecast: List[ForecastPoint]
    baseline_forecast: Optional[List[ForecastPoint]] = Field(default=None)
    reliability: ForecastReliability
    limitations: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# New Endpoint Schemas (GET /forecast/stations, /history, /metrics, /network/summary, /data-status)
# ---------------------------------------------------------------------------

class ForecastStationSummaryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    station_id: str
    station_name: str
    district: str
    city: str
    operator: str
    simulation_profile: str
    eligible_for_simulation: bool
    history_records: int
    earliest_date: Optional[str] = None
    latest_date: Optional[str] = None
    data_origin: str


class ForecastStationsListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_eligible_stations: int
    stations: List[ForecastStationSummaryItem]
    data_origin: str
    generated_at: str


class ForecastHistoryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    station_id: str
    station_name: str
    district: str
    aggregation: str
    data_origin: str
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    total_records: int
    missing_records: int
    series: List[HistoricalContextPoint]
    note: str


class ForecastMetricsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    station_id: str
    station_name: str
    model_used: str
    model_version: str
    data_origin: str
    forecast_status: str
    train_period: TrainPeriod
    validation_period: Optional[ValidationPeriod] = None
    test_period: TestPeriod
    validation_evaluation: Optional[ForecastEvaluation] = None
    final_evaluation: ForecastEvaluation
    forecast_generated_at: str
    note: str


class NetworkStationForecastSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    station_id: str
    station_name: str
    district: str
    simulation_profile: str
    forecast_status: str
    historical_recent_avg_kg: Optional[float] = None
    forecast_avg_demand_kg: Optional[float] = None
    demand_trend: str
    model_mae_kg: Optional[float] = None
    baseline_mae_kg: Optional[float] = None
    model_smape_pct: Optional[float] = None
    baseline_smape_pct: Optional[float] = None


class NetworkEvaluationSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stations_evaluated: int
    mean_hw_mae_kg: Optional[float] = None
    mean_hw_rmse_kg: Optional[float] = None
    mean_hw_smape_pct: Optional[float] = None
    mean_baseline_mae_kg: Optional[float] = None
    mean_baseline_rmse_kg: Optional[float] = None
    mean_baseline_smape_pct: Optional[float] = None
    holt_winters_outperforms_baseline_count: int = 0
    note: str


class NetworkForecastSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    horizon_days: int
    model_used: str
    model_version: str
    data_origin: str
    forecast_status: str
    data_freshness: str
    data_through_date: Optional[str] = None
    target_start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    forecast_generated_at: str
    eligible_stations: int
    successfully_forecasted_stations: int
    insufficient_data_stations: int
    failed_stations: int
    failed_or_insufficient_station_ids: List[str]
    simulated_network_demand_kg_per_day: float
    historical_network_recent_avg_kg_per_day: float
    network_demand_trend: str
    network_trend_change_pct: Optional[float] = None
    network_evaluation: NetworkEvaluationSummary
    station_summaries: List[NetworkStationForecastSummary]
    note: str


class ForecastDataStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data_origin: str
    current_date: str
    data_through_date: Optional[str] = None
    data_age_days: Optional[int] = None
    data_freshness: str
    forecast_status: str
    eligible_stations: int
    stations_with_data: int
    total_historical_records: int
    cache_entries: int
    model_version: str
    freshness_policy: FreshnessPolicy
    external_datasets_loaded: Dict[str, int]
    limitations: List[str]
    checked_at: str
