from typing import List, Literal, Optional
from pydantic import BaseModel, Field


ValueClassification = Literal[
    "Actual historical data",
    "Forecasted value",
    "Model-based estimate",
    "Scenario assumption",
    "Provided scenario input",
    "Unavailable",
]

OverallAssessmentLabel = Literal[
    "Potential Coverage Gap",
    "High Existing Station Density",
    "Moderate Geographical Overlap",
    "Potential Network Expansion Opportunity",
    "Insufficient Data",
]

BeneficialOutcomeLabel = Literal[
    "Potentially Beneficial",
    "Potentially Not Beneficial",
    "Inconclusive / Insufficient Data",
]


class NearbyVerifiedStation(BaseModel):
    station_id: str
    station_name: str
    distance_km: float
    address: str = ""
    locality: str = ""
    city: str = ""
    district: str = ""
    operator: str = ""
    brand: str = ""
    latitude: float
    longitude: float
    is_verified: bool = True
    data_source: str = ""
    demand_data_available: bool = False
    historical_daily_demand_kg: Optional[float] = None
    forecasted_daily_demand_kg: Optional[float] = None
    daily_capacity_kg: Optional[float] = None
    capacity_data_available: bool = False


class ProposedLocationPoint(BaseModel):
    name: Optional[str] = None
    location_label: Optional[str] = None
    latitude: float
    longitude: float
    expected_daily_capacity_kg: Optional[float] = None
    in_gujarat_bounds: bool = True
    status: str = "PROPOSED"


class NearbyStationsResponse(BaseModel):
    proposed_location: ProposedLocationPoint
    radius_km: float
    total_verified_stations_checked: int
    nearby_count: int
    nearby_stations: List[NearbyVerifiedStation]
    nearest_station: Optional[NearbyVerifiedStation] = None
    farthest_nearby_station: Optional[NearbyVerifiedStation] = None
    nearest_overall_station: Optional[NearbyVerifiedStation] = None
    distance_method: str = "Haversine great-circle distance (km)"
    data_integrity_note: str


class NetworkImpactSimulationRequest(BaseModel):
    proposed_name: Optional[str] = Field(default="Proposed CNG Station", max_length=160)
    proposed_location_label: Optional[str] = Field(default=None, max_length=320)
    proposed_latitude: float = Field(..., ge=-90.0, le=90.0)
    proposed_longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_km: float = Field(default=5.0, ge=0.5, le=50.0)
    expected_daily_capacity_kg: Optional[float] = Field(default=None, gt=0.0, le=100000.0)
    candidate_id: Optional[str] = None


class DiversionAssessment(BaseModel):
    status: str
    available: bool = False
    spatial_overlap_risk: Literal["None", "Low", "Moderate", "High", "Unknown"] = "Unknown"
    explanation: str
    demand_data_origin: str = "none"
    stations_with_demand_data: int = 0
    stations_without_demand_data: int = 0


class GeographicalMetrics(BaseModel):
    nearby_verified_count: int
    total_verified_stations_checked: int
    nearest_station: Optional[NearbyVerifiedStation] = None
    nearest_within_radius: Optional[NearbyVerifiedStation] = None
    farthest_nearby_station: Optional[NearbyVerifiedStation] = None
    average_nearby_distance_km: Optional[float] = None
    coverage_improvement_level: Literal["High", "Moderate", "Low", "Minimal", "Insufficient Data"]
    coverage_improvement_summary: str
    overlap_level: Literal["None", "Low", "Moderate", "High", "Insufficient Data"]
    overlap_summary: str


class StationSalesImpactRow(BaseModel):
    station_id: str
    station_name: str
    city: str = ""
    operator: str = ""
    distance_km: float
    is_nearest: bool = False
    has_sales_data: bool = False
    sales_data_classification: ValueClassification = "Unavailable"
    current_daily_sales_kg: Optional[float] = None
    forecasted_daily_demand_kg: Optional[float] = None
    estimated_diversion_share: Optional[float] = None
    estimated_sales_loss_kg: Optional[float] = None
    remaining_daily_sales_kg: Optional[float] = None
    reduction_pct: Optional[float] = None
    loss_classification: ValueClassification = "Unavailable"
    capacity_available: bool = False
    daily_capacity_kg: Optional[float] = None
    status_label: str = "VERIFIED"


class DemandAndSalesEstimate(BaseModel):
    available: bool = False
    status: Literal["Estimated (Scenario-Based)", "Insufficient Data"] = "Insufficient Data"
    data_origin: str = "none"
    methodology: str
    nearest_station_name: Optional[str] = None
    nearest_station_distance_km: Optional[float] = None
    nearby_with_sales_count: int = 0
    nearby_total_count: int = 0
    avg_nearby_daily_sales_kg: Optional[float] = None
    potential_daily_demand_kg: Optional[float] = None
    potential_daily_sales_kg: Optional[float] = None
    potential_monthly_sales_kg: Optional[float] = None
    diverted_from_nearby_kg: Optional[float] = None
    incremental_coverage_gain_kg: Optional[float] = None
    capacity_provided_kg: Optional[float] = None
    capacity_utilization_pct: Optional[float] = None
    capacity_status: str = "Unavailable (not provided)"
    demand_classification: ValueClassification = "Unavailable"
    sales_classification: ValueClassification = "Unavailable"
    assumptions: List[str] = []
    limitations: List[str] = []
    reason_unavailable: Optional[str] = None


class NetworkSalesImpactSummary(BaseModel):
    available: bool = False
    status: Literal["Calculated (Scenario-Based)", "Insufficient Data"] = "Insufficient Data"
    proposed_station_daily_sales_kg: Optional[float] = None
    total_nearby_sales_loss_kg: Optional[float] = None
    net_network_sales_change_kg: Optional[float] = None
    network_sales_before_kg: Optional[float] = None
    network_sales_after_kg: Optional[float] = None
    existing_stations_sales_after_kg: Optional[float] = None
    net_network_impact_pct: Optional[float] = None
    station_count_with_sales: int = 0
    station_count_without_sales: int = 0
    classification: ValueClassification = "Unavailable"
    note: str
    reason_unavailable: Optional[str] = None


class BeneficialAssessment(BaseModel):
    outcome: BeneficialOutcomeLabel
    confidence: Literal["Scenario-based", "Insufficient data"]
    summary: str
    criteria_evaluated: List[str] = []
    missing_data_requirements: List[str] = []
    caveat: str


class NetworkImpactSimulationResponse(BaseModel):
    proposed_station: ProposedLocationPoint
    radius_km: float
    candidate_id: Optional[str] = None
    overall_assessment: OverallAssessmentLabel
    assessment_summary: str
    geographical_metrics: GeographicalMetrics
    nearby_stations: List[NearbyVerifiedStation]
    diversion_assessment: DiversionAssessment
    station_impact_rows: List[StationSalesImpactRow] = []
    demand_estimate: DemandAndSalesEstimate
    network_sales_impact: NetworkSalesImpactSummary
    beneficial_assessment: BeneficialAssessment
    metric_methodology_note: str
    data_integrity_note: str
    warnings: List[str] = []
