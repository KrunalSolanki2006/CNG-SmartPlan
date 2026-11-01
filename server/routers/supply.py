"""Supply check router implementing POST /api/v1/supply-check per docs/API_CONTRACT.md."""

from fastapi import APIRouter
from schemas.supply import SupplyCheckRequest, SupplyCheckResponse
from services.supply_service import SupplyService

router = APIRouter(tags=["Supply"])


@router.post("/supply-check", response_model=SupplyCheckResponse)
def post_supply_check(request: SupplyCheckRequest) -> SupplyCheckResponse:
    """Compare forecast demand against planned available supply and compute potential shortfalls."""
    return SupplyService.check_supply(request)

