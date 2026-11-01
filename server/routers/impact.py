"""Impact simulator router implementing POST /api/v1/impact-simulator."""

from fastapi import APIRouter
from schemas.impact import ImpactSimulatorRequest, ImpactSimulatorResponse
from services.impact_service import ImpactService

router = APIRouter(prefix="/impact-simulator", tags=["Impact Simulator"])


@router.post("", response_model=ImpactSimulatorResponse)
def simulate_new_station_impact(
    request: ImpactSimulatorRequest,
) -> ImpactSimulatorResponse:
    """Execute illustrative new-station impact scenario calculation (Feature E)."""
    return ImpactService.simulate_impact(request)

