"""FastAPI router for Gujarat Candidate Location Ranking, Dossiers, and Network Stations.

Endpoints:
- GET  /api/v1/candidates                  - Filterable candidate locations
- GET  /api/v1/candidates/rankings         - Ranked candidate leaderboard with scores & explanations
- GET  /api/v1/candidates/{candidate_id}   - Detailed candidate analytical dossier
- GET  /api/v1/candidates/{candidate_id}/evidence - Specific provenance & spatial evidence
- POST /api/v1/candidates/recalculate      - Dynamic re-ranking with custom weights
- POST /api/v1/candidates/discover         - Trigger Gujarat network discovery
- GET  /api/v1/network/stations            - Full Gujarat network stations (verified vs discovered)
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from schemas.candidates import (
    CandidateCompareRequest,
    CandidateCompareResponse,
    CandidateCreateRequest,
    CandidateDossierResponse,
    CandidateLocationModel,
    CandidateRankingsResponse,
    CandidateUpdateRequest,
    GujaratNetworkStationsResponse,
    RecalculateRankingRequest,
    ScoringWeightsConfig,
)
from services.candidate_ranking_service import CandidateRankingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidates", tags=["Candidate Ranking & Gujarat Geospatial"])
network_router = APIRouter(prefix="/network", tags=["Gujarat Network Stations"])


@router.get("", response_model=CandidateRankingsResponse)
def get_candidate_locations(
    city: Optional[str] = Query(None, description="Filter by Gujarat city/town"),
    district: Optional[str] = Query(None, description="Filter by Gujarat district"),
    category: Optional[str] = Query(None, description="Filter by category (industrial_hub, highway_corridor, logistics_transit)"),
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Minimum overall score"),
    rankable_only: bool = Query(False, description="Exclude candidates with insufficient data"),
) -> CandidateRankingsResponse:
    """Retrieve all candidate locations with multi-criteria evaluation scores and filters."""
    req = RecalculateRankingRequest(
        city_filter=city,
        district_filter=district,
        category_filter=category,
        min_score=min_score,
        rankable_only=rankable_only,
    )
    return CandidateRankingService.rank_candidates(req)


@router.get("/rankings", response_model=CandidateRankingsResponse)
def get_candidate_rankings(
    demand_weight: Optional[float] = Query(None, ge=0.0, le=1.0, description="Custom weight for demand proxy (0.0 - 1.0)"),
    service_gap_weight: Optional[float] = Query(None, ge=0.0, le=1.0, description="Custom weight for service gap (0.0 - 1.0)"),
    road_accessibility_weight: Optional[float] = Query(None, ge=0.0, le=1.0, description="Custom weight for road accessibility (0.0 - 1.0)"),
    distance_weight: Optional[float] = Query(None, ge=0.0, le=1.0, description="Custom weight for distance from station (0.0 - 1.0)"),
    city: Optional[str] = Query(None, description="Filter by city"),
    district: Optional[str] = Query(None, description="Filter by district"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Minimum score threshold"),
    rankable_only: bool = Query(False, description="Only include rankable candidates"),
) -> CandidateRankingsResponse:
    """Retrieve ranked leaderboard of candidate locations with optional weight adjustments."""
    weights = None
    if any(w is not None for w in [demand_weight, service_gap_weight, road_accessibility_weight, distance_weight]):
        weights = ScoringWeightsConfig(
            demand_weight=demand_weight if demand_weight is not None else 0.35,
            service_gap_weight=service_gap_weight if service_gap_weight is not None else 0.30,
            road_accessibility_weight=road_accessibility_weight if road_accessibility_weight is not None else 0.20,
            distance_weight=distance_weight if distance_weight is not None else 0.15,
        )

    req = RecalculateRankingRequest(
        weights=weights,
        city_filter=city,
        district_filter=district,
        category_filter=category,
        min_score=min_score,
        rankable_only=rankable_only,
    )
    return CandidateRankingService.rank_candidates(req)


@router.post("/recalculate", response_model=CandidateRankingsResponse)
def recalculate_rankings(req: RecalculateRankingRequest) -> CandidateRankingsResponse:
    """Dynamically recompute candidate rankings with customized weight parameters and filters."""
    return CandidateRankingService.rank_candidates(req)


@router.post("", response_model=CandidateLocationModel, status_code=status.HTTP_201_CREATED)
def create_candidate_location(req: CandidateCreateRequest) -> CandidateLocationModel:
    """Propose a new candidate CNG station location (Method 1 Places Autocomplete or Method 2 Map Click)."""
    return CandidateRankingService.add_candidate(req)


@router.post("/compare", response_model=CandidateCompareResponse)
def compare_candidate_locations(req: CandidateCompareRequest) -> CandidateCompareResponse:
    """Compare 2 to 5 candidate locations side-by-side with factor breakdowns, winners, and narrative analysis."""
    try:
        return CandidateRankingService.compare_candidates(req.candidate_ids)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{candidate_id}", response_model=CandidateDossierResponse)
def get_candidate_dossier(candidate_id: str) -> CandidateDossierResponse:
    """Retrieve comprehensive analytical dossier, criteria breakdown, and audit explanation for a candidate."""
    dossier = CandidateRankingService.get_candidate_dossier(candidate_id)
    if not dossier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate location with ID '{candidate_id}' was not found in Gujarat inventory.",
        )
    return dossier


@router.put("/{candidate_id}", response_model=CandidateLocationModel)
def update_candidate_location(candidate_id: str, req: CandidateUpdateRequest) -> CandidateLocationModel:
    """Update details of an existing proposed candidate location."""
    updated = CandidateRankingService.update_candidate(candidate_id, req)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate location with ID '{candidate_id}' was not found.",
        )
    return updated


@router.delete("/{candidate_id}", status_code=status.HTTP_200_OK)
def delete_candidate_location(candidate_id: str):
    """Delete a proposed candidate location from the Gujarat expansion inventory."""
    deleted = CandidateRankingService.delete_candidate(candidate_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate location with ID '{candidate_id}' was not found.",
        )
    return {
        "status": "success",
        "message": f"Candidate '{candidate_id}' deleted successfully.",
        "deleted_id": candidate_id,
    }


@router.get("/{candidate_id}/evidence", response_model=CandidateDossierResponse)
def get_candidate_evidence(candidate_id: str) -> CandidateDossierResponse:
    """Retrieve detailed provenance trail, source citations, and road distance evidence for a candidate."""
    return get_candidate_dossier(candidate_id)


@router.post("/discover")
def trigger_gujarat_discovery():
    """Trigger or refresh automated Gujarat city discovery pipeline."""
    # Returns operational summary of existing discoveries
    all_stations = CandidateRankingService.load_network_stations()
    all_candidates = CandidateRankingService.load_candidate_locations()
    return {
        "status": "success",
        "message": "Gujarat candidate and station inventory is up to date.",
        "verified_stations_count": sum(1 for s in all_stations if s.verification_status == "Verified"),
        "discovered_stations_count": sum(1 for s in all_stations if s.verification_status == "Discovered"),
        "candidates_count": len(all_candidates),
        "coverage_scope": "Statewide Gujarat (Ahmedabad, Surat, Vadodara, Rajkot, Bharuch, Kutch, Bhavnagar, Jamnagar, Anand, Vapi, Mehsana)",
    }


@network_router.get("/stations", response_model=GujaratNetworkStationsResponse)
def get_gujarat_network_stations(
    search: Optional[str] = Query(None, description="Search by station name, locality, or address"),
    city: Optional[str] = Query(None, description="Filter by Gujarat city/town"),
    district: Optional[str] = Query(None, description="Filter by Gujarat district"),
    operational_status: Optional[str] = Query(None, description="Filter by operational status: verified, discovered, potential"),
) -> GujaratNetworkStationsResponse:
    """Retrieve all operational and discovered CNG stations across Gujarat with search and multi-attribute filters."""
    return CandidateRankingService.get_network_stations_summary(
        search_query=search,
        city_filter=city,
        district_filter=district,
        operational_status_filter=operational_status,
    )
