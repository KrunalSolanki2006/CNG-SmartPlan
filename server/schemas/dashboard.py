"""Schemas for the Main Dashboard Gujarat-wide aggregation endpoint (GET /api/v1/dashboard/overview)."""

from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CityStationCount(BaseModel):
    """Station count and share for a Gujarat city."""

    model_config = ConfigDict(extra="forbid")

    city: str
    district: str
    station_count: int
    share_pct: float


class DistrictStationCount(BaseModel):
    """Station count and share for a Gujarat district."""

    model_config = ConfigDict(extra="forbid")

    district: str
    station_count: int
    share_pct: float


class VerifiedStationCoordinate(BaseModel):
    """Minimal verified station coordinate record for overview map/coverage."""

    model_config = ConfigDict(extra="forbid")

    station_id: str
    station_name: str
    city: str
    district: str
    operator: str
    latitude: float
    longitude: float


class GeographicCoverageSummary(BaseModel):
    """Geographic bounding box and coverage summary for verified Gujarat stations."""

    model_config = ConfigDict(extra="forbid")

    min_latitude: Optional[float] = None
    max_latitude: Optional[float] = None
    min_longitude: Optional[float] = None
    max_longitude: Optional[float] = None
    verified_coordinate_stations: int
    total_verified_stations: int
    data_origin: str = "real_public"


class GujaratNetworkSummary(BaseModel):
    """Task 1: Gujarat CNG Network Overview."""

    model_config = ConfigDict(extra="forbid")

    total_verified_stations: int
    excluded_or_unverified_count: int
    cities_covered_count: int
    cities_covered: List[str]
    districts_covered_count: int
    districts_covered: List[str]
    station_distribution_by_city: List[CityStationCount]
    station_distribution_by_district: List[DistrictStationCount]
    verified_coordinates: List[VerifiedStationCoordinate]
    geographic_coverage: GeographicCoverageSummary
    data_origin: str = "real_public"


class DailyAggregateForecastPoint(BaseModel):
    """Single day of network-wide aggregated demand forecast."""

    model_config = ConfigDict(extra="forbid")

    date: str
    total_demand_kg: float
    stations_included: int


class PeakDemandDaySummary(BaseModel):
    """Expected network-wide peak demand day in the forecast window."""

    model_config = ConfigDict(extra="forbid")

    date: str
    total_demand_kg: float
    stations_included: int


class ForecastCoverageSummary(BaseModel):
    """Actual forecast coverage across verified stations."""

    model_config = ConfigDict(extra="forbid")

    verified_stations_total: int
    stations_with_valid_forecast: int
    stations_unavailable_or_insufficient: int
    coverage_ratio_label: str
    coverage_pct: float


class AggregatedDemandForecast(BaseModel):
    """Task 2: Network-Wide Demand Forecast Aggregation."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = "synthetic_demo"
    is_synthetic: bool = True
    model_used: str = "holt_winters"
    horizon_days: int = 7
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    total_forecasted_demand_kg: Optional[float] = None
    average_daily_forecast_demand_kg: Optional[float] = None
    historical_recent_avg_daily_kg: Optional[float] = None
    demand_trend: str = "unavailable"
    trend_change_pct: Optional[float] = None
    expected_peak_demand_day: Optional[PeakDemandDaySummary] = None
    daily_series: List[DailyAggregateForecastPoint] = Field(default_factory=list)
    coverage: ForecastCoverageSummary
    note: str


class DashboardAlertNotification(BaseModel):
    """Single active alert notification derived from existing alert/supply/forecast logic."""

    model_config = ConfigDict(extra="forbid")

    station_id: str
    station_name: str
    district: str
    alert_type: str  # "potential_supply_shortage" | "compressor_outage" | "peak_demand_warning"
    severity: str  # "critical" | "warning"
    message: str
    metric_value: Optional[float] = None
    metric_unit: Optional[str] = None
    timestamp: str
    data_origin: str = "synthetic_demo"


class SupplyAlertAggregation(BaseModel):
    """Task 3: Network-Wide Supply Alerts Aggregation."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = "synthetic_demo"
    total_active_alerts: int
    distinct_stations_affected: int
    critical_alerts_count: int
    warning_alerts_count: int
    peak_demand_warnings_count: int
    potential_supply_shortage_alerts_count: int
    future_supply_schedule_status: str
    recent_notifications: List[DashboardAlertNotification] = Field(default_factory=list)
    note: str


