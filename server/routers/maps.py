"""Maps router implementing SerpApi Google Maps integrations.

Endpoints:
- GET  /api/v1/maps/search         - Search for CNG stations
- GET  /api/v1/maps/autocomplete   - Autocomplete place or address suggestions
- POST /api/v1/maps/place-details  - Fetch rich details for a specific place
- POST /api/v1/maps/directions     - Calculate road routes, polylines, and detour ratio
- GET  /api/v1/maps/discoveries    - Retrieve quarantined discovered candidates
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

try:
    from schemas.maps import (
        AutocompleteResponse,
        CandidateStatusUpdateRequest,
        CandidateSummaryResponse,
        DirectionsRequest,
        DirectionsResponse,
        DiscoveredStation,
        MapSearchResponse,
        MapsStatusResponse,
        PlaceDetailsRequest,
        PlaceDetailsResponse,
        SetModeRequest,
    )
    from services.google_maps_service import google_maps_service
    from services.gujarat_discovery_service import GujaratDiscoveryService
except ImportError:
    from server.schemas.maps import (
        AutocompleteResponse,
        CandidateStatusUpdateRequest,
        CandidateSummaryResponse,
        DirectionsRequest,
        DirectionsResponse,
        DiscoveredStation,
        MapSearchResponse,
        MapsStatusResponse,
        PlaceDetailsRequest,
        PlaceDetailsResponse,
        SetModeRequest,
    )
    from server.services.google_maps_service import google_maps_service
    from server.services.gujarat_discovery_service import GujaratDiscoveryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/maps", tags=["Maps & Geospatial"])


@router.get("/search", response_model=MapSearchResponse)
async def search_cng_stations(
    q: Optional[str] = Query(None, description="Search query string (e.g. 'CNG pump in Ahmedabad')"),
    lat: float = Query(23.0225, description="Center latitude (default: Ahmedabad)"),
    lng: float = Query(72.5714, description="Center longitude (default: Ahmedabad)"),
    zoom: int = Query(12, description="Search map zoom level"),
) -> MapSearchResponse:
    """Search for CNG stations via Google Maps Search API."""
    try:
        return await google_maps_service.search_cng_stations(
            query=q,
            center_lat=lat,
            center_lng=lng,
            zoom=zoom,
        )
    except Exception as e:
        logger.error(f"Error during Google Maps search: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Maps Search service error: {str(e)}",
        )


@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete_locations(
    q: str = Query(..., min_length=1, description="Location search prefix"),
    lat: float = Query(23.0225, description="Center latitude for biased suggestions"),
    lng: float = Query(72.5714, description="Center longitude for biased suggestions"),
) -> AutocompleteResponse:
    """Autocomplete places and keywords via Google Maps Autocomplete API."""
    try:
        return await google_maps_service.autocomplete_locations(
            query=q,
            center_lat=lat,
            center_lng=lng,
        )
    except Exception as e:
        logger.error(f"Error during Google Maps autocomplete: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Maps Autocomplete service error: {str(e)}",
        )


@router.post("/place-details", response_model=PlaceDetailsResponse)
async def get_place_details(req: PlaceDetailsRequest) -> PlaceDetailsResponse:
    """Retrieve detailed metadata (rating, reviews, hours, photos) for a place."""
    try:
        return await google_maps_service.get_place_details(req)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error(f"Error retrieving place details: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Place details service error: {str(e)}",
        )


@router.post("/directions", response_model=DirectionsResponse)
async def calculate_directions(req: DirectionsRequest) -> DirectionsResponse:
    """Calculate road navigation routes, step directions, Leaflet polyline points, and detour ratio."""
    try:
        return await google_maps_service.get_directions(req)
    except Exception as e:
        logger.error(f"Error calculating directions: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Directions service error: {str(e)}",
        )


@router.get("/discoveries", response_model=List[DiscoveredStation])
def get_discovered_stations() -> List[DiscoveredStation]:
    """Retrieve cached discovered candidate stations stored in quarantine."""
    return google_maps_service.load_quarantined_discoveries()



@router.get("/status", response_model=MapsStatusResponse)
def get_maps_service_status() -> MapsStatusResponse:
    """Check operational status of SerpApi Google Maps service and offline fixtures."""
    return google_maps_service.get_service_status()


@router.post("/mode", response_model=MapsStatusResponse)
def set_maps_service_mode(req: SetModeRequest) -> MapsStatusResponse:
    """Switch SerpApi operational mode: auto, live, or demo."""
    try:
        google_maps_service.set_service_mode(req.mode)
        return google_maps_service.get_service_status()
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )


@router.get("/candidates", response_model=List[DiscoveredStation])
def get_candidate_stations(
    verification_status: Optional[str] = Query(None, description="Filter by status: unverified_candidate, pending_review, verified_project_record, rejected, proposed_simulation_location"),
) -> List[DiscoveredStation]:
    """Retrieve candidate stations from quarantine with optional status filtering."""
    return google_maps_service.get_candidates(status_filter=verification_status)


@router.get("/candidates/summary", response_model=CandidateSummaryResponse)
def get_candidate_summary() -> CandidateSummaryResponse:
    """Summary counts across candidate review stages."""
    return google_maps_service.get_candidates_summary()


@router.put("/candidates/{candidate_id}/status", response_model=DiscoveredStation)
def update_candidate_review_status(
    candidate_id: str,
    req: CandidateStatusUpdateRequest,
) -> DiscoveredStation:
    """Update review status of a candidate station with planner notes and audit trail."""
    try:
        return google_maps_service.update_candidate_status(
            candidate_id=candidate_id,
            new_status=req.status,
            notes=req.notes,
        )
    except KeyError as ke:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ke),
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )


@router.get("/discovery/diagnostics")
def get_discovery_diagnostics():
    """Retrieve transparent SerpApi discovery diagnostics."""
    return GujaratDiscoveryService.load_discovery_diagnostics()


@router.post("/discovery/run")
def trigger_discovery_pipeline(
    cities: Optional[List[str]] = Query(None, description="Specific cities to discover"),
    force_live: bool = Query(False, description="Bypass cache for live queries"),
):
    """Run discovery pipeline across Gujarat cities."""
    return GujaratDiscoveryService.run_discovery_pipeline(cities=cities, force_live=force_live)

