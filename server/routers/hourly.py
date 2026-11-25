"""Hourly demand router implementing GET /api/v1/hourly-demand."""

from typing import Optional
from fastapi import APIRouter, Query
from schemas.hourly import HourlyResponse
from services.hourly_service import HourlyService

router = APIRouter(tags=["Hourly Demand"])


@router.get("/hourly-demand", response_model=HourlyResponse)
def get_hourly_demand(
    station_id: Optional[str] = Query(
        default=None,
        description="Filter to single station (any of the 151 eligible Gujarat stations)",
    ),
    date: Optional[str] = Query(
        default=None,
        description="Filter to single date within the available 30-day hourly period",
    ),
) -> HourlyResponse:
    """Retrieve synthetic hourly demand records and diurnal profile curves."""
    return HourlyService.get_hourly_demand(station_id=station_id, date=date)