class ServiceGapArea(BaseModel):
    """Area identified by existing geospatial & candidate ranking services as having service gaps."""

    model_config = ConfigDict(extra="forbid")

    area_name: str
    city: str
    district: str
    nearest_verified_station_km: Optional[float] = None
    service_gap_score: Optional[float] = None
    reason: str


class NetworkIntelligenceSummary(BaseModel):
    """Task 4: Network Intelligence Aggregation."""

    model_config = ConfigDict(extra="forbid")

    status: str  # "available" | "partial" | "unavailable"
    data_origin: str = "synthetic_demo"
    trailing_window_start: Optional[str] = None
    trailing_window_end: Optional[str] = None
    aggregate_demand_kg_per_day: Optional[float] = None
    aggregate_effective_supply_kg_per_day: Optional[float] = None
    net_supply_demand_balance_kg_per_day: Optional[float] = None
    supply_demand_balance_pct: Optional[float] = None
    overall_balance_status: str
    future_planned_supply_status: str
    areas_with_insufficient_coverage: List[ServiceGapArea] = Field(default_factory=list)
    areas_for_further_evaluation: List[ServiceGapArea] = Field(default_factory=list)
    note: str


class EvaluatedCandidateSummary(BaseModel):
    """Summary of an evaluated candidate location from CandidateRankingService."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    name: str
    city: str
    district: str
    category: str
    rank: Optional[int] = None
    evaluation_score: Optional[float] = None
    confidence_tier: str
    nearest_station_distance_km: Optional[float] = None
    recommendation_status: str  # "Beneficial" | "Not Beneficial" | "Further Evaluation Required"
    evaluated_at: Optional[str] = None


class ImpactSimulationHistoryStatus(BaseModel):
    """Status of persisted Impact Simulator results."""

    model_config = ConfigDict(extra="forbid")

    available: bool
    status: str  # "available" | "not_run_yet"
    estimated_additional_demand_kg_per_day: Optional[float] = None
    note: str


class NetworkExpansionInsights(BaseModel):
    """Task 5: Network Expansion Insights."""

    model_config = ConfigDict(extra="forbid")

    total_evaluated_candidates: int
    rankable_candidates_count: int
    recently_evaluated_locations: List[EvaluatedCandidateSummary] = Field(default_factory=list)
    highest_ranked_candidate: Optional[EvaluatedCandidateSummary] = None
    recommendation_breakdown: Dict[str, int] = Field(default_factory=dict)
    existing_impact_simulation: ImpactSimulationHistoryStatus
    data_origin: str = "real_public"
    note: str


class DataProvenanceSummary(BaseModel):
    """Task 6: Explicit data source and provenance metadata."""

    model_config = ConfigDict(extra="forbid")

    station_inventory_origin: str
    demand_forecast_origin: str
    supply_alerts_origin: str
    candidate_evaluation_origin: str
    real_sales_data_present: bool = False
    real_supply_data_present: bool = False
    last_historical_data_date: Optional[str] = None
    forecast_generated_at: str
    dashboard_generated_at: str


class MainDashboardOverviewResponse(BaseModel):
    """Complete aggregated response for GET /api/v1/dashboard/overview."""

    model_config = ConfigDict(extra="forbid")

    network_summary: GujaratNetworkSummary
    aggregated_forecast: AggregatedDemandForecast
    supply_alerts: SupplyAlertAggregation
    network_intelligence: NetworkIntelligenceSummary
    expansion_insights: NetworkExpansionInsights
    provenance: DataProvenanceSummary
