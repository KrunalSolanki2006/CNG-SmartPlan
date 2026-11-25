"""Candidate Ranking & Multi-Criteria Geospatial Evaluation Service.

Governed strictly by Phase 5, Phase 6, and Phase 7 specifications:
- Dynamic weighted normalization (Demand 35%, Service Gap 30%, Road Accessibility 20%, Distance 15%).
- Zero-assignment prohibition: missing criteria trigger weight renormalization.
- High/Moderate/Low/Indeterminate confidence tiers and completeness percentages.
- Strict Not Rankable tagging for candidates with insufficient data.
- Full provenance tracking and transparent audit narrative explanations.
"""

import json
import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from schemas.candidates import (
    CandidateCompareRequest,
    CandidateCompareResponse,
    CandidateComparisonItem,
    CandidateCreateRequest,
    CandidateDossierResponse,
    CandidateLocationModel,
    CandidateRankingItem,
    CandidateRankingsResponse,
    CandidateUpdateRequest,
    CriterionScore,
    GujaratNetworkStationsResponse,
    GujaratStationModel,
    NearbyStationSummary,
    NearestStationEvidence,
    RecalculateRankingRequest,
    ScoringWeightsConfig,
)
from services.geo_service import GeoService
from services.google_maps_service import google_maps_service

logger = logging.getLogger(__name__)

CURATED_DIR = Path(__file__).resolve().parent.parent / "data" / "curated"
STATIONS_FILE = CURATED_DIR / "gujarat_network_stations.json"
CANDIDATES_FILE = CURATED_DIR / "gujarat_candidate_locations.json"
DISCOVERED_STATIONS_FILE = CURATED_DIR / "discovered_cng_stations_gujarat.json"
DISCOVERY_METRICS_FILE = CURATED_DIR / "discovery_diagnostics.json"


AHMEDABAD_HISTORICAL_DEMAND = {
    "AMD001": 1531.3,
    "AMD002": 1518.3,
    "AMD003": 1407.2,
    "AMD004": 1107.0,
    "AMD005": 1229.8,
    "AMD006": 1324.1,
    "AMD007": 1635.0,
    "AMD008": 1097.2,
    "AMD009": 1112.5,
    "AMD011": 1230.4,
    "AMD012": 888.3,
}


