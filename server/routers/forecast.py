"""Forecast router implementing POST /api/v1/forecast and station/network GET endpoints."""

from typing import Optional
from fastapi import APIRouter, Query
from schemas.forecast import (
    ForecastDataStatusResponse,
    ForecastHistoryResponse,
    ForecastMetricsResponse,
    ForecastRequest,
    ForecastResponse,
    ForecastStationsListResponse,
    NetworkForecastSummaryResponse,
)
from services.forecast_service import ForecastService

router = APIRouter(tags=["Forecast"])


@router.post("/forecast", response_model=ForecastResponse)
def post_forecast(request: ForecastRequest) -> ForecastResponse:
    """Generate station-level demand forecast with chronological evaluation benchmarks."""
    return ForecastService.generate_forecast(request)


@router.get("/forecast/stations", response_model=ForecastStationsListResponse)
def list_forecast_stations() -> ForecastStationsListResponse:
    """List all eligible verified Gujarat stations available for forecasting."""
    return ForecastService.list_forecast_stations()


@router.get("/forecast/network/summary", response_model=NetworkForecastSummaryResponse)
def get_network_forecast_summary(
    horizon_days: int = Query(default=7, ge=1, le=30, description="Forecast horizon (7, 14, or 30 days)"),
    model: str = Query(default="holt_winters", pattern="^(holt_winters|rolling_mean_baseline)$"),
    cutoff_date: Optional[str] = Query(default=None, description="Optional simulation cutoff date (YYYY-MM-DD)"),
) -> NetworkForecastSummaryResponse:
    """Return network-wide aggregated demand forecast and evaluation summary across eligible stations."""
    return ForecastService.get_network_summary(horizon_days=horizon_days, model=model, cutoff_date=cutoff_date)


@router.get("/forecast/data-status", response_model=ForecastDataStatusResponse)
def get_forecast_data_status(
    cutoff_date: Optional[str] = Query(default=None, description="Optional simulation cutoff date (YYYY-MM-DD)"),
) -> ForecastDataStatusResponse:
    """Return historical data cutoff, freshness policy status, provenance, and cache state."""
    return ForecastService.get_data_status(cutoff_date=cutoff_date)


@router.get("/forecast/{station_id}", response_model=ForecastResponse)
def get_station_forecast(
    station_id: str,
    horizon_days: int = Query(default=7, ge=1, le=30, description="Forecast horizon (7, 14, or 30 days)"),
    model: str = Query(default="holt_winters", pattern="^(holt_winters|rolling_mean_baseline)$"),
    include_baseline: bool = Query(default=True),
    cutoff_date: Optional[str] = Query(default=None, description="Optional simulation cutoff date (YYYY-MM-DD)"),
) -> ForecastResponse:
    """Generate or retrieve cached forecast for a specific station."""
    req = ForecastRequest(
        station_id=station_id,
        horizon_days=horizon_days,
        model=model,
        include_baseline=include_baseline,
        cutoff_date=cutoff_date,
    )
    return ForecastService.generate_forecast(req, cutoff_date=cutoff_date)


@router.get("/forecast/{station_id}/history", response_model=ForecastHistoryResponse)
def get_station_forecast_history(
    station_id: str,
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    aggregation: str = Query(default="daily", pattern="^(daily|weekly)$"),
    cutoff_date: Optional[str] = Query(default=None, description="Optional simulation cutoff date (YYYY-MM-DD)"),
) -> ForecastHistoryResponse:
    """Retrieve audited historical demand series for a forecast-eligible station."""
    return ForecastService.get_station_history(
        station_id=station_id,
        start_date=start_date,
        end_date=end_date,
        aggregation=aggregation,
        cutoff_date=cutoff_date,
    )


@router.get("/forecast/{station_id}/metrics", response_model=ForecastMetricsResponse)
def get_station_forecast_metrics(
    station_id: str,
    model: str = Query(default="holt_winters", pattern="^(holt_winters|rolling_mean_baseline)$"),
    cutoff_date: Optional[str] = Query(default=None, description="Optional simulation cutoff date (YYYY-MM-DD)"),
) -> ForecastMetricsResponse:
    """Retrieve 3-way chronological split validation and final evaluation metrics for a station."""
    return ForecastService.get_station_metrics(station_id=station_id, model=model, cutoff_date=cutoff_date)
