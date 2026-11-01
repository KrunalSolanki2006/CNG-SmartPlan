"""Overview router implementing GET /api/v1/overview per docs/API_CONTRACT.md."""

from fastapi import APIRouter
from schemas.overview import OverviewResponse
from services.overview_service import OverviewService

router = APIRouter(tags=["Overview"])


@router.get("/overview", response_model=OverviewResponse)
def get_overview() -> OverviewResponse:
    """Retrieve computed system-wide dashboard summary metrics."""
    return OverviewService.get_overview()