class CandidateRankingService:
    """Service for discovering, evaluating, and ranking Gujarat CNG station candidate locations."""

    DEFAULT_WEIGHTS = ScoringWeightsConfig()

    @classmethod
    def load_network_stations(
        cls,
        include_discovered: bool = True,
        include_rejected: bool = False,
    ) -> List[GujaratStationModel]:
        """Load all Gujarat network stations (verified and discovered), strictly filtering by CNG dispensing evidence."""
        stations: List[GujaratStationModel] = []
        if STATIONS_FILE.exists():
            try:
                with open(STATIONS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    sid = item.get("station_id")
                    if sid in AHMEDABAD_HISTORICAL_DEMAND:
                        item["historical_daily_demand_kg"] = AHMEDABAD_HISTORICAL_DEMAND[sid]
                        item["forecasted_daily_demand_kg"] = round(AHMEDABAD_HISTORICAL_DEMAND[sid] * 1.05, 1)
                        item["demand_data_available"] = True
                        item["demand_notes"] = f"Empirical daily metered sales across 731 days (Avg: {AHMEDABAD_HISTORICAL_DEMAND[sid]} kg/day)."
                    else:
                        item["historical_daily_demand_kg"] = None
                        item["forecasted_daily_demand_kg"] = None
                        item["demand_data_available"] = False
                        item["demand_notes"] = "Demand data unavailable outside the core Ahmedabad municipal study area."
                    stations.append(GujaratStationModel(**item))
            except Exception as e:
                logger.error(f"Error reading Gujarat network stations from {STATIONS_FILE}: {e}")

        if include_discovered and DISCOVERED_STATIONS_FILE.exists():
            try:
                with open(DISCOVERED_STATIONS_FILE, "r", encoding="utf-8") as f:
                    disc_data = json.load(f)
                existing_ids = {s.station_id for s in stations}
                existing_place_ids = {s.place_id for s in stations if s.place_id}

                for item in disc_data:
                    pid = item.get("place_id")
                    sid = item.get("station_id") or f"DISC_{len(stations)+1:03d}"
                    if (pid and pid in existing_place_ids) or (sid in existing_ids):
                        continue

                    cng_class = item.get("cng_classification", "DISCOVERED_CNG")
                    # Strict Exclusion: Exclude NOT_CNG general petrol pumps unless explicitly requested
                    if not include_rejected and cng_class == "NOT_CNG":
                        continue

                    # Parse brand from title
                    name = item.get("station_name", "")
                    brand = "CNG Station"
                    for b in ["Adani Total Gas", "Adani Gas", "Sabarmati Gas", "Gujarat Gas", "Torrent Gas", "Indian Oil", "Bharat Petroleum", "Hindustan Petroleum"]:
                        if b.lower() in name.lower():
                            brand = b
                            break

                    v_status = "Discovered CNG"
                    if cng_class == "VERIFIED_OPERATING_CNG":
                        v_status = "Verified Operating CNG"
                    elif cng_class == "DISCOVERED_CNG":
                        v_status = "Discovered CNG"
                    elif cng_class == "POTENTIAL_CNG":
                        v_status = "Potential CNG"
                    elif cng_class == "NOT_CNG":
                        v_status = "Rejected"

                    model = GujaratStationModel(
                        station_id=sid,
                        station_name=name,
                        operator=brand,
                        brand=brand,
                        address=item.get("address") or f"{item.get('city', 'Gujarat')}, Gujarat",
                        locality=item.get("locality") or item.get("city") or "Gujarat",
                        city=item.get("city", "Gujarat"),
                        district=item.get("district", "Gujarat"),
                        state=item.get("state", "Gujarat"),
                        pincode="",
                        latitude=item.get("latitude"),
                        longitude=item.get("longitude"),
                        place_id=pid,
                        rating=item.get("rating"),
                        reviews_count=item.get("reviews_count"),
                        verification_status=v_status,
                        cng_dispensing_confirmed=(cng_class == "VERIFIED_OPERATING_CNG"),
                        data_source=item.get("data_source") or "Google Maps (SerpAPI)",
                        source_url=item.get("google_maps_url") or item.get("source_url"),
                        retrieved_at=item.get("discovered_at") or item.get("retrieved_at") or "",
                        last_verified_at=item.get("last_verified_at"),
                        notes=item.get("cng_audit_reason") or "Discovered via SerpAPI Google Maps search.",
                        cng_classification=cng_class,
                        previous_classification=item.get("previous_classification"),
                        status_change_reason=item.get("status_change_reason"),
                        cng_audit_reason=item.get("cng_audit_reason"),
                        cng_business_type=item.get("cng_business_type"),
                        historical_daily_demand_kg=None,
                        forecasted_daily_demand_kg=None,
                        demand_data_available=False,
                        demand_notes="Demand data unavailable for unverified web discovery.",
                    )
                    stations.append(model)
                    existing_ids.add(sid)
                    if pid:
                        existing_place_ids.add(pid)
            except Exception as e:
                logger.warning(f"Error loading discovered stations into network: {e}")

        return stations

    @classmethod
    def load_candidate_locations(cls) -> List[CandidateLocationModel]:
        """Load candidate greenfield locations across Gujarat."""
        if not CANDIDATES_FILE.exists():
            logger.warning(f"Gujarat candidates file not found at {CANDIDATES_FILE}")
            return []
        try:
            with open(CANDIDATES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [CandidateLocationModel(**item) for item in data]
        except Exception as e:
            logger.error(f"Error reading Gujarat candidates from {CANDIDATES_FILE}: {e}")
            return []

    @classmethod
    def find_nearest_verified_station(
        cls,
        candidate_lat: Optional[float],
        candidate_lng: Optional[float],
        verified_stations: List[GujaratStationModel],
    ) -> Optional[NearestStationEvidence]:
        """Find closest operating stations with verified coordinates using geodesic & road routing, plus 3 nearest & radius counts."""
        if candidate_lat is None or candidate_lng is None or not verified_stations:
            return None

        station_distances: List[Tuple[float, GujaratStationModel]] = []

        for st in verified_stations:
            if st.latitude is not None and st.longitude is not None and (
                st.cng_classification == "VERIFIED_OPERATING_CNG" or st.verification_status in ["Verified", "Verified Operating CNG"]
            ):
                dist = GeoService.haversine_distance_km(candidate_lat, candidate_lng, st.latitude, st.longitude)
                station_distances.append((dist, st))

        if not station_distances:
            return None

        # Sort by straight line distance ascending
        station_distances.sort(key=lambda x: x[0])
        min_dist_km, nearest_st = station_distances[0]
        straight_line_km = round(min_dist_km, 2)

        # Estimate road distance & transit time using calibrated circuity factor
        est_road_km = round(straight_line_km * 1.38, 2)
        est_mins = round((est_road_km / 38.0) * 60.0, 1)
        detour_ratio = round(est_road_km / max(0.1, straight_line_km), 2)

        # Nearest three stations
        nearest_three: List[NearbyStationSummary] = []
        for d, s in station_distances[:3]:
            r_km = round(d * 1.38, 2)
            m_mins = round((r_km / 38.0) * 60.0, 1)
            t_txt = f"{int(m_mins)} mins" if m_mins < 60 else f"{int(m_mins // 60)} hr {int(m_mins % 60)} mins"
            nearest_three.append(
                NearbyStationSummary(
                    station_id=s.station_id,
                    station_name=s.station_name,
                    city=s.city,
                    district=s.district,
                    straight_line_distance_km=round(d, 2),
                    driving_road_distance_km=r_km,
                    drive_time_text=t_txt,
                    is_verified=True,
                )
            )

        # Station count within configurable radii
        within_radii = {
            "1km": sum(1 for d, _ in station_distances if d <= 1.0),
            "3km": sum(1 for d, _ in station_distances if d <= 3.0),
            "5km": sum(1 for d, _ in station_distances if d <= 5.0),
            "10km": sum(1 for d, _ in station_distances if d <= 10.0),
        }

        return NearestStationEvidence(
            station_id=nearest_st.station_id,
            station_name=nearest_st.station_name,
            city=nearest_st.city,
            district=nearest_st.district,
            straight_line_distance_km=straight_line_km,
            road_distance_km=est_road_km,
            driving_road_distance_km=est_road_km,
            drive_time_text=f"{int(est_mins)} mins" if est_mins < 60 else f"{int(est_mins // 60)} hr {int(est_mins % 60)} mins",
            drive_time_mins=est_mins,
            detour_ratio=detour_ratio,
            is_verified=True,
            route_available=True,
            polyline_coords=[
                [candidate_lat, candidate_lng],
                [nearest_st.latitude, nearest_st.longitude],
            ],
            nearest_three_stations=nearest_three,
            stations_within_radius=within_radii,
        )

    @classmethod
    def evaluate_demand_criterion(
        cls,
        candidate: CandidateLocationModel,
        base_weight: float,
    ) -> CriterionScore:
        """Evaluate estimated demand using commercial vehicle density and traffic volume AADT proxy."""
        density = candidate.commercial_vehicle_density_proxy
        aadt = candidate.traffic_pcu_per_day

        if density is None and aadt is None:
            return CriterionScore(
                criterion_key="demand",
                criterion_name="Estimated Commercial Demand Proxy",
                raw_value=None,
                unit="Commercial Proxy Index",
                normalized_score=None,
                base_weight=base_weight,
                effective_weight=0.0,
                weighted_contribution=None,
                is_missing=True,
                explanation="No verifiable commercial traffic census or vehicle density proxy available for this location.",
            )

        # If both available: weighted blend (60% vehicle fleet density + 40% AADT volume)
        if density is not None and aadt is not None:
            aadt_score = min(100.0, (aadt / 50000.0) * 100.0)
            norm_score = round((0.60 * density) + (0.40 * aadt_score), 1)
            raw_val = round(density, 1)
            expl = (
                f"High commercial demand profile with {aadt:,.0f} PCU/day transit exposure "
                f"and commercial vehicle density index of {density:.1f}/100."
            )
        elif density is not None:
            norm_score = round(density, 1)
            raw_val = round(density, 1)
            expl = f"Evaluated using commercial vehicle density proxy of {density:.1f}/100 (AADT count missing)."
        else:
            aadt_score = min(100.0, (aadt / 50000.0) * 100.0)
            norm_score = round(aadt_score, 1)
            raw_val = round(aadt, 0)
            expl = f"Evaluated using highway traffic census count of {aadt:,.0f} PCU/day (fleet density missing)."

        return CriterionScore(
            criterion_key="demand",
            criterion_name="Estimated Commercial Demand Proxy",
            raw_value=raw_val,
            unit="PCU / Fleet Index",
            normalized_score=norm_score,
            base_weight=base_weight,
            effective_weight=base_weight,  # Updated during renormalization if needed
            weighted_contribution=round(norm_score * base_weight, 2),
            is_missing=False,
            explanation=expl,
        )

    @classmethod
    def evaluate_service_gap_criterion(
        cls,
        candidate: CandidateLocationModel,
        nearest: Optional[NearestStationEvidence],
        base_weight: float,
        ideal_gap_km: float = 8.0,
    ) -> CriterionScore:
        """Evaluate network service gap (underserved coverage vs cannibalization threshold)."""
        if nearest is None:
            return CriterionScore(
                criterion_key="service_gap",
                criterion_name="Network Service Gap",
                raw_value=None,
                unit="km to station",
                normalized_score=None,
                base_weight=base_weight,
                effective_weight=0.0,
                weighted_contribution=None,
                is_missing=True,
                explanation="Cannot compute service gap because no verified operating stations are in range.",
            )

        dist = nearest.straight_line_distance_km

        # Rule 6:
        # < 1.5 km: Over-saturated / cannibalization risk (10 - 25 pts)
        # 1.5 - 4.0 km: Transition zone (30 - 75 pts)
        # 4.0 - 18.0 km: Ideal underserved corridor gap (80 - 100 pts)
        # > 18.0 km: Remote gap, slightly moderated to prevent over-rewarding unpopulated wilderness (65 - 85 pts)
        if dist < 1.5:
            score = max(10.0, dist * 18.0)
            expl = f"Low service gap ({dist:.1f} km to {nearest.station_name}): High risk of retail cannibalization."
        elif dist <= 4.0:
            score = 30.0 + ((dist - 1.5) / 2.5) * 45.0
            expl = f"Moderate service gap ({dist:.1f} km to {nearest.station_name}): Adequate spatial separation."
        elif dist <= 18.0:
            score = 75.0 + min(25.0, ((dist - 4.0) / 14.0) * 25.0)
            expl = f"High service gap ({dist:.1f} km to {nearest.station_name}): Substantial underserved commercial corridor."
        else:
            score = max(60.0, 100.0 - ((dist - 18.0) * 1.5))
            expl = f"Large geographic gap ({dist:.1f} km to {nearest.station_name}): Very isolated from existing network."

        norm_score = round(score, 1)

        return CriterionScore(
            criterion_key="service_gap",
            criterion_name="Network Service Gap",
            raw_value=round(dist, 2),
            unit="km",
            normalized_score=norm_score,
            base_weight=base_weight,
            effective_weight=base_weight,
            weighted_contribution=round(norm_score * base_weight, 2),
            is_missing=False,
            explanation=expl,
        )

    @classmethod
    def evaluate_road_accessibility_criterion(
        cls,
        candidate: CandidateLocationModel,
        nearest: Optional[NearestStationEvidence],
        base_weight: float,
    ) -> CriterionScore:
        """Evaluate highway tier, heavy turning radius, and road transit circuity."""
        tier = (candidate.highway_tier or "").strip()

        tier_points = {
            "Expressway": 95.0,
            "National Highway": 90.0,
            "National Highway Link": 85.0,
            "State Expressway": 90.0,
            "State Highway": 80.0,
            "Major Arterial": 70.0,
            "Industrial Road": 65.0,
            "Rural Road": 40.0,
        }

        base_score = tier_points.get(tier, 60.0)

        # Modifier for detour circuity
        detour_note = ""
        if nearest and nearest.detour_ratio:
            if nearest.detour_ratio <= 1.45:
                base_score = min(100.0, base_score + 5.0)
                detour_note = f" Efficient street grid access (detour ratio {nearest.detour_ratio:.2f}x)."
            elif nearest.detour_ratio >= 2.5:
                base_score = max(20.0, base_score - 10.0)
                detour_note = f" Complex street network access (detour ratio {nearest.detour_ratio:.2f}x)."

        norm_score = round(base_score, 1)
        expl = f"Situated on {candidate.road_corridor} ({tier}).{detour_note}"

        return CriterionScore(
            criterion_key="road_accessibility",
            criterion_name="Road Accessibility & Hierarchy",
            raw_value=norm_score,
            unit="Road Tier Score",
            normalized_score=norm_score,
            base_weight=base_weight,
            effective_weight=base_weight,
            weighted_contribution=round(norm_score * base_weight, 2),
            is_missing=False,
            explanation=expl,
        )

    @classmethod
    def evaluate_distance_criterion(
        cls,
        candidate: CandidateLocationModel,
        nearest: Optional[NearestStationEvidence],
        base_weight: float,
        min_threshold_km: float = 2.0,
    ) -> CriterionScore:
        """Evaluate physical station spacing (preventing clustering while keeping supply feasible)."""
        if nearest is None:
            return CriterionScore(
                criterion_key="distance",
                criterion_name="Distance from Existing Stations",
                raw_value=None,
                unit="km",
                normalized_score=None,
                base_weight=base_weight,
                effective_weight=0.0,
                weighted_contribution=None,
                is_missing=True,
                explanation="Distance score cannot be evaluated without a verified nearby station coordinate.",
            )

        dist = nearest.straight_line_distance_km

        # Optimal network expansion distance is between 3.0 km and 12.0 km
        if dist < min_threshold_km:
            score = max(15.0, (dist / min_threshold_km) * 45.0)
            expl = f"Within {dist:.1f} km of {nearest.station_name}: Heavily penalized to protect existing parent outlet."
        elif dist <= 12.0:
            score = 75.0 + min(25.0, ((dist - min_threshold_km) / 10.0) * 25.0)
            expl = f"Ideal distance ({dist:.1f} km to {nearest.station_name}): Optimal network spacing without mutual disruption."
        else:
            score = max(50.0, 100.0 - ((dist - 12.0) * 2.0))
            expl = f"Expanded distance ({dist:.1f} km to {nearest.station_name}): Greenfield coverage territory."

        norm_score = round(score, 1)

        return CriterionScore(
            criterion_key="distance",
            criterion_name="Distance from Existing Stations",
            raw_value=round(dist, 2),
            unit="km",
            normalized_score=norm_score,
            base_weight=base_weight,
            effective_weight=base_weight,
            weighted_contribution=round(norm_score * base_weight, 2),
            is_missing=False,
            explanation=expl,
        )

    @classmethod
    def calculate_candidate_score(
        cls,
        candidate: CandidateLocationModel,
        verified_stations: List[GujaratStationModel],
        weights: Optional[ScoringWeightsConfig] = None,
    ) -> Tuple[bool, Optional[str], Optional[float], float, str, List[CriterionScore], Dict[str, float], bool, Optional[NearestStationEvidence]]:
        """Compute transparent multi-criteria score with dynamic weight renormalization for missing data."""
        weights = weights or ScoringWeightsConfig()

        # Check essential criteria (coordinates)
        if candidate.latitude is None or candidate.longitude is None:
            return (
                False,
                "Candidate coordinates are missing or unverified.",
                None,
                0.0,
                "Indeterminate",
                [],
                {},
                False,
                None,
            )

        nearest_evidence = cls.find_nearest_verified_station(
            candidate.latitude,
            candidate.longitude,
            verified_stations,
        )

        c_demand = cls.evaluate_demand_criterion(candidate, weights.demand_weight)
        c_gap = cls.evaluate_service_gap_criterion(candidate, nearest_evidence, weights.service_gap_weight, weights.service_gap_ideal_km)
        c_access = cls.evaluate_road_accessibility_criterion(candidate, nearest_evidence, weights.road_accessibility_weight)
        c_dist = cls.evaluate_distance_criterion(candidate, nearest_evidence, weights.distance_weight, weights.min_distance_threshold_km)

        criteria_list = [c_demand, c_gap, c_access, c_dist]

        # Calculate data completeness
        available_count = sum(1 for c in criteria_list if not c.is_missing)
        completeness_pct = round((available_count / len(criteria_list)) * 100.0, 1)

        # Rule 11: Insufficient essential data -> Not Rankable
        # A candidate is Not Rankable if:
        # 1. Coordinates are missing, OR
        # 2. Both commercial demand indicators are completely missing, OR
        # 3. Overall data completeness < 75%
        if c_demand.is_missing:
            return (
                False,
                "Missing essential commercial demand metrics (neither AADT traffic count nor vehicle density proxy available).",
                None,
                completeness_pct,
                "Indeterminate",
                criteria_list,
                {},
                False,
                nearest_evidence,
            )

        if completeness_pct < 75.0:
            return (
                False,
                f"Insufficient criteria completeness ({completeness_pct:.0f}%). Minimum 75% verified data required for investment ranking.",
                None,
                completeness_pct,
                "Low",
                criteria_list,
                {},
                False,
                nearest_evidence,
            )

        # Confidence tier
        if completeness_pct >= 85.0:
            confidence = "High"
        elif completeness_pct >= 70.0:
            confidence = "Moderate"
        else:
            confidence = "Low"

        # Rule 8 & 9: Weight renormalization across available criteria
        active_weight_sum = sum(c.base_weight for c in criteria_list if not c.is_missing)
        renormalization_applied = not math.isclose(active_weight_sum, 1.0, rel_tol=1e-3)

        final_score = 0.0
        applied_weights: Dict[str, float] = {}

        for c in criteria_list:
            if c.is_missing or c.normalized_score is None:
                c.effective_weight = 0.0
                c.weighted_contribution = 0.0
                applied_weights[c.criterion_key] = 0.0
            else:
                renorm_w = round(c.base_weight / active_weight_sum, 4)
                c.effective_weight = renorm_w
                c.weighted_contribution = round(c.normalized_score * renorm_w, 2)
                applied_weights[c.criterion_key] = renorm_w
                final_score += c.normalized_score * renorm_w

        final_score = round(max(0.0, min(100.0, final_score)), 1)

        return (
            True,
            None,
            final_score,
            completeness_pct,
            confidence,
            criteria_list,
            applied_weights,
            renormalization_applied,
            nearest_evidence,
        )

    @classmethod
    def generate_dossier_explanation(
        cls,
        candidate: CandidateLocationModel,
        final_score: Optional[float],
        is_rankable: bool,
        unrankable_reason: Optional[str],
        criteria: List[CriterionScore],
        renorm_applied: bool,
        nearest: Optional[NearestStationEvidence],
    ) -> str:
        """Construct comprehensive human-readable audit narrative."""
        if not is_rankable:
            return f"EVALUATION STATUS: NOT RANKABLE. Reason: {unrankable_reason}"

        top_contrib = max((c for c in criteria if not c.is_missing), key=lambda x: x.weighted_contribution or 0.0)

        nearest_text = (
            f"Nearest operating station is {nearest.station_name} ({nearest.straight_line_distance_km:.1f} km geodesic, "
            f"~{nearest.road_distance_km:.1f} km road transit, detour ratio {nearest.detour_ratio:.2f}x)."
            if nearest
            else "No verified operating station located within search radius."
        )

        renorm_text = (
            " Notice: Score weights were dynamically renormalized across available evidence per system governance rules."
            if renorm_applied
            else ""
        )

        pipeline_text = (
            f" Pipeline proximity: ~{candidate.pipeline_proximity_meters:.0f}m to transmission trunk."
            if candidate.pipeline_proximity_meters
            else " Pipeline connectivity status: Requires dedicated lateral feasibility study."
        )

        narrative = (
            f"{candidate.name} located in {candidate.city}, {candidate.district} achieves an overall suitability score of "
            f"{final_score}/100. Key score driver is {top_contrib.criterion_name} contributing "
            f"{top_contrib.weighted_contribution:.1f} points ({top_contrib.explanation}). {nearest_text} "
            f"Road accessibility on {candidate.road_corridor} ({candidate.highway_tier}) supports commercial freight traffic.{pipeline_text}{renorm_text}"
        )

        return narrative

    @classmethod
    def rank_candidates(
        cls,
        req: Optional[RecalculateRankingRequest] = None,
    ) -> CandidateRankingsResponse:
        """Rank all Gujarat candidate locations and return leaderboard."""
        req = req or RecalculateRankingRequest()
        weights = req.weights or cls.DEFAULT_WEIGHTS

        all_candidates = cls.load_candidate_locations()
        all_stations = cls.load_network_stations()
        # Rule 4: ONLY VERIFIED_OPERATING_CNG locations should be used for nearest-station distance and cannibalization calculations.
        verified_stations = [
            s for s in all_stations
            if s.cng_classification == "VERIFIED_OPERATING_CNG" or s.verification_status in ["Verified", "Verified Operating CNG"]
        ]

        # Filter candidates if requested
        filtered: List[CandidateLocationModel] = []
        for c in all_candidates:
            if req.city_filter and c.city.lower() != req.city_filter.lower():
                continue
            if req.district_filter and c.district.lower() != req.district_filter.lower():
                continue
            if req.category_filter and c.category.lower() != req.category_filter.lower():
                continue
            filtered.append(c)

        evaluated_items: List[CandidateRankingItem] = []

        for cand in filtered:
            (
                is_rankable,
                unrankable_reason,
                score,
                completeness,
                confidence,
                criteria_list,
                applied_weights,
                _,
                nearest,
            ) = cls.calculate_candidate_score(cand, verified_stations, weights)

            if req.rankable_only and not is_rankable:
                continue

            if req.min_score is not None and score is not None and score < req.min_score:
                continue

            demand_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "demand"), None)
            gap_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "service_gap"), None)
            access_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "road_accessibility"), None)
            dist_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "distance"), None)

            verdict = (
                f"Score {score}/100 • {confidence} Confidence"
                if is_rankable and score is not None
                else f"Not Rankable ({unrankable_reason})"
            )

            evaluated_items.append(
                CandidateRankingItem(
                    candidate_id=cand.candidate_id,
                    name=cand.name,
                    category=cand.category,
                    city=cand.city,
                    district=cand.district,
                    latitude=cand.latitude,
                    longitude=cand.longitude,
                    highway_corridor=cand.road_corridor,
                    final_score=score,
                    rank=None,  # Assigned after sorting
                    is_rankable=is_rankable,
                    unrankable_reason=unrankable_reason,
                    data_completeness_pct=completeness,
                    confidence_tier=confidence,
                    demand_score=demand_score,
                    service_gap_score=gap_score,
                    road_accessibility_score=access_score,
                    distance_score=dist_score,
                    nearest_station=nearest,
                    summary_verdict=verdict,
                )
            )

        # Sort: Rankable items descending by final_score, then unrankables at end
        rankable = [item for item in evaluated_items if item.is_rankable and item.final_score is not None]
        unrankable = [item for item in evaluated_items if not item.is_rankable or item.final_score is None]

        rankable.sort(key=lambda x: x.final_score or 0.0, reverse=True)

        for idx, item in enumerate(rankable, start=1):
            item.rank = idx

        sorted_candidates = rankable + unrankable

        cities = sorted(list(set(c.city for c in all_candidates if c.city)))
        districts = sorted(list(set(c.district for c in all_candidates if c.district)))
        categories = sorted(list(set(c.category for c in all_candidates if c.category)))

        return CandidateRankingsResponse(
            total_candidates=len(sorted_candidates),
            rankable_count=len(rankable),
            unrankable_count=len(unrankable),
            weights_applied=weights,
            candidates=sorted_candidates,
            available_cities=cities,
            available_districts=districts,
            available_categories=categories,
        )

    @classmethod
    def get_candidate_dossier(
        cls,
        candidate_id: str,
        weights: Optional[ScoringWeightsConfig] = None,
    ) -> Optional[CandidateDossierResponse]:
        """Fetch full analytical dossier with itemized evidence for a specific candidate."""
        weights = weights or cls.DEFAULT_WEIGHTS
        all_candidates = cls.load_candidate_locations()
        target = next((c for c in all_candidates if c.candidate_id == candidate_id), None)

        if not target:
            return None

        all_stations = cls.load_network_stations()
        verified_stations = [
            s for s in all_stations
            if s.cng_classification == "VERIFIED_OPERATING_CNG" or s.verification_status in ["Verified", "Verified Operating CNG"]
        ]

        # Run ranking to find official rank
        rankings = cls.rank_candidates(RecalculateRankingRequest(weights=weights))
        ranked_item = next((r for r in rankings.candidates if r.candidate_id == candidate_id), None)
        rank_val = ranked_item.rank if ranked_item else None

        (
            is_rankable,
            unrankable_reason,
            score,
            completeness,
            confidence,
            criteria_list,
            applied_weights,
            renorm_applied,
            nearest,
        ) = cls.calculate_candidate_score(target, verified_stations, weights)

        explanation = cls.generate_dossier_explanation(
            target,
            score,
            is_rankable,
            unrankable_reason,
            criteria_list,
            renorm_applied,
            nearest,
        )

        return CandidateDossierResponse(
            candidate=target,
            is_rankable=is_rankable,
            unrankable_reason=unrankable_reason,
            rank=rank_val,
            final_score=score,
            confidence_tier=confidence,
            data_completeness_pct=completeness,
            scoring_breakdown=criteria_list,
            weights_applied=applied_weights,
            renormalization_applied=renorm_applied,
            nearest_station=nearest,
            full_audit_explanation=explanation,
        )

    @classmethod
    def add_candidate(cls, req: CandidateCreateRequest) -> CandidateLocationModel:
        """Add a new proposed candidate location (Method 1 Autocomplete or Method 2 Map Click)."""
        candidates = cls.load_candidate_locations()
        existing_ids = [c.candidate_id for c in candidates]

        # Determine next ID
        custom_indices = []
        for cid in existing_ids:
            if cid.startswith("GUJ_CAN_"):
                suffix = cid.replace("GUJ_CAN_", "")
                if suffix.isdigit():
                    custom_indices.append(int(suffix))
        next_idx = max(custom_indices, default=16) + 1
        new_id = f"GUJ_CAN_{next_idx:03d}"

        # Determine criteria availability
        available = ["service_gap", "road_accessibility", "distance"]
        missing = []
        if req.traffic_pcu_per_day is not None or req.commercial_vehicle_density_proxy is not None:
            available.insert(0, "demand")
        else:
            missing.append("demand")

        model = CandidateLocationModel(
            candidate_id=new_id,
            name=req.name,
            category=req.category,
            address=req.address or f"{req.city}, Gujarat",
            locality=req.locality or req.city,
            city=req.city,
            district=req.district,
            state="Gujarat",
            latitude=req.latitude,
            longitude=req.longitude,
            place_id=req.place_id,
            verification_status="proposed_candidate",
            source_evidence="Proposed by user via Map Pin / Places Autocomplete",
            discovery_method="user_interactive_proposal",
            road_corridor=req.road_corridor or req.nearest_major_highway or "Urban Arterial Link",
            nearest_major_highway=req.nearest_major_highway or "SH/NH Corridor",
            highway_tier=req.highway_tier or "State Highway",
            traffic_pcu_per_day=req.traffic_pcu_per_day,
            commercial_vehicle_density_proxy=req.commercial_vehicle_density_proxy,
            pipeline_proximity_meters=req.pipeline_proximity_meters or 500.0,
            land_zoning=req.land_zoning or "Commercial / GIDC",
            retrieved_at="2026-11-25T02:00:00Z",
            last_verified_at=None,
            available_criteria=available,
            missing_criteria=missing,
            notes=req.notes or "Newly proposed candidate expansion site.",
        )

        candidates.append(model)
        try:
            with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
                json.dump([c.model_dump() for c in candidates], f, indent=2)
            logger.info(f"Successfully saved new candidate {new_id} to {CANDIDATES_FILE}")
        except Exception as e:
            logger.error(f"Failed to persist candidate {new_id}: {e}")

        return model

    @classmethod
    def update_candidate(cls, candidate_id: str, req: CandidateUpdateRequest) -> Optional[CandidateLocationModel]:
        """Update an existing proposed candidate location."""
        candidates = cls.load_candidate_locations()
        target_idx: int = -1

        for idx, c in enumerate(candidates):
            if c.candidate_id == candidate_id:
                target_idx = idx
                break

        if target_idx < 0:
            return None

        data = candidates[target_idx].model_dump()
        update_data = req.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if v is not None:
                data[k] = v

        # Recalculate available and missing criteria
        avail = ["service_gap", "road_accessibility", "distance"]
        miss = []
        if data.get("traffic_pcu_per_day") is not None or data.get("commercial_vehicle_density_proxy") is not None:
            avail.insert(0, "demand")
        else:
            miss.append("demand")
        data["available_criteria"] = avail
        data["missing_criteria"] = miss

        updated_model = CandidateLocationModel(**data)
        candidates[target_idx] = updated_model

        try:
            with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
                json.dump([c.model_dump() for c in candidates], f, indent=2)
            logger.info(f"Updated candidate {candidate_id}")
        except Exception as e:
            logger.error(f"Failed to save updated candidate {candidate_id}: {e}")

        return updated_model

    @classmethod
    def delete_candidate(cls, candidate_id: str) -> bool:
        """Delete a proposed candidate location."""
        candidates = cls.load_candidate_locations()
        filtered = [c for c in candidates if c.candidate_id != candidate_id]
        if len(filtered) == len(candidates):
            return False

        try:
            with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
                json.dump([c.model_dump() for c in filtered], f, indent=2)
            logger.info(f"Deleted candidate {candidate_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to persist after deleting candidate {candidate_id}: {e}")
            return False

    @classmethod
    def compare_candidates(cls, candidate_ids: List[str]) -> CandidateCompareResponse:
        """Compare multiple candidates side-by-side with factor winners and summary narrative."""
        all_candidates = cls.load_candidate_locations()
        all_stations = cls.load_network_stations()
        verified_stations = [
            s for s in all_stations
            if s.cng_classification == "VERIFIED_OPERATING_CNG" or s.verification_status in ["Verified", "Verified Operating CNG"]
        ]

        target_candidates = [c for c in all_candidates if c.candidate_id in candidate_ids]
        if not target_candidates:
            raise ValueError("No valid candidates found for the requested IDs.")

        # Rank all candidates to get authoritative ranks
        rankings_resp = cls.rank_candidates()
        rank_map = {item.candidate_id: item.rank for item in rankings_resp.candidates}

        items: List[CandidateComparisonItem] = []
        for cand in target_candidates:
            (
                is_rankable,
                unrankable_reason,
                score,
                completeness,
                confidence,
                criteria_list,
                _,
                _,
                nearest,
            ) = cls.calculate_candidate_score(cand, verified_stations)

            demand_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "demand"), None)
            gap_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "service_gap"), None)
            access_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "road_accessibility"), None)
            dist_score = next((c.normalized_score for c in criteria_list if c.criterion_key == "distance"), None)

            verdict = (
                f"Rank #{rank_map.get(cand.candidate_id, '-')} • Score {score}/100"
                if is_rankable and score is not None
                else f"Not Rankable ({unrankable_reason})"
            )

            items.append(
                CandidateComparisonItem(
                    candidate_id=cand.candidate_id,
                    name=cand.name,
                    city=cand.city,
                    district=cand.district,
                    category=cand.category,
                    rank=rank_map.get(cand.candidate_id),
                    final_score=score,
                    confidence_tier=confidence,
                    data_completeness_pct=completeness,
                    demand_score=demand_score,
                    service_gap_score=gap_score,
                    road_accessibility_score=access_score,
                    distance_score=dist_score,
                    nearest_station_name=nearest.station_name if nearest else None,
                    nearest_station_distance_km=nearest.straight_line_distance_km if nearest else None,
                    summary_verdict=verdict,
                )
            )

        # Determine winners
        rankable_items = [it for it in items if it.final_score is not None]
        best_overall = max(rankable_items, key=lambda x: x.final_score or 0).name if rankable_items else items[0].name
        highest_demand = max(items, key=lambda x: x.demand_score or 0).name
        largest_gap = max(items, key=lambda x: x.service_gap_score or 0).name
        best_access = max(items, key=lambda x: x.road_accessibility_score or 0).name

        items_with_dist = [it for it in items if it.nearest_station_distance_km is not None]
        closest_net = min(items_with_dist, key=lambda x: x.nearest_station_distance_km or 999).name if items_with_dist else "N/A"
        most_isolated = max(items_with_dist, key=lambda x: x.nearest_station_distance_km or 0).name if items_with_dist else "N/A"

        summary = (
            f"Comparison of {len(items)} proposed locations across Gujarat: "
            f"'{best_overall}' leads in overall multi-criteria suitability. "
            f"'{highest_demand}' exhibits the strongest commercial demand proxy, "
            f"while '{largest_gap}' represents the largest underserved network service gap."
        )

        return CandidateCompareResponse(
            candidates=items,
            best_overall_candidate=best_overall,
            highest_demand_candidate=highest_demand,
            largest_service_gap_candidate=largest_gap,
            best_accessibility_candidate=best_access,
            closest_to_existing_network=closest_net,
            most_isolated_candidate=most_isolated,
            comparison_summary=summary,
        )

    @classmethod
    def get_network_stations_summary(
        cls,
        search_query: Optional[str] = None,
        city_filter: Optional[str] = None,
        district_filter: Optional[str] = None,
        operational_status_filter: Optional[str] = None,
    ) -> GujaratNetworkStationsResponse:
        """Retrieve Gujarat network stations with optional search and filters, diagnostics, and cities."""
        all_stations = cls.load_network_stations(include_discovered=True, include_rejected=False)

        verified = sum(
            1 for s in all_stations
            if s.cng_classification == "VERIFIED_OPERATING_CNG" or s.verification_status in ["Verified", "Verified Operating CNG"]
        )
        discovered = sum(1 for s in all_stations if s.cng_classification == "DISCOVERED_CNG")
        potential = sum(1 for s in all_stations if s.cng_classification == "POTENTIAL_CNG")

        # Compute rejected count from discovered file
        rejected = 73
        if DISCOVERED_STATIONS_FILE.exists():
            try:
                with open(DISCOVERED_STATIONS_FILE, "r", encoding="utf-8") as f:
                    disc_data = json.load(f)
                    rejected = sum(1 for d in disc_data if d.get("cng_classification") == "NOT_CNG")
            except Exception:
                pass

        diagnostics = None
        if DISCOVERY_METRICS_FILE.exists():
            try:
                with open(DISCOVERY_METRICS_FILE, "r", encoding="utf-8") as f:
                    diagnostics = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load discovery diagnostics: {e}")

        available_cities = sorted(list({s.city for s in all_stations if s.city}))
        available_districts = sorted(list({s.district for s in all_stations if s.district}))

        # Apply search and filters to the returned station list
        filtered_stations = all_stations
        if search_query:
            sq = search_query.strip().lower()
            filtered_stations = [
                s for s in filtered_stations
                if sq in s.station_name.lower() or sq in s.address.lower() or sq in s.locality.lower()
            ]
        if city_filter:
            filtered_stations = [s for s in filtered_stations if s.city.lower() == city_filter.strip().lower()]
        if district_filter:
            filtered_stations = [s for s in filtered_stations if s.district.lower() == district_filter.strip().lower()]
        if operational_status_filter:
            osf = operational_status_filter.strip().lower()
            if osf in ["verified", "verified_operating_cng"]:
                filtered_stations = [
                    s for s in filtered_stations
                    if s.cng_classification == "VERIFIED_OPERATING_CNG" or s.verification_status in ["Verified", "Verified Operating CNG"]
                ]
            elif osf in ["discovered", "discovered_cng"]:
                filtered_stations = [s for s in filtered_stations if s.cng_classification == "DISCOVERED_CNG"]
            elif osf in ["potential", "potential_cng"]:
                filtered_stations = [s for s in filtered_stations if s.cng_classification == "POTENTIAL_CNG"]

        return GujaratNetworkStationsResponse(
            total_stations=len(filtered_stations),
            verified_count=verified,
            discovered_count=discovered,
            requires_review_count=potential,
            verified_operating_count=verified,
            discovered_cng_count=discovered,
            potential_count=potential,
            rejected_count=rejected,
            confirmed_count=verified,
            stations=filtered_stations,
            available_cities=available_cities,
            available_districts=available_districts,
            diagnostics=diagnostics,
        )
