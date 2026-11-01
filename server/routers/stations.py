"""Stations router implementing GET /api/v1/stations and GET /api/v1/stations/{station_id}/history."""

from typing import Optional
from fastapi import APIRouter, Query
from schemas.stations import (
    MapAvailability,
    Station,
    StationHistoryResponse,
    StationsListResponse,
)
from services.data_loader import get_data_store
from services.station_service import StationService

router = APIRouter(prefix="/stations", tags=["Stations"])


@router.get("", response_model=StationsListResponse)
def list_stations(
    in_study_area: Optional[str] = Query(
        default=None,
        description="Filter by study area: 'yes', 'no', 'uncertain'",
    ),
    eligible_for_simulation: Optional[bool] = Query(
        default=None,
        description="Filter to eligible stations for simulation (in_study_area=='yes')",
    ),
) -> StationsListResponse:
    """Retrieve station directory with explicit verification and map availability flags."""
    store = get_data_store()
    raw_stations = StationService.get_all_stations(
        in_study_area=in_study_area,
        eligible_for_simulation=eligible_for_simulation,
    )
    stations_list = [Station(**s) for s in raw_stations]

    return StationsListResponse(
        stations=stations_list,
        total=len(store.stations),
        eligible_for_simulation=len(store.eligible_stations),
        eligible_for_map_pin=len(store.map_eligible_stations),
        map_availability=MapAvailability(
            available=False,
            reason="No stations have independently verified coordinates. All 8 coordinate candidates are unapproved (approved_for_map_pin=no).",
        ),
    )


@router.get("/{station_id}/history", response_model=StationHistoryResponse)
def get_station_history(
    station_id: str,
    start_date: Optional[str] = Query(
        default="2024-01-01",
        description="Start date in YYYY-MM-DD format",
    ),
    end_date: Optional[str] = Query(
        default="2025-12-31",
        description="End date in YYYY-MM-DD format",
    ),
    aggregation: Optional[str] = Query(
        default="daily",
        description="Aggregation granularity: 'daily' or 'weekly'",
    ),
) -> StationHistoryResponse:
    """Retrieve historical synthetic daily/weekly sales for an eligible station."""
    return StationService.get_station_history(
        station_id=station_id,
        start_date=start_date,
        end_date=end_date,
        aggregation=aggregation or "daily",
    )

