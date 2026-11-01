"""Supply check request and response schemas matching docs/API_CONTRACT.md Section 3."""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SupplyOverride(BaseModel):
    """User-supplied planned supply override for a specific date."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="Date (YYYY-MM-DD)")
    supply_kg: float = Field(..., ge=0.0, description="User-entered planned supply in kg")


class SupplyCheckRequest(BaseModel):
    """Request payload for POST /api/v1/supply-check."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Eligible station identifier (e.g. AMD001)")
    horizon_days: int = Field(default=7, ge=1, le=30, description="Forecast horizon in days (1-30)")
    supply_source: str = Field(
        default="synthetic",
        pattern="^(synthetic|user_entered)$",
        description="Supply source: 'synthetic' or 'user_entered'",
    )
    user_supply_overrides: Optional[List[SupplyOverride]] = Field(
        default=None,
        description="List of date-specific supply overrides",
    )


class SupplyComparisonPoint(BaseModel):
    """Demand vs supply comparison for a single forecast date."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="Forecast date (YYYY-MM-DD)")
    forecast_demand_kg: float = Field(..., description="Forecast CNG demand in kg")
    planned_supply_kg: Optional[float] = Field(default=None, description="Planned supply in kg (null if unavailable)")
    supply_data_origin: str = Field(..., description="Provenance tag for supply value ('synthetic_demo', 'user_entered_scenario', 'unavailable')")
    potential_shortfall_kg: Optional[float] = Field(default=None, description="max(0, forecast - supply) in kg (null if supply unavailable)")
    has_shortfall: Optional[bool] = Field(default=None, description="True if potential shortfall > 0, null if unavailable")


class SupplySummary(BaseModel):
    """Summary of shortfall comparison across horizon."""

    model_config = ConfigDict(extra="forbid")

    days_with_shortfall: int = Field(..., description="Number of days in horizon with potential shortfall")
    max_shortfall_kg: float = Field(..., description="Maximum shortfall in kg observed over horizon")
    total_shortfall_kg: float = Field(..., description="Total cumulative shortfall in kg over horizon")


class SupplyCheckResponse(BaseModel):
    """Authoritative response schema for POST /api/v1/supply-check."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Station identifier")
    station_name: str = Field(..., description="Station name")
    data_origin: str = Field(default="synthetic_demo", description="Provenance classification")
    supply_source: str = Field(..., description="Effective supply source mode")
    comparison: List[SupplyComparisonPoint]
    summary: SupplySummary
    warnings: List[str] = Field(
        default_factory=lambda: [
            "Synthetic supply covers only 2024-01-01 to 2025-12-31. Forecast dates beyond this require user-entered supply values.",
            "These are potential planning shortfalls, not confirmed stockouts.",
        ],
        description="Mandatory supply check operational warnings",
    )

