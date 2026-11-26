"""Overview router implementing GET /api/v1/overview and GET /api/v1/dashboard/overview."""

from fastapi import APIRouter, Query
from schemas.dashboard import MainDashboardOverviewResponse
from schemas.overview import OverviewResponse
from services.dashboard_service import DashboardService
from services.overview_service import OverviewService

router = APIRouter(tags=["Overview"])


@router.get("/overview", response_model=OverviewResponse)
def get_overview() -> OverviewResponse:
    """Retrieve computed system-wide dashboard summary metrics."""
    return OverviewService.get_overview()


@router.get("/dashboard/overview", response_model=MainDashboardOverviewResponse)
def get_dashboard_overview(
    horizon_days: int = Query(default=7, ge=1, le=30, description="Forecast aggregation horizon (7 recommended)"),
) -> MainDashboardOverviewResponse:
    """Retrieve Gujarat-wide aggregated Main Dashboard overview."""
    return DashboardService.get_dashboard_overview(horizon_days=horizon_days)

