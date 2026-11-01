"""Hourly demand router implementing GET /api/v1/hourly-demand per docs/API_CONTRACT.md."""

from typing import Optional
from fastapi import APIRouter, Query
from schemas.hourly import HourlyResponse
from services.hourly_service import HourlyService

router = APIRouter(tags=["Hourly Demand"])


@router.get("/hourly-demand", response_model=HourlyResponse)
def get_hourly_demand(
    station_id: Optional[str] = Query(
        default=None,
        description="Filter to single station: AMD001, AMD004, or AMD008",
    ),
    date: Optional[str] = Query(
        default=None,
        description="Filter to single date in 2025-12-02 to 2025-12-31",
    ),
) -> HourlyResponse:
    """Retrieve synthetic hourly demand records and profile curves."""
    return HourlyService.get_hourly_demand(station_id=station_id, date=date)

