"""Pydantic schemas for Gujarat Candidate Location Ranking & Geospatial Evaluation.

Governed by Phase 4, Phase 5, and Phase 6 rules:
- Configurable weights with dynamic renormalization for missing criteria.
- Separate verified vs discovered stations.
- Full provenance and criteria availability tracking.
- Explicit data completeness and confidence tiers.
- Unrankable state handling for candidates with insufficient data.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScoringWeightsConfig(BaseModel):
    """Configurable scoring weights for candidate ranking algorithm."""

    model_config = ConfigDict(extra="forbid")

    demand_weight: float = Field(default=0.35, ge=0.0, le=1.0, description="Weight for estimated demand proxy (default: 35%)")
    service_gap_weight: float = Field(default=0.30, ge=0.0, le=1.0, description="Weight for network service gap (default: 30%)")
    road_accessibility_weight: float = Field(default=0.20, ge=0.0, le=1.0, description="Weight for road accessibility and highway tier (default: 20%)")
    distance_weight: float = Field(default=0.15, ge=0.0, le=1.0, description="Weight for distance from nearest operating station (default: 15%)")
    min_distance_threshold_km: float = Field(default=2.0, ge=0.5, le=10.0, description="Minimum distance before cannibalization penalty applies (km)")
    service_gap_ideal_km: float = Field(default=8.0, ge=3.0, le=25.0, description="Ideal service gap distance from nearest station (km)")


class CriterionScore(BaseModel):
    """Detailed score component for a single evaluation criterion."""

    criterion_key: str = Field(..., description="Criterion identifier (e.g. demand, service_gap, road_accessibility, distance)")
    criterion_name: str = Field(..., description="Human-readable title")
    raw_value: Optional[float] = Field(default=None, description="Underlying metric before normalization (e.g. AADT or km)")
    unit: str = Field(default="", description="Measurement unit (e.g. PCU/day, km, index)")
    normalized_score: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Normalized score on 0-100 scale (None if missing)")
    base_weight: float = Field(..., description="Original configured weight (e.g. 0.35)")
    effective_weight: float = Field(..., description="Weight applied after missing criteria renormalization")
    weighted_contribution: Optional[float] = Field(default=None, description="Score * effective_weight (points contributed to final score)")
    is_missing: bool = Field(default=False, description="True if underlying data was missing and excluded from calculation")
    explanation: str = Field(..., description="Human-readable explanation of how this criterion was evaluated")


class NearbyStationSummary(BaseModel):
    """Summary of a nearby operational station for multi-station proximity analysis."""

    station_id: str
    station_name: str
    city: str
    district: str
    straight_line_distance_km: float
    driving_road_distance_km: Optional[float] = None
    drive_time_text: Optional[str] = None
    is_verified: bool = True


class NearestStationEvidence(BaseModel):
    """Road and geodesic spatial evidence connecting candidate to nearest operating station."""

    station_id: str
    station_name: str
    city: str
    district: str
    straight_line_distance_km: float
    road_distance_km: Optional[float] = None
    driving_road_distance_km: Optional[float] = None
    drive_time_text: Optional[str] = None
    drive_time_mins: Optional[float] = None
    detour_ratio: Optional[float] = None
    is_verified: bool = True
    route_available: bool = False
    polyline_coords: Optional[List[List[float]]] = None
    nearest_three_stations: List[NearbyStationSummary] = Field(default_factory=list)
    stations_within_radius: Dict[str, int] = Field(default_factory=dict)


class CandidateLocationModel(BaseModel):
    """Complete candidate location specification."""

    candidate_id: str
    name: str
    category: str
    address: str
    locality: str
    city: str
    district: str
    state: str = "Gujarat"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_id: Optional[str] = None
    verification_status: str
    source_evidence: str
    discovery_method: str
    road_corridor: str
    nearest_major_highway: str
    highway_tier: str
    traffic_pcu_per_day: Optional[float] = None
    commercial_vehicle_density_proxy: Optional[float] = None
    pipeline_proximity_meters: Optional[float] = None
    land_zoning: str
    retrieved_at: str
    last_verified_at: Optional[str] = None
    available_criteria: List[str]
    missing_criteria: List[str]
    notes: str


class CandidateRankingItem(BaseModel):
    """Ranked candidate summary item for leaderboard and map display."""

    candidate_id: str
    name: str
    category: str
    city: str
    district: str
    latitude: Optional[float]
    longitude: Optional[float]
    highway_corridor: str
    final_score: Optional[float] = None
    rank: Optional[int] = None
    is_rankable: bool
    unrankable_reason: Optional[str] = None
    data_completeness_pct: float
    confidence_tier: str
    demand_score: Optional[float] = None
    service_gap_score: Optional[float] = None
    road_accessibility_score: Optional[float] = None
    distance_score: Optional[float] = None
    nearest_station: Optional[NearestStationEvidence] = None
    summary_verdict: str


class CandidateDossierResponse(BaseModel):
    """Comprehensive analytical dossier for a selected candidate location."""

    candidate: CandidateLocationModel
    is_rankable: bool
    unrankable_reason: Optional[str] = None
    rank: Optional[int] = None
    final_score: Optional[float] = None
    confidence_tier: str
    data_completeness_pct: float
    scoring_breakdown: List[CriterionScore]
    weights_applied: Dict[str, float]
    renormalization_applied: bool
    nearest_station: Optional[NearestStationEvidence] = None
    full_audit_explanation: str
    feasibility_disclaimer: str = (
        "Suitability scoring reflects preliminary decision-support modeling. "
        "Road accessibility and demand proxies do not establish legal land title, "
        "PESO statutory clearances, or physical gas pipeline hookup permissions."
    )


class CandidateRankingsResponse(BaseModel):
    """Response envelope for ranked candidate location query."""

    total_candidates: int
    rankable_count: int
    unrankable_count: int
    weights_applied: ScoringWeightsConfig
    candidates: List[CandidateRankingItem]
    available_cities: List[str]
    available_districts: List[str]
    available_categories: List[str]
    governance_notice: str = (
        "FUELCAST Candidate Ranking Engine: Scores are calculated dynamically using multi-criteria weighted "
        "normalization. Candidates with missing criteria undergo transparent weight renormalization. Candidates "
        "with insufficient essential criteria are strictly designated as Not Rankable."
    )


class RecalculateRankingRequest(BaseModel):
    """Payload to dynamically recalculate rankings with custom weights or thresholds."""

    weights: Optional[ScoringWeightsConfig] = None
    city_filter: Optional[str] = None
    district_filter: Optional[str] = None
    category_filter: Optional[str] = None
    min_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    rankable_only: bool = False


class GujaratStationModel(BaseModel):
    """Clean Gujarat station record distinguishing verified from unverified discoveries."""

    station_id: str
    station_name: str
    operator: str
    brand: str
    address: str
    locality: str
    city: str
    district: str
    state: str = "Gujarat"
    pincode: str
    latitude: Optional[float]
    longitude: Optional[float]
    place_id: Optional[str]
    rating: Optional[float]
    reviews_count: Optional[int]
    verification_status: str
    cng_dispensing_confirmed: bool
    data_source: str
    source_url: Optional[str]
    retrieved_at: str
    last_verified_at: Optional[str]
    notes: str
    cng_classification: Optional[str] = "DISCOVERED_CNG"
    previous_classification: Optional[str] = None
    status_change_reason: Optional[str] = None
    cng_audit_reason: Optional[str] = None
    cng_business_type: Optional[str] = None
    historical_daily_demand_kg: Optional[float] = None
    forecasted_daily_demand_kg: Optional[float] = None
    demand_data_available: bool = False
    demand_notes: Optional[str] = None


class GujaratNetworkStationsResponse(BaseModel):
    """Gujarat-wide station inventory for mapping and distance calculations."""

    total_stations: int
    verified_count: int
    discovered_count: int
    requires_review_count: int
    verified_operating_count: int = 0
    discovered_cng_count: int = 0
    potential_count: int = 0
    rejected_count: int = 0
    confirmed_count: int = 0
    stations: List[GujaratStationModel]
    available_cities: List[str] = Field(default_factory=list)
    available_districts: List[str] = Field(default_factory=list)
    diagnostics: Optional[Dict[str, Any]] = None


class CandidateCreateRequest(BaseModel):
    """Payload to create a new proposed candidate location (Method 1 Autocomplete or Method 2 Map Click)."""

    name: str = Field(..., min_length=2, max_length=150, description="Candidate location name")
    city: str = Field(..., min_length=2, max_length=100, description="City / Town")
    district: str = Field(..., min_length=2, max_length=100, description="District")
    category: str = Field(default="industrial_hub", description="industrial_hub | highway_corridor | logistics_transit | underserved_rural_fringe | urban_commercial")
    latitude: float = Field(..., ge=20.0, le=25.0, description="Latitude (Gujarat range 20.0 - 25.0)")
    longitude: float = Field(..., ge=68.0, le=75.0, description="Longitude (Gujarat range 68.0 - 75.0)")
    address: Optional[str] = Field(default="", description="Detailed address")
    locality: Optional[str] = Field(default="", description="Locality or landmark")
    road_corridor: Optional[str] = Field(default="", description="Connecting highway / road name")
    nearest_major_highway: Optional[str] = Field(default="", description="Primary highway code")
    highway_tier: Optional[str] = Field(default="State Highway", description="National Highway | State Highway | Major District Road | Express Highway")
    traffic_pcu_per_day: Optional[float] = Field(default=None, ge=0.0, description="Traffic census PCU/day")
    commercial_vehicle_density_proxy: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Commercial vehicle fleet density (0-100)")
    pipeline_proximity_meters: Optional[float] = Field(default=None, ge=0.0, description="Distance to gas pipeline (meters)")
    land_zoning: Optional[str] = Field(default="Commercial / GIDC", description="Zoning type")
    place_id: Optional[str] = Field(default=None, description="Google Maps Place ID if retrieved via autocomplete")
    notes: Optional[str] = Field(default="", description="Planner notes")


class CandidateUpdateRequest(BaseModel):
    """Payload to update an existing proposed candidate location."""

    name: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    locality: Optional[str] = None
    road_corridor: Optional[str] = None
    nearest_major_highway: Optional[str] = None
    highway_tier: Optional[str] = None
    traffic_pcu_per_day: Optional[float] = None
    commercial_vehicle_density_proxy: Optional[float] = None
    pipeline_proximity_meters: Optional[float] = None
    land_zoning: Optional[str] = None
    notes: Optional[str] = None


class CandidateCompareRequest(BaseModel):
    """Request payload to compare 2 to 5 candidates side-by-side."""

    candidate_ids: List[str] = Field(..., min_length=2, max_length=5, description="List of candidate IDs to compare")


class CandidateComparisonItem(BaseModel):
    """Single candidate evaluation in comparison matrix."""

    candidate_id: str
    name: str
    city: str
    district: str
    category: str
    rank: Optional[int]
    final_score: Optional[float]
    confidence_tier: str
    data_completeness_pct: float
    demand_score: Optional[float]
    service_gap_score: Optional[float]
    road_accessibility_score: Optional[float]
    distance_score: Optional[float]
    nearest_station_name: Optional[str]
    nearest_station_distance_km: Optional[float]
    summary_verdict: str


class CandidateCompareResponse(BaseModel):
    """Side-by-side comparison matrix and key factor winners."""

    candidates: List[CandidateComparisonItem]
    best_overall_candidate: str
    highest_demand_candidate: str
    largest_service_gap_candidate: str
    best_accessibility_candidate: str
    closest_to_existing_network: str
    most_isolated_candidate: str
    comparison_summary: str
