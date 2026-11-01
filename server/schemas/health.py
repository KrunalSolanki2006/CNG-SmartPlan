"""Health check schema matching docs/API_CONTRACT.md Section 3."""

from pydantic import BaseModel, ConfigDict, Field


class DataLoadedStats(BaseModel):
    """Statistics of loaded and validated data sets."""

    model_config = ConfigDict(extra="forbid")

    stations: int = Field(..., description="Total stations in master directory (12)")
    eligible_stations: int = Field(..., description="Stations eligible for simulation (11)")
    daily_sales_rows: int = Field(..., description="Total synthetic daily sales rows (8041)")
    supply_rows: int = Field(..., description="Total synthetic planned supply rows (8041)")
    hourly_rows: int = Field(..., description="Total synthetic hourly demand rows (2160)")


class HealthResponse(BaseModel):
    """Health endpoint response payload."""

    model_config = ConfigDict(extra="forbid")

    status: str = Field(default="ok", description="Service liveness status")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp with Z suffix")
    data_loaded: DataLoadedStats

