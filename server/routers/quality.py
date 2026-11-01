"""Data quality router implementing GET /api/v1/data-quality per docs/API_CONTRACT.md."""

from fastapi import APIRouter
from schemas.quality import DataQualityResponse
from services.quality_service import QualityService

router = APIRouter(tags=["Data Quality"])


@router.get("/data-quality", response_model=DataQualityResponse)
def get_data_quality() -> DataQualityResponse:
    """Retrieve data provenance, coverage metrics, and documented research gaps."""
    return QualityService.get_quality_report()

