"""Forecasting request and response schemas matching docs/API_CONTRACT.md Section 3."""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ForecastRequest(BaseModel):
    """Request payload for POST /api/v1/forecast."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Eligible station identifier (e.g. AMD001)")
    horizon_days: int = Field(default=7, ge=1, le=30, description="Forecast horizon in days (1-30)")
    model: str = Field(
        default="holt_winters",
        pattern="^(holt_winters|rolling_mean_baseline)$",
        description="Model candidate: 'holt_winters' or 'rolling_mean_baseline'",
    )
    include_baseline: bool = Field(default=True, description="Whether to include 28-day rolling mean baseline")


class TrainPeriod(BaseModel):
    """Chronological training window metadata."""

    model_config = ConfigDict(extra="forbid")

    start: str = Field(default="2024-01-01", description="Train start date (YYYY-MM-DD)")
    end: str = Field(default="2025-10-02", description="Train end date (YYYY-MM-DD)")
    n_records: int = Field(default=641, description="Number of daily training records per station")


class TestPeriod(BaseModel):
    """Chronological test holdout window metadata."""

    model_config = ConfigDict(extra="forbid")

    start: str = Field(default="2025-10-03", description="Test start date (YYYY-MM-DD)")
    end: str = Field(default="2025-12-31", description="Test end date (YYYY-MM-DD)")
    n_records: int = Field(default=90, description="Number of daily test records per station")


class ForecastEvaluation(BaseModel):
    """Evaluation metrics on chronological test holdout."""

    model_config = ConfigDict(extra="forbid")

    baseline_model: str = Field(default="rolling_mean_28d", description="Baseline benchmark model name")
    baseline_mae_kg: float = Field(default=150.55, description="Baseline Mean Absolute Error (kg/day)")
    baseline_rmse_kg: float = Field(default=189.69, description="Baseline Root Mean Squared Error (kg/day)")
    baseline_smape_pct: float = Field(default=11.41, description="Baseline Symmetric Mean Absolute Percentage Error (%)")
    model_mae_kg: Optional[float] = Field(default=None, description="Candidate model MAE (kg/day)")
    model_rmse_kg: Optional[float] = Field(default=None, description="Candidate model RMSE (kg/day)")
    model_smape_pct: Optional[float] = Field(default=None, description="Candidate model sMAPE (%)")
    note: str = Field(
        default="Metrics computed from synthetic data only. Do not claim real-world accuracy.",
        description="Mandatory synthetic caveat",
    )


class ForecastPoint(BaseModel):
    """Individual forecast prediction point."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="Prediction date (YYYY-MM-DD)")
    forecast_demand_kg: float = Field(..., description="Forecast demand in kg")
    lower_bound_kg: Optional[float] = Field(default=None, description="Lower prediction interval bound (kg)")
    upper_bound_kg: Optional[float] = Field(default=None, description="Upper prediction interval bound (kg)")
    model: str = Field(..., description="Model identifier used for this point")


class ForecastReliability(BaseModel):
    """Reliability indicators and confidence evaluation metadata."""

    model_config = ConfigDict(extra="forbid")

    data_source: str = Field(default="synthetic_demo", description="Data provenance classification")
    history_days: int = Field(default=731, description="Days of historical sales available")
    missing_values: int = Field(default=0, description="Count of missing daily sales values")
    missing_holiday_data: bool = Field(default=True, description="True if holiday flags are unassigned")
    confidence_interval_available: bool = Field(..., description="Whether confidence intervals are provided")
    evaluation_note: str = Field(
        default="Synthetic-only evaluation. Cannot claim real-world accuracy.",
        description="Reliability explanation",
    )


class ForecastResponse(BaseModel):
    """Authoritative response schema for POST /api/v1/forecast."""

    model_config = ConfigDict(extra="forbid")

    station_id: str = Field(..., description="Station identifier")
    station_name: str = Field(..., description="Station name")
    model_used: str = Field(..., description="Model selected for primary forecast")
    data_origin: str = Field(default="synthetic_demo", description="Provenance tag")
    horizon_days: int = Field(..., description="Forecast horizon in days")
    train_period: TrainPeriod
    test_period: TestPeriod
    evaluation: ForecastEvaluation
    forecast: List[ForecastPoint]
    baseline_forecast: Optional[List[ForecastPoint]] = Field(default=None, description="Baseline comparison forecast")
    reliability: ForecastReliability
    limitations: List[str] = Field(
        default_factory=lambda: [
            "All training data is synthetic (Python-generated simulation).",
            "Holiday and event effects are not encoded.",
            "No real station sales used to train or validate this model.",
        ],
        description="Documented modeling limitations",
    )

