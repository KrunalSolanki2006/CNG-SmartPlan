"""Data quality and provenance schemas matching docs/API_CONTRACT.md Section 3 (GET /api/v1/data-quality)."""

from typing import List
from pydantic import BaseModel, ConfigDict, Field


class StationInventoryQuality(BaseModel):
    """Metadata regarding station directory sources and coordinate status."""

    model_config = ConfigDict(extra="forbid")

    total_stations: int = Field(default=12, description="Total stations in inventory")
    eligible_for_simulation: int = Field(default=11, description="Locality-screened in-study-area stations")
    eligible_for_map_pin: int = Field(default=0, description="Stations with verified coordinates approved for pins")
    data_origin: str = Field(default="real_public", description="Provenance tag")
    sources: List[str] = Field(..., description="Names of source directories extracted")
    access_date: str = Field(..., description="Date source registries were scraped/accessed")
    coordinate_status: str = Field(..., description="Summary status of coordinates")


class DailySalesQuality(BaseModel):
    """Quality metrics for synthetic daily sales time series."""

    model_config = ConfigDict(extra="forbid")

    rows: int = Field(default=8041, description="Total rows")
    columns: int = Field(default=12, description="Total columns")
    stations: int = Field(default=11, description="Unique stations")
    date_range_start: str = Field(default="2024-01-01", description="Start date")
    date_range_end: str = Field(default="2025-12-31", description="End date")
    missing_holiday_rows: int = Field(default=8041, description="Count of rows with missing holiday flags")
    data_origin: str = Field(default="synthetic_demo", description="Provenance tag")


class SupplyQuality(BaseModel):
    """Quality metrics for synthetic supply time series."""

    model_config = ConfigDict(extra="forbid")

    rows: int = Field(default=8041, description="Total rows")
    columns: int = Field(default=5, description="Total columns")
    data_origin: str = Field(default="synthetic_demo", description="Provenance tag")


class HourlyDemandQuality(BaseModel):
    """Quality metrics for synthetic hourly profiles."""

    model_config = ConfigDict(extra="forbid")

    rows: int = Field(default=2160, description="Total rows")
    columns: int = Field(default=10, description="Total columns")
    stations: int = Field(default=3, description="Stations with hourly profiles")
    period_start: str = Field(default="2025-12-02", description="Start date")
    period_end: str = Field(default="2025-12-31", description="End date")
    data_origin: str = Field(default="synthetic_demo", description="Provenance tag")


class SyntheticDataQuality(BaseModel):
    """Aggregated metrics for all synthetic time series datasets."""

    model_config = ConfigDict(extra="forbid")

    daily_sales: DailySalesQuality
    supply: SupplyQuality
    hourly_demand: HourlyDemandQuality


class BaselineEvaluationQuality(BaseModel):
    """Metrics from chronological holdout baseline evaluation on synthetic series."""

    model_config = ConfigDict(extra="forbid")

    model: str = Field(default="28-day rolling mean", description="Baseline model name")
    evaluation_type: str = Field(default="chronological", description="Split evaluation methodology")
    train_end: str = Field(default="2025-10-02", description="Last date in training set")
    test_start: str = Field(default="2025-10-03", description="First date in test set")
    test_end: str = Field(default="2025-12-31", description="Last date in test set")
    test_station_days: int = Field(default=990, description="Total test station-day observations")
    mae_kg: float = Field(default=150.55, description="Mean Absolute Error (kg/day)")
    rmse_kg: float = Field(default=189.69, description="Root Mean Squared Error (kg/day)")
    smape_pct: float = Field(default=11.41, description="Symmetric Mean Absolute Percentage Error (%)")
    data_origin: str = Field(default="synthetic_demo", description="Provenance tag")
    note: str = Field(..., description="Warning that metrics are synthetic-only")


class DataGapItem(BaseModel):
    """Individual research gap and its operational impact."""

    model_config = ConfigDict(extra="forbid")

    gap: str = Field(..., description="Documented information gap")
    impact: str = Field(..., description="Impact on decision support capability")


class DataQualityResponse(BaseModel):
    """Authoritative schema for GET /api/v1/data-quality."""

    model_config = ConfigDict(extra="forbid")

    generated_at: str = Field(..., description="ISO 8601 UTC timestamp with Z suffix")
    station_inventory: StationInventoryQuality
    synthetic_data: SyntheticDataQuality
    baseline_evaluation: BaselineEvaluationQuality
    data_gaps: List[DataGapItem]

