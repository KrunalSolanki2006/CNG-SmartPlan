"""Station inventory and history schemas matching docs/API_CONTRACT.md Section 3."""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class Station(BaseModel):
    """Station directory record with spatial and simulation eligibility flags."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Unique station ID (e.g. AMD001)")
    station_name: str = Field(..., description="Official station name")
    locality: str = Field(..., description="Locality or intersection")
    address: str = Field(..., description="Physical street address")
    pincode: str = Field(..., description="Postal PIN code")
    operator: str = Field(..., description="Operating company name or 'not established'")
    brand: str = Field(..., description="Station brand name")
    cng_status: str = Field(..., description="CNG availability status")
    in_study_area: str = Field(..., description="'yes', 'no', or 'uncertain'")
    coordinates_verified: bool = Field(default=False, description="Whether coordinates are verified (False)")
    latitude: Optional[float] = Field(default=None, description="Verified latitude (None)")
    longitude: Optional[float] = Field(default=None, description="Verified longitude (None)")
    verification_status: str = Field(default="partially_verified", description="Provenance status")
    data_origin: str = Field(default="real_public", description="Data provenance classification")
    simulation_profile: str = Field(..., description="Assigned profile for synthetic simulation")
    eligible_for_simulation: bool = Field(..., description="True if in_study_area=='yes'")
    eligible_for_map_pin: bool = Field(default=False, description="True ONLY if verified & approved (False)")


class MapAvailability(BaseModel):
    """Status explanation for map pin availability."""

    model_config = ConfigDict(extra="forbid")

    available: bool = Field(default=False, description="Whether verified map pins can be displayed")
    reason: str = Field(..., description="Detailed explanation of map pin absence")


class StationsListResponse(BaseModel):
    """Response schema for GET /api/v1/stations."""

    model_config = ConfigDict(extra="forbid")

    stations: List[Station]
    total: int = Field(..., description="Total stations in inventory (12)")
    eligible_for_simulation: int = Field(..., description="Total stations eligible for simulation (11)")
    eligible_for_map_pin: int = Field(..., description="Total stations eligible for map pin display (0)")
    map_availability: MapAvailability


class HistoryPoint(BaseModel):
    """Single point in station historical series."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="Date (YYYY-MM-DD)")
    demand_kg: float = Field(..., description="CNG demand quantity (kg)")
    day_of_week: Optional[str] = Field(default=None, description="Day of week (e.g. Monday)")
    is_weekend: Optional[bool] = Field(default=None, description="True for weekend days")
    simulation_profile: str = Field(..., description="Simulation profile assigned")


class StationHistoryResponse(BaseModel):
    """Response schema for GET /api/v1/stations/{station_id}/history."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Station identifier")
    station_name: str = Field(..., description="Station name")
    data_origin: str = Field(default="synthetic_demo", description="Provenance tag")
    aggregation: str = Field(default="daily", description="'daily' or 'weekly'")
    date_range_start: str = Field(..., description="Start date of series")
    date_range_end: str = Field(..., description="End date of series")
    total_records: int = Field(..., description="Number of data points in series")
    missing_records: int = Field(default=0, description="Count of missing dates")
    missing_holiday_data: bool = Field(default=True, description="True if holiday flags unassigned")
    series: List[HistoryPoint]
    note: str = Field(..., description="Synthetic disclaimer note")

