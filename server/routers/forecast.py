"""Forecast router implementing POST /api/v1/forecast per docs/API_CONTRACT.md."""

from fastapi import APIRouter
from schemas.forecast import ForecastRequest, ForecastResponse
from services.forecast_service import ForecastService

router = APIRouter(tags=["Forecast"])


@router.post("/forecast", response_model=ForecastResponse)
def post_forecast(request: ForecastRequest) -> ForecastResponse:
    """Generate station-level demand forecast with chronological evaluation benchmarks."""
    return ForecastService.generate_forecast(request)

