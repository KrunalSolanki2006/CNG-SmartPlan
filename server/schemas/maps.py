"""Pydantic schemas for SerpApi Google Maps integrations: search, autocomplete, place details, and directions."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GPSCoordinates(BaseModel):
    """Geographic point coordinates."""
    latitude: float = Field(..., description="Latitude in decimal degrees")
    longitude: float = Field(..., description="Longitude in decimal degrees")


class DiscoveredStation(BaseModel):
    """CNG station candidate discovered via Google Maps Search API with review workflow tracking."""
    id: str = Field(..., description="Internal unique identifier for the discovered candidate")
    station_id: str = Field(..., description="Alias identifier matching id")
    station_name: str = Field(..., description="Commercial station title from Google Maps")
    address: Optional[str] = Field(default=None, description="Full formatted address")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    verification_status: str = Field(
        default="unverified_candidate",
        description="One of: unverified_candidate, pending_review, verified_project_record, rejected, proposed_simulation_location",
    )
    data_source: str = Field(default="serpapi_google_maps", description="Source provenance marker")
    rating: Optional[float] = Field(default=None, description="Google Maps average star rating")
    reviews_count: Optional[int] = Field(default=None, description="Total review count")
    open_state: Optional[str] = Field(default=None, description="Current operating status e.g. Open 24 hours")
    thumbnail: Optional[str] = Field(default=None, description="Primary photo thumbnail URL")
    phone: Optional[str] = Field(default=None, description="Station contact phone number")
    place_id: Optional[str] = Field(default=None, description="Google Place ID")
    data_cid: Optional[str] = Field(default=None, description="Google Maps Customer ID / CID")
    data_id: Optional[str] = Field(default=None, description="Google Maps internal data ID")
    google_maps_url: Optional[str] = Field(default=None, description="Web link to Google Maps listing")
    operating_status: Optional[str] = Field(default="OPERATIONAL", description="Operational status if listed")
    is_within_study_area: bool = Field(default=True, description="Whether station falls inside Ahmedabad bounding box")
    discovered_at: str = Field(..., description="ISO 8601 discovery timestamp")
    is_fixture: bool = Field(default=False, description="True if loaded from offline demo fixture")
    reviewed_at: Optional[str] = Field(default=None, description="ISO timestamp of last review decision")
    reviewer_notes: Optional[str] = Field(default=None, description="Planner review comments")
    review_history: List[Dict[str, Any]] = Field(default_factory=list, description="Audit trail of review decisions")
    potential_duplicate_of: Optional[str] = Field(default=None, description="Existing station if proximity detected (<250m)")


class MapSearchResponse(BaseModel):
    """Response payload for Google Maps CNG station search."""
    query: str
    total_results: int
    cached: bool = False
    is_fixture: bool = False
    study_area_bbox: Dict[str, float]
    stations: List[DiscoveredStation]


class AutocompleteSuggestion(BaseModel):
    """Individual autocomplete result from SerpApi Google Maps Autocomplete."""
    title: str = Field(..., description="Primary place or keyword title")
    subtitle: Optional[str] = Field(default=None, description="Secondary locality or context")
    description: Optional[str] = Field(default=None, description="Full string description")
    suggestion_type: str = Field(..., description="'place' or 'keyword'")
    place_id: Optional[str] = Field(default=None, description="Google Place ID if available")
    data_id: Optional[str] = Field(default=None, description="Google data ID if available")
    latitude: Optional[float] = Field(default=None, description="Extracted latitude for selectable places")
    longitude: Optional[float] = Field(default=None, description="Extracted longitude for selectable places")
    is_selectable_place: bool = Field(..., description="True if suggestion has valid coordinates and can be pinned")


class AutocompleteResponse(BaseModel):
    """Response payload for location autocomplete."""
    query: str
    cached: bool = False
    is_fixture: bool = False
    suggestions: List[AutocompleteSuggestion]


class PlaceDetailsRequest(BaseModel):
    """Request payload to retrieve rich details for a specific place."""
    place_id: Optional[str] = Field(default=None, description="Google Place ID (preferred)")
    data_cid: Optional[str] = Field(default=None, description="Customer ID CID")
    data_id: Optional[str] = Field(default=None, description="Google data ID")
    latitude: Optional[float] = Field(default=None, description="Latitude for legacy coordinate fallback")
    longitude: Optional[float] = Field(default=None, description="Longitude for legacy coordinate fallback")


class PlaceReview(BaseModel):
    """User review snippet."""
    author: Optional[str] = None
    rating: Optional[float] = None
    date: Optional[str] = None
    snippet: Optional[str] = None


class PlaceDetailsResponse(BaseModel):
    """Rich place details parsed from Google Maps."""
    place_id: Optional[str] = None
    data_cid: Optional[str] = None
    data_id: Optional[str] = None
    title: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    open_state: Optional[str] = None
    hours: Optional[List[Dict[str, str]]] = None
    gps_coordinates: Optional[GPSCoordinates] = None
    thumbnail: Optional[str] = None
    images: Optional[List[str]] = Field(default_factory=list)
    google_maps_url: Optional[str] = None
    reviews: Optional[List[PlaceReview]] = Field(default_factory=list)
    cached: bool = False
    is_fixture: bool = False


class DirectionsRequest(BaseModel):
    """Request payload for route and directions calculation."""
    start_lat: float = Field(..., description="Origin latitude")
    start_lng: float = Field(..., description="Origin longitude")
    end_lat: float = Field(..., description="Destination latitude")
    end_lng: float = Field(..., description="Destination longitude")
    travel_mode: int = Field(default=0, description="0 = driving (default)")


class RouteStep(BaseModel):
    """Individual navigation step."""
    instruction: str
    distance: Optional[str] = None
    duration: Optional[str] = None
    gps_coordinates: Optional[GPSCoordinates] = None


class RouteAlternative(BaseModel):
    """A viable route alternative between origin and destination."""
    route_id: int
    summary: Optional[str] = None
    distance_km: float
    distance_text: str
    duration_mins: float
    duration_text: str
    steps: List[RouteStep]
    polyline_coords: List[List[float]] = Field(
        ..., description="List of [latitude, longitude] pairs for Leaflet Polyline"
    )


class DirectionsResponse(BaseModel):
    """Full routing response comparing straight-line vs actual road travel."""
    origin: GPSCoordinates
    destination: GPSCoordinates
    straight_line_distance_km: float
    road_distance_km: float
    detour_ratio: float
    primary_duration_text: str
    primary_duration_mins: float
    routes: List[RouteAlternative]
    cached: bool = False
    is_fixture: bool = False


class CandidateStatusUpdateRequest(BaseModel):
    """Payload to transition candidate status in review workflow."""
    status: str = Field(
        ...,
        description="Target status: unverified_candidate, pending_review, verified_project_record, rejected, proposed_simulation_location",
    )
    notes: Optional[str] = Field(default=None, description="Review justification or planner notes")


class CandidateSummaryResponse(BaseModel):
    """Summary counts across candidate review stages."""
    total: int
    unverified_count: int
    pending_review_count: int
    verified_count: int
    rejected_count: int
    proposed_simulation_count: int


class MapsStatusResponse(BaseModel):
    """Operational status and reliability metrics of SerpApi Google Maps service."""
    mode: str = Field(..., description="'auto', 'live', or 'demo'")
    api_key_configured: bool
    cache_entries_count: int
    discoveries_count: int
    offline_fixtures_available: bool


class SetModeRequest(BaseModel):
    """Payload to toggle SerpApi service operational mode."""
    mode: str = Field(..., description="'auto', 'live', or 'demo'")
