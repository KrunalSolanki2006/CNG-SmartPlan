"""Hourly demand schemas matching docs/API_CONTRACT.md Section 3 (GET /api/v1/hourly-demand)."""

from typing import List
from pydantic import BaseModel, ConfigDict, Field


class HourlyRecord(BaseModel):
    """Single hourly demand record."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Station identifier")
    datetime: str = Field(..., description="Local timestamp (YYYY-MM-DD HH:MM:SS)")
    date: str = Field(..., description="Date (YYYY-MM-DD)")
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    hourly_demand_kg: float = Field(..., description="Simulated demand quantity in kg")
    day_of_week: str = Field(..., description="Day of week (e.g. Tuesday)")
    is_weekend: bool = Field(..., description="True if Saturday or Sunday")
    simulation_profile: str = Field(..., description="Assigned profile (e.g. commuter_corridor)")


class HourlyResponse(BaseModel):
    """Authoritative response schema for GET /api/v1/hourly-demand."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = Field(default="synthetic_demo", description="Provenance tag")
    available_stations: List[str] = Field(..., description="Station IDs having hourly profiles (AMD001, AMD004, AMD008)")
    period_start: str = Field(..., description="Start date of hourly coverage (2025-12-02)")
    period_end: str = Field(..., description="End date of hourly coverage (2025-12-31)")
    records: List[HourlyRecord]
    total_records: int = Field(..., description="Total count of hourly records returned")
    note: str = Field(
        default="Synthetic hourly profiles for 3 stations. Values reconcile to daily totals within 0.011 kg.",
        description="Hourly data caveat note",
    )

