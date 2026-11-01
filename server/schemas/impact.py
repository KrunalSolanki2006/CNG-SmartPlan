"""Pydantic schemas for the New-Station Impact Simulator (POST /api/v1/impact-simulator).

Strictly matches docs/API_CONTRACT.md Section 3 and Feature E requirements.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ImpactSimulatorRequest(BaseModel):
    """Request payload for POST /api/v1/impact-simulator."""

    model_config = ConfigDict(extra="forbid")

    proposed_latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude of proposed candidate location (-90 to 90 degrees)",
    )
    proposed_longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude of proposed candidate location (-180 to 180 degrees)",
    )
    catchment_radius_km: float = Field(
        default=3.0,
        ge=0.1,
        le=50.0,
        description="Assumed customer draw catchment radius in km (0.1 to 50.0 km)",
    )
    catchment_demand_kg_per_day: float = Field(
        ...,
        gt=0.0,
        description="Assumed total available CNG demand within catchment area in kg/day (> 0)",
    )
    capture_proportion: float = Field(
        default=0.35,
        ge=0.0,
        le=1.0,
        description="Fraction of catchment demand captured by proposed station (0.0 to 1.0)",
    )
    diversion_proportion: float = Field(
        default=0.60,
        ge=0.0,
        le=1.0,
        description="Fraction of proposed station demand diverted from existing network (0.0 to 1.0)",
    )
    accessibility_demand_kg_per_day: float = Field(
        default=0.0,
        ge=0.0,
        description="New additional demand created by improved accessibility in kg/day (>= 0.0)",
    )


class ImpactAssumptions(BaseModel):
    """User-supplied inputs mirrored as explicit assumptions."""

    model_config = ConfigDict(extra="forbid")

    proposed_latitude: float
    proposed_longitude: float
    catchment_radius_km: float
    catchment_demand_kg_per_day: float
    capture_proportion: float
    diversion_proportion: float
    accessibility_demand_kg_per_day: float


class ImpactResults(BaseModel):
    """Calculated scenario demand quantities in kg/day."""

    model_config = ConfigDict(extra="forbid")

    proposed_station_demand_kg_per_day: float
    estimated_diverted_demand_kg_per_day: float
    net_additional_network_demand_kg_per_day: float
    network_baseline_daily_demand_kg: Optional[float] = Field(
        default=14081.2,
        description="Historical network mean daily baseline sales sum across 11 stations (kg/day)",
    )
    scenario_network_daily_demand_kg: Optional[float] = Field(
        default=None,
        description="Scenario network total (baseline + net additional demand in kg/day)",
    )


class SensitivityPoint(BaseModel):
    """Grid point in capture vs diversion sensitivity analysis."""

    model_config = ConfigDict(extra="forbid")

    capture_proportion: float
    diversion_proportion: float
    proposed_station_demand_kg: float
    diverted_demand_kg: float
    net_additional_demand_kg: float


class ImpactFormulas(BaseModel):
    """Transparent representation of applied mathematical formulas in plain English."""

    model_config = ConfigDict(extra="forbid")

    proposed_station_demand: str = (
        "(catchment_demand_kg_per_day * capture_proportion) + accessibility_demand_kg_per_day"
    )
    estimated_diverted_demand: str = (
        "proposed_station_demand_kg_per_day * diversion_proportion"
    )
    net_additional_network_demand: str = (
        "proposed_station_demand_kg_per_day - estimated_diverted_demand_kg_per_day"
    )


class GeographicAnalysis(BaseModel):
    """Geographic impact availability status and station-level allocation."""

    model_config = ConfigDict(extra="forbid")

    available: bool = False
    reason: str = (
        "No stations have independently verified coordinates. Nearby-station analysis cannot be performed."
    )
    nearby_stations: Optional[List[Any]] = None


class ImpactSimulatorResponse(BaseModel):
    """Authoritative response schema for POST /api/v1/impact-simulator."""

    model_config = ConfigDict(extra="forbid")

    data_origin: str = "illustrative_scenario"
    assumptions: ImpactAssumptions
    results: ImpactResults
    formulas_applied: ImpactFormulas = Field(default_factory=ImpactFormulas)
    geographic_analysis: GeographicAnalysis = Field(default_factory=GeographicAnalysis)
    sensitivity_analysis: Optional[List[SensitivityPoint]] = Field(
        default=None,
        description="Multi-scenario sensitivity grid over varying capture and diversion rates",
    )
    warnings: List[str]
