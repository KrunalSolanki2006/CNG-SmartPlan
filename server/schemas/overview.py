"""Overview schemas matching docs/API_CONTRACT.md Section 3 (GET /api/v1/overview)."""

from typing import List
from pydantic import BaseModel, ConfigDict, Field


class StationCountsOverview(BaseModel):
    """Station inventory counts breakdown."""

    model_config = ConfigDict(extra="forbid")

    total_in_inventory: int = Field(..., description="Total stations in directory (12)")
    eligible_for_simulation: int = Field(..., description="Stations in study area eligible for simulation (11)")
    eligible_for_map_display: int = Field(..., description="Stations with verified coordinates eligible for map pins (0)")
    note: str = Field(..., description="Explanatory provenance note")


class NetworkSummary(BaseModel):
    """Historical synthetic network demand summary."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = Field(default="synthetic_demo", description="Provenance classification")
    date_range_start: str = Field(..., description="Start date (YYYY-MM-DD)")
    date_range_end: str = Field(..., description="End date (YYYY-MM-DD)")
    total_stations_in_series: int = Field(..., description="Stations included in synthetic series (11)")
    mean_daily_network_demand_kg: float = Field(..., description="Mean daily total demand across all eligible stations")
    note: str = Field(..., description="Synthetic caveat note")


class ForecastSummary(BaseModel):
    """Forecast capability summary."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = Field(default="synthetic_demo", description="Provenance classification")
    horizon_days: int = Field(default=7, description="Default forecast horizon")
    stations_forecasted: int = Field(default=11, description="Number of eligible stations")
    note: str = Field(..., description="Caveat note")


class ShortfallAlertsSummary(BaseModel):
    """Supply shortfall indicator summary."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = Field(default="synthetic_demo", description="Provenance classification")
    total_station_days_with_shortfall: int = Field(..., description="Total historical station-days where simulated supply < sales (1628)")
    stations_with_current_alert: List[str] = Field(default_factory=list, description="Station IDs currently in alert status")
    note: str = Field(..., description="Synthetic alert note")


class HourlySummary(BaseModel):
    """Hourly profiles summary."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = Field(default="synthetic_demo", description="Provenance classification")
    stations_with_hourly_data: List[str] = Field(..., description="Station IDs with hourly profiles (AMD001, AMD004, AMD008)")
    hourly_period_start: str = Field(..., description="Start date of hourly records (2025-12-02)")
    hourly_period_end: str = Field(..., description="End date of hourly records (2025-12-31)")


class DataQualityFlags(BaseModel):
    """Data quality and gap indicators."""

    model_config = ConfigDict(extra="forbid")

    verified_coordinates: bool = Field(default=False, description="Whether coordinates are verified")
    real_sales_data: bool = Field(default=False, description="Whether actual sales data is present")
    real_supply_data: bool = Field(default=False, description="Whether actual supply data is present")
    holiday_data: bool = Field(default=False, description="Whether holiday/event data is encoded")


class OverviewResponse(BaseModel):
    """Authoritative response schema for GET /api/v1/overview."""

    model_config = ConfigDict(extra="forbid")

    station_counts: StationCountsOverview
    network_summary: NetworkSummary
    forecast_summary: ForecastSummary
    shortfall_alerts: ShortfallAlertsSummary
    hourly_summary: HourlySummary
    data_quality_flags: DataQualityFlags
    generated_at: str = Field(..., description="ISO 8601 UTC timestamp with Z suffix")

