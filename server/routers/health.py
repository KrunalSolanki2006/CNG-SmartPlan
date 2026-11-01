"""Health check router implementing GET /api/v1/health per docs/API_CONTRACT.md."""

from datetime import datetime, timezone
from fastapi import APIRouter
from schemas.health import HealthResponse, DataLoadedStats
from services.data_loader import get_data_store

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Service liveness and data ingestion verification check."""
    store = get_data_store()
    stats = store.get_health_stats()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return HealthResponse(
        status="ok",
        timestamp=now_utc,
        data_loaded=DataLoadedStats(**stats),
    )
