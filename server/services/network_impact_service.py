from typing import List, Optional, Tuple

from schemas.candidates import GujaratStationModel
from schemas.network_impact import (
    BeneficialAssessment,
    DemandAndSalesEstimate,
    DiversionAssessment,
    GeographicalMetrics,
    NearbyStationsResponse,
    NearbyVerifiedStation,
    NetworkImpactSimulationRequest,
    NetworkImpactSimulationResponse,
    NetworkSalesImpactSummary,
    OverallAssessmentLabel,
    ProposedLocationPoint,
    StationSalesImpactRow,
)
from services.candidate_ranking_service import CandidateRankingService
from services.geo_service import GeoService


# Scenario parameters for distance-decay demand & diversion estimation
MAX_STATION_DIVERSION_SHARE = 0.35
COMPETITION_DAMPENING_COEFF = 0.25
BASE_COVERAGE_EXPANSION_FACTOR = 0.05
MAX_ADDITIONAL_COVERAGE_EXPANSION = 0.35
BENEFICIAL_NET_CHANGE_THRESHOLD_KG = 200.0
BENEFICIAL_NET_IMPACT_PCT_THRESHOLD = 4.0
HIGH_CANNIBALIZATION_SHARE_THRESHOLD = 0.70


class NetworkImpactService:
    """Shared impact simulation engine for Candidate Location Evaluation and Network Map.

    Computes great-circle Haversine spacing against strictly verified Gujarat stations,
    and when historical demand baselines exist (11 Ahmedabad AMD* stations from the
    synthetic demo series), estimates distance-decay diversion, proposed demand/sales,
    and Before vs After net network impact. Outside corridors with baseline sales data,
    honestly returns Insufficient Data / Unavailable rather than fabricating numbers.
    """

    @staticmethod
    def _in_gujarat_bounds(lat: float, lng: float) -> bool:
        return 20.0 <= lat <= 24.8 and 68.0 <= lng <= 74.6

    @classmethod
    def get_verified_eligible_stations(cls) -> List[GujaratStationModel]:
        """Return strictly verified operating CNG stations with valid coordinates."""
        all_stations = CandidateRankingService.load_network_stations(
            include_discovered=True,
            include_rejected=False,
        )
        eligible: List[GujaratStationModel] = []
        for st in all_stations:
            if st.cng_classification != "VERIFIED_OPERATING_CNG":
                continue
            if st.latitude is None or st.longitude is None:
                continue
            if abs(st.latitude) < 1e-6 and abs(st.longitude) < 1e-6:
                continue
            if "synthetic" in (st.data_source or "").lower():
                continue
            eligible.append(st)
        return eligible

    @classmethod
    def _compute_all_verified_distances(
        cls,
        proposed_lat: float,
        proposed_lng: float,
    ) -> List[NearbyVerifiedStation]:
        eligible = cls.get_verified_eligible_stations()
        computed: List[NearbyVerifiedStation] = []
        for st in eligible:
            dist = round(
                GeoService.haversine_distance_km(
                    proposed_lat,
                    proposed_lng,
                    float(st.latitude),
                    float(st.longitude),
                ),
                2,
            )
            demand_avail = bool(st.demand_data_available)
            computed.append(
                NearbyVerifiedStation(
                    station_id=st.station_id,
                    station_name=st.station_name,
                    distance_km=dist,
                    address=st.address or "",
                    locality=st.locality or "",
                    city=st.city or "",
                    district=st.district or "",
                    operator=st.operator or "",
                    brand=st.brand or "",
                    latitude=float(st.latitude),
                    longitude=float(st.longitude),
                    is_verified=True,
                    data_source=st.data_source or "",
                    demand_data_available=demand_avail,
                    historical_daily_demand_kg=(
                        round(float(st.historical_daily_demand_kg), 1)
                        if demand_avail and st.historical_daily_demand_kg is not None
                        else None
                    ),
                    forecasted_daily_demand_kg=(
                        round(float(st.forecasted_daily_demand_kg), 1)
                        if demand_avail and st.forecasted_daily_demand_kg is not None
                        else None
                    ),
                    daily_capacity_kg=None,
                    capacity_data_available=False,
                )
            )
        computed.sort(key=lambda item: (item.distance_km, item.station_name))
        return computed

    @classmethod
    def find_nearby_verified_stations(
        cls,
        lat: float,
        lng: float,
        radius_km: float = 5.0,
        name: Optional[str] = None,
        location_label: Optional[str] = None,
    ) -> NearbyStationsResponse:
        """Identify existing verified CNG stations within radius_km sorted nearest first."""
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            raise ValueError("Invalid latitude or longitude.")
        if not (0.5 <= radius_km <= 50.0):
            raise ValueError("radius_km must be between 0.5 and 50.0 km.")

        all_sorted = cls._compute_all_verified_distances(lat, lng)
        nearby = [s for s in all_sorted if s.distance_km <= radius_km]

        proposed_point = ProposedLocationPoint(
            name=name,
            location_label=location_label,
            latitude=round(lat, 6),
            longitude=round(lng, 6),
            in_gujarat_bounds=cls._in_gujarat_bounds(lat, lng),
            status="PROPOSED",
        )

        return NearbyStationsResponse(
            proposed_location=proposed_point,
            radius_km=radius_km,
            total_verified_stations_checked=len(all_sorted),
            nearby_count=len(nearby),
            nearby_stations=nearby,
            nearest_station=nearby[0] if nearby else None,
            farthest_nearby_station=nearby[-1] if nearby else None,
            nearest_overall_station=all_sorted[0] if all_sorted else None,
            distance_method="Haversine great-circle distance (km)",
            data_integrity_note=(
                f"Checked {len(all_sorted)} strictly VERIFIED_OPERATING_CNG stations across Gujarat; "
                f"found {len(nearby)} within {radius_km} km. Daily station capacities are unavailable; "
                "historical demand baselines exist only for 11 Ahmedabad stations (synthetic demo series)."
            ),
        )

    @classmethod
    def _build_insufficient_data_outputs(
        cls,
        nearby: List[NearbyVerifiedStation],
        nearest_within: Optional[NearbyVerifiedStation],
        nearest_overall: Optional[NearbyVerifiedStation],
        radius_km: float,
        expected_capacity: Optional[float],
        overlap_risk: str,
    ) -> Tuple[
        List[StationSalesImpactRow],
        DemandAndSalesEstimate,
        NetworkSalesImpactSummary,
        BeneficialAssessment,
        DiversionAssessment,
    ]:
        nearest_ref = nearest_within or nearest_overall
        nearest_id = nearest_ref.station_id if nearest_ref else None
        rows: List[StationSalesImpactRow] = [
            StationSalesImpactRow(
                station_id=s.station_id,
                station_name=s.station_name,
                city=s.city,
                operator=s.operator,
                distance_km=s.distance_km,
                is_nearest=(s.station_id == nearest_id),
                has_sales_data=False,
                sales_data_classification="Unavailable",
                current_daily_sales_kg=None,
                forecasted_daily_demand_kg=None,
                estimated_diversion_share=None,
                estimated_sales_loss_kg=None,
                remaining_daily_sales_kg=None,
                reduction_pct=None,
                loss_classification="Unavailable",
                capacity_available=False,
                daily_capacity_kg=None,
                status_label="VERIFIED",
            )
            for s in nearby
        ]

        nearest_km = nearest_overall.distance_km if nearest_overall else None
        if not nearby:
            reason = (
                f"Insufficient Data: No verified CNG stations exist within {radius_km} km "
                + (
                    f"(nearest verified station is {nearest_overall.station_name} at {nearest_km} km), "
                    if nearest_overall
                    else ""
                )
                + "and no station-level baseline demand series exist in this area."
            )
            missing_reqs = [
                f"Expand analysis radius above {nearest_km} km to inspect nearest existing stations"
                if nearest_km is not None
                else "Verify nearby corridor station coordinates",
                "Station-level daily CNG sales / metering history for the corridor",
                "Local corridor traffic and CNG vehicle throughput survey",
            ]
        else:
            reason = (
                f"Insufficient Data: All {len(nearby)} verified station(s) within {radius_km} km lack "
                "station-level daily sales and capacity data in the dataset "
                "(synthetic historical sales baselines exist only for 11 Ahmedabad AMD stations)."
            )
            missing_reqs = [
                "Actual or historical daily CNG sales (kg/day) for the nearby verified stations",
                "Rated dispensing capacity (kg/day) for nearby existing stations",
                "Corridor unmet demand / queue waiting-time study",
            ]

        demand_estimate = DemandAndSalesEstimate(
            available=False,
            status="Insufficient Data",
            data_origin="none",
            methodology=(
                "No demand or sales estimation attempted because verified station-level "
                "sales history is unavailable for nearby stations in this corridor."
            ),
            nearest_station_name=nearest_ref.station_name if nearest_ref else None,
            nearest_station_distance_km=nearest_ref.distance_km if nearest_ref else None,
            nearby_with_sales_count=0,
            nearby_total_count=len(nearby),
            capacity_provided_kg=expected_capacity,
            capacity_status=(
                f"{expected_capacity:,.0f} kg/day (scenario input; utilization requires baseline demand)"
                if expected_capacity is not None
                else "Unavailable (not provided)"
            ),
            demand_classification="Unavailable",
            sales_classification="Unavailable",
            assumptions=[],
            limitations=[
                "The Gujarat-wide verified station dataset provides locations, cities, districts, and operators, not station-level dispenser metering or capacities.",
                "FUELCAST never fabricates station sales or diversion figures outside corridors with baseline demand series.",
            ],
            reason_unavailable=reason,
        )

        network_sales_impact = NetworkSalesImpactSummary(
            available=False,
            status="Insufficient Data",
            station_count_with_sales=0,
            station_count_without_sales=len(nearby),
            classification="Unavailable",
            note=(
                "Before vs After network sales comparison requires baseline daily sales "
                "data for nearby existing stations."
            ),
            reason_unavailable=reason,
        )

        if not nearby and nearest_overall:
            summary = (
                f"No verified CNG stations were found within {radius_km} km (nearest is "
                f"{nearest_overall.station_name} at {nearest_km} km). While geographical spacing "
                "shows a coverage gap, commercial viability cannot be confirmed without baseline demand data."
            )
        elif not nearby:
            summary = "Insufficient data: no nearby verified CNG stations or baseline sales records are available."
        else:
            summary = (
                f"{len(nearby)} verified station(s) operate within {radius_km} km, but none have "
                "station-level sales or capacity history in the dataset. Commercial demand, "
                "diversion loss, and net benefit cannot be verified without baseline metering data."
            )

        beneficial = BeneficialAssessment(
            outcome="Inconclusive / Insufficient Data",
            confidence="Insufficient data",
            summary=summary,
            criteria_evaluated=[
                f"Geographical proximity & spacing checked within {radius_km} km",
                f"Nearest verified station distance: {nearest_km} km" if nearest_km is not None else "Nearest verified station distance unavailable",
                f"Baseline sales availability: 0 of {len(nearby)} nearby stations",
            ],
            missing_data_requirements=missing_reqs,
            caveat=(
                "Geographical spacing alone does not guarantee demand or commercial viability. "
                "Collect local traffic/demand measurements or OMC sales baselines before investment decisions."
            ),
        )

        diversion = DiversionAssessment(
            status="Insufficient Data",
            available=False,
            spatial_overlap_risk=overlap_risk,  # type: ignore[arg-type]
            explanation=reason,
            demand_data_origin="none",
            stations_with_demand_data=0,
            stations_without_demand_data=len(nearby),
        )

        return rows, demand_estimate, network_sales_impact, beneficial, diversion

    @classmethod
    def _compute_scenario_impact(
        cls,
        nearby: List[NearbyVerifiedStation],
        nearest_station: NearbyVerifiedStation,
        radius_km: float,
        expected_capacity: Optional[float],
        overlap_risk: str,
    ) -> Tuple[
        List[StationSalesImpactRow],
        DemandAndSalesEstimate,
        NetworkSalesImpactSummary,
        BeneficialAssessment,
        DiversionAssessment,
    ]:
        with_sales = [
            s for s in nearby if s.demand_data_available and s.historical_daily_demand_kg is not None
        ]
        without_sales_count = len(nearby) - len(with_sales)

        competition_dampener = 1.0 / (1.0 + COMPETITION_DAMPENING_COEFF * max(len(with_sales) - 1, 0))

        raw_station_weights: List[float] = []
        raw_diversion_shares: List[float] = []
        raw_diverted_kg_list: List[float] = []
        current_sales_list: List[float] = []

        for s in with_sales:
            current_sales = float(s.historical_daily_demand_kg or 0.0)
            current_sales_list.append(current_sales)
            proximity_ratio = max(0.0, 1.0 - (s.distance_km / max(radius_km, 0.5)))
            share = MAX_STATION_DIVERSION_SHARE * (proximity_ratio ** 2) * competition_dampener
            share = min(MAX_STATION_DIVERSION_SHARE, max(0.0, share))
            raw_diversion_shares.append(share)
            raw_diverted_kg_list.append(current_sales * share)
            raw_station_weights.append(proximity_ratio ** 2 + 0.05)

        total_raw_diverted_kg = sum(raw_diverted_kg_list)
        network_sales_before_kg = sum(current_sales_list)

        d_min = nearest_station.distance_km
        if d_min < 1.5:
            coverage_gap_factor = BASE_COVERAGE_EXPANSION_FACTOR
        else:
            coverage_gap_factor = BASE_COVERAGE_EXPANSION_FACTOR + (
                MAX_ADDITIONAL_COVERAGE_EXPANSION * min(1.0, (d_min - 1.5) / 5.0)
            )

        weight_sum = sum(raw_station_weights)
        weighted_local_avg_sales = (
            sum(c * w for c, w in zip(current_sales_list, raw_station_weights)) / weight_sum
            if weight_sum > 0
            else (network_sales_before_kg / len(with_sales))
        )
        avg_nearby_sales_kg = network_sales_before_kg / len(with_sales)

        incremental_coverage_gain_kg = weighted_local_avg_sales * coverage_gap_factor
        uncapped_potential_demand_kg = total_raw_diverted_kg + incremental_coverage_gain_kg

        if expected_capacity is not None and uncapped_potential_demand_kg > expected_capacity:
            proposed_daily_sales_kg = expected_capacity
            cap_scale = proposed_daily_sales_kg / uncapped_potential_demand_kg
            actual_diverted_kg_list = [d * cap_scale for d in raw_diverted_kg_list]
            actual_incremental_kg = incremental_coverage_gain_kg * cap_scale
        else:
            proposed_daily_sales_kg = uncapped_potential_demand_kg
            actual_diverted_kg_list = raw_diverted_kg_list
            actual_incremental_kg = incremental_coverage_gain_kg

        proposed_daily_sales_rounded = round(proposed_daily_sales_kg, 1)
        incremental_rounded = round(actual_incremental_kg, 1)

        diverted_by_id = {
            s.station_id: loss for s, loss in zip(with_sales, actual_diverted_kg_list)
        }
        nearest_id = nearest_station.station_id
        rows: List[StationSalesImpactRow] = []

        for s in nearby:
            if s.station_id in diverted_by_id:
                current_kg = round(float(s.historical_daily_demand_kg or 0.0), 1)
                loss_kg = round(diverted_by_id[s.station_id], 1)
                remaining_kg = round(max(0.0, current_kg - loss_kg), 1)
                red_pct = round((loss_kg / current_kg) * 100.0, 1) if current_kg > 0 else 0.0
                eff_share = round(loss_kg / current_kg, 3) if current_kg > 0 else 0.0
                rows.append(
                    StationSalesImpactRow(
                        station_id=s.station_id,
                        station_name=s.station_name,
                        city=s.city,
                        operator=s.operator,
                        distance_km=s.distance_km,
                        is_nearest=(s.station_id == nearest_id),
                        has_sales_data=True,
                        sales_data_classification="Actual historical data",
                        current_daily_sales_kg=current_kg,
                        forecasted_daily_demand_kg=s.forecasted_daily_demand_kg,
                        estimated_diversion_share=eff_share,
                        estimated_sales_loss_kg=loss_kg,
                        remaining_daily_sales_kg=remaining_kg,
                        reduction_pct=red_pct,
                        loss_classification="Model-based estimate",
                        capacity_available=False,
                        daily_capacity_kg=None,
                        status_label="VERIFIED",
                    )
                )
            else:
                rows.append(
                    StationSalesImpactRow(
                        station_id=s.station_id,
                        station_name=s.station_name,
                        city=s.city,
                        operator=s.operator,
                        distance_km=s.distance_km,
                        is_nearest=(s.station_id == nearest_id),
                        has_sales_data=False,
                        sales_data_classification="Unavailable",
                        current_daily_sales_kg=None,
                        forecasted_daily_demand_kg=None,
                        estimated_diversion_share=None,
                        estimated_sales_loss_kg=None,
                        remaining_daily_sales_kg=None,
                        reduction_pct=None,
                        loss_classification="Unavailable",
                        capacity_available=False,
                        daily_capacity_kg=None,
                        status_label="VERIFIED",
                    )
                )

        # Reconcile exact totals from the rounded rows so every table figure adds up consistently
        sum_current_before = round(sum(r.current_daily_sales_kg or 0.0 for r in rows if r.has_sales_data), 1)
        sum_loss_rounded = round(sum(r.estimated_sales_loss_kg or 0.0 for r in rows if r.has_sales_data), 1)
        existing_after_rounded = round(max(0.0, sum_current_before - sum_loss_rounded), 1)
        proposed_daily_sales_rounded = round(sum_loss_rounded + max(0.0, incremental_rounded), 1)
        if expected_capacity is not None and proposed_daily_sales_rounded > expected_capacity:
            proposed_daily_sales_rounded = round(expected_capacity, 1)
        uncapped_demand_rounded = round(uncapped_potential_demand_kg, 1)
        monthly_sales_rounded = round(proposed_daily_sales_rounded * 30.0, 1)
        actual_incremental_final = round(max(0.0, proposed_daily_sales_rounded - sum_loss_rounded), 1)

        if expected_capacity is not None:
            utilization_pct = round((uncapped_potential_demand_kg / expected_capacity) * 100.0, 1)
            if uncapped_potential_demand_kg > expected_capacity:
                cap_status = (
                    f"Capped at {expected_capacity:,.0f} kg/day ({utilization_pct:.1f}% demand-to-capacity ratio)"
                )
            else:
                cap_status = f"{utilization_pct:.1f}% of provided {expected_capacity:,.0f} kg/day capacity"
        else:
            utilization_pct = None
            cap_status = "Unavailable (expected daily capacity not provided)"

        demand_estimate = DemandAndSalesEstimate(
            available=True,
            status="Estimated (Scenario-Based)",
            data_origin="synthetic_demo",
            methodology=(
                "Scenario-based distance-decay diversion & coverage-gap model anchored on "
                "synthetic Ahmedabad historical daily sales baselines (synthetic_daily_sales.csv)."
            ),
            nearest_station_name=nearest_station.station_name,
            nearest_station_distance_km=nearest_station.distance_km,
            nearby_with_sales_count=len(with_sales),
            nearby_total_count=len(nearby),
            avg_nearby_daily_sales_kg=round(avg_nearby_sales_kg, 1),
            potential_daily_demand_kg=uncapped_demand_rounded,
            potential_daily_sales_kg=proposed_daily_sales_rounded,
            potential_monthly_sales_kg=monthly_sales_rounded,
            diverted_from_nearby_kg=sum_loss_rounded,
            incremental_coverage_gain_kg=actual_incremental_final,
            capacity_provided_kg=expected_capacity,
            capacity_utilization_pct=utilization_pct,
            capacity_status=cap_status,
            demand_classification="Model-based estimate",
            sales_classification="Model-based estimate",
            assumptions=[
                f"Maximum single-station diversion share bounded at {int(MAX_STATION_DIVERSION_SHARE * 100)}% with quadratic decay (1 - d/{radius_km})^2.",
                f"Multi-station competition dampening 1/(1 + 0.25*(N-1)) across {len(with_sales)} baseline station(s) within {radius_km} km.",
                f"Coverage-gap expansion factor estimated at {round(coverage_gap_factor * 100, 1)}% using {d_min} km nearest verified station spacing.",
                "Monthly sales projected at 30 days/month from scenario daily sales."
                + (
                    f" Proposed station sales capped at provided daily capacity ({expected_capacity:,.0f} kg/day)."
                    if expected_capacity is not None
                    else ""
                ),
            ],
            limitations=[
                "Nearby baseline sales come from FUELCAST's synthetic Ahmedabad demo series (synthetic_daily_sales.csv), not live dispenser telemetry.",
                "Rated capacities for existing verified stations are unavailable in the dataset.",
                "Simplified spatial model: excludes road-network barriers, median turns, peak congestion, and fleet conversions.",
            ],
            reason_unavailable=None,
        )

        net_change_kg = round(proposed_daily_sales_rounded - sum_loss_rounded, 1)
        network_sales_after_kg = round(existing_after_rounded + proposed_daily_sales_rounded, 1)
        net_impact_pct = (
            round((net_change_kg / sum_current_before) * 100.0, 2)
            if sum_current_before > 0
            else 0.0
        )

        network_sales_impact = NetworkSalesImpactSummary(
            available=True,
            status="Calculated (Scenario-Based)",
            proposed_station_daily_sales_kg=proposed_daily_sales_rounded,
            total_nearby_sales_loss_kg=sum_loss_rounded,
            net_network_sales_change_kg=net_change_kg,
            network_sales_before_kg=sum_current_before,
            network_sales_after_kg=network_sales_after_kg,
            existing_stations_sales_after_kg=existing_after_rounded,
            net_network_impact_pct=net_impact_pct,
            station_count_with_sales=len(with_sales),
            station_count_without_sales=without_sales_count,
            classification="Model-based estimate",
            note=(
                f"Calculated across {len(with_sales)} nearby Ahmedabad verified station(s) with historical "
                f"synthetic sales series (synthetic_daily_sales.csv)."
                + (
                    f" {without_sales_count} additional nearby verified station(s) without sales baselines are excluded from totals."
                    if without_sales_count > 0
                    else ""
                )
            ),
            reason_unavailable=None,
        )

        diversion_ratio = (
            sum_loss_rounded / proposed_daily_sales_rounded
            if proposed_daily_sales_rounded > 0
            else 1.0
        )
        is_beneficial = (
            net_change_kg >= BENEFICIAL_NET_CHANGE_THRESHOLD_KG
            and net_impact_pct >= BENEFICIAL_NET_IMPACT_PCT_THRESHOLD
            and d_min >= 1.5
            and diversion_ratio < HIGH_CANNIBALIZATION_SHARE_THRESHOLD
        )

        if is_beneficial:
            outcome = "Potentially Beneficial"
            summary = (
                f"Scenario analysis indicates the proposed station adds +{net_change_kg:,.1f} kg/day "
                f"(+{net_impact_pct:.1f}%) in net network sales while limiting existing-station "
                f"cannibalization to {diversion_ratio * 100:.0f}% of new volume and preserving {d_min} km "
                f"spacing from {nearest_station.station_name}."
            )
        else:
            outcome = "Potentially Not Beneficial"
            drivers: List[str] = []
            if d_min < 1.5:
                drivers.append(f"close proximity ({d_min} km) to {nearest_station.station_name}")
            if diversion_ratio >= HIGH_CANNIBALIZATION_SHARE_THRESHOLD:
                drivers.append(f"high cannibalization ({diversion_ratio * 100:.0f}% diverted from existing stations)")
            if net_change_kg < BENEFICIAL_NET_CHANGE_THRESHOLD_KG:
                drivers.append(
                    f"low incremental volume (+{net_change_kg:,.1f} kg/day vs {BENEFICIAL_NET_CHANGE_THRESHOLD_KG:.0f} kg/day benchmark)"
                )
            if net_impact_pct < BENEFICIAL_NET_IMPACT_PCT_THRESHOLD:
                drivers.append(
                    f"limited net network growth (+{net_impact_pct:.1f}% vs {BENEFICIAL_NET_IMPACT_PCT_THRESHOLD:.0f}% benchmark)"
                )
            reason_str = "; ".join(drivers) if drivers else "limited incremental network demand"
            summary = (
                f"Scenario analysis estimates modest net gain (+{net_change_kg:,.1f} kg/day, "
                f"+{net_impact_pct:.1f}%) mainly due to {reason_str}."
            )

        criteria = [
            f"Net network sales change: +{net_change_kg:,.1f} kg/day (benchmark >= +{BENEFICIAL_NET_CHANGE_THRESHOLD_KG:.0f} kg/day)",
            f"Net network growth rate: +{net_impact_pct:.2f}% (benchmark >= +{BENEFICIAL_NET_IMPACT_PCT_THRESHOLD:.1f}%)",
            f"Nearest verified station spacing: {d_min} km (benchmark >= 1.5 km)",
            f"Cannibalization share of new sales: {diversion_ratio * 100:.1f}% (benchmark < {HIGH_CANNIBALIZATION_SHARE_THRESHOLD * 100:.0f}%)",
        ]
        if without_sales_count > 0:
            criteria.append(
                f"Partial sales coverage: {len(with_sales)} of {len(nearby)} nearby stations have baseline series"
            )

        beneficial = BeneficialAssessment(
            outcome=outcome,
            confidence="Scenario-based",
            summary=summary,
            criteria_evaluated=criteria,
            missing_data_requirements=[
                "Live metered dispenser sales (to replace synthetic Ahmedabad demo baseline)",
                "Rated dispensing capacity of existing verified stations",
                "Local road access, peak queuing, and CNG fleet density data",
            ],
            caveat=(
                "Scenario estimate derived from synthetic Ahmedabad daily sales baselines "
                "(synthetic_daily_sales.csv) and distance-decay rules—not a guarantee of realized sales."
            ),
        )

        diversion = DiversionAssessment(
            status="Estimated (Scenario-Based)",
            available=True,
            spatial_overlap_risk=overlap_risk,  # type: ignore[arg-type]
            explanation=(
                f"Scenario-based diversion estimated across {len(with_sales)} nearby Ahmedabad station(s) "
                f"with synthetic historical baselines (synthetic_daily_sales.csv): total estimated diversion "
                f"{sum_loss_rounded:,.1f} kg/day out of {sum_current_before:,.1f} kg/day baseline sales."
                + (
                    f" {without_sales_count} other nearby verified station(s) lack sales history."
                    if without_sales_count > 0
                    else ""
                )
            ),
            demand_data_origin="synthetic_demo",
            stations_with_demand_data=len(with_sales),
            stations_without_demand_data=without_sales_count,
        )

        return rows, demand_estimate, network_sales_impact, beneficial, diversion

    @classmethod
    def simulate_impact(
        cls,
        req: NetworkImpactSimulationRequest,
    ) -> NetworkImpactSimulationResponse:
        """Run impact analysis comparing a proposed station against nearby verified CNG stations."""
        lat = req.proposed_latitude
        lng = req.proposed_longitude
        radius_km = req.radius_km

        all_sorted = cls._compute_all_verified_distances(lat, lng)
        total_checked = len(all_sorted)
        nearby = [s for s in all_sorted if s.distance_km <= radius_km]

        nearest_overall = all_sorted[0] if all_sorted else None
        nearest_within = nearby[0] if nearby else None
        farthest_nearby = nearby[-1] if nearby else None

        avg_nearby_dist = (
            round(sum(s.distance_km for s in nearby) / len(nearby), 2)
            if nearby
            else None
        )

        proposed_point = ProposedLocationPoint(
            name=req.proposed_name,
            location_label=req.proposed_location_label,
            latitude=round(lat, 6),
            longitude=round(lng, 6),
            expected_daily_capacity_kg=req.expected_daily_capacity_kg,
            in_gujarat_bounds=cls._in_gujarat_bounds(lat, lng),
            status="PROPOSED",
        )

        warnings: List[str] = [
            "Proposed station is evaluated strictly as a CANDIDATE / PROPOSED location and is never marked as verified."
        ]
        if not proposed_point.in_gujarat_bounds:
            warnings.append(
                "Selected coordinates appear outside standard Gujarat geographic bounds (lat 20.0–24.8, lng 68.0–74.6)."
            )

        # Case: Zero verified stations in inventory at all
        if total_checked == 0:
            geo = GeographicalMetrics(
                nearby_verified_count=0,
                total_verified_stations_checked=0,
                nearest_station=None,
                nearest_within_radius=None,
                farthest_nearby_station=None,
                average_nearby_distance_km=None,
                coverage_improvement_level="Insufficient Data",
                coverage_improvement_summary="No verified operating stations were available for distance comparison.",
                overlap_level="Insufficient Data",
                overlap_summary="Cannot determine spatial overlap without verified reference stations.",
            )
            rows, demand_est, net_impact, beneficial, diversion = cls._build_insufficient_data_outputs(
                nearby=[],
                nearest_within=None,
                nearest_overall=None,
                radius_km=radius_km,
                expected_capacity=req.expected_daily_capacity_kg,
                overlap_risk="Unknown",
            )
            return NetworkImpactSimulationResponse(
                proposed_station=proposed_point,
                radius_km=radius_km,
                candidate_id=req.candidate_id,
                overall_assessment="Insufficient Data",
                assessment_summary="Insufficient Data: verified operating station inventory is empty.",
                geographical_metrics=geo,
                nearby_stations=[],
                diversion_assessment=diversion,
                station_impact_rows=rows,
                demand_estimate=demand_est,
                network_sales_impact=net_impact,
                beneficial_assessment=beneficial,
                metric_methodology_note="Haversine distance comparison against verified Gujarat CNG stations.",
                data_integrity_note="No synthetic or fabricated station sales were generated.",
                warnings=warnings,
            )

        # Determine geographical spacing & overlap tiers
        nearest_dist = nearest_overall.distance_km if nearest_overall else 999.0
        count = len(nearby)

        if count == 0:
            coverage_level = "High"
            coverage_summary = (
                f"0 verified stations within {radius_km} km; nearest verified station is "
                f"{nearest_dist} km away ({nearest_overall.station_name})."
            )
            overlap_level = "None"
            overlap_summary = f"No verified operating station exists within the {radius_km} km radius."
            overlap_risk = "None"
        elif count >= 4 or nearest_dist < 1.5:
            coverage_level = "Minimal" if nearest_dist < 1.5 else "Low"
            coverage_summary = (
                f"{count} verified station(s) already operate within {radius_km} km "
                f"(nearest at {nearest_dist} km: {nearest_overall.station_name})."
            )
            overlap_level = "High"
            overlap_summary = (
                f"High geographical overlap: {count} verified station(s) inside {radius_km} km "
                f"and nearest station only {nearest_dist} km away."
            )
            overlap_risk = "High"
        elif count >= 2 or nearest_dist < 3.0:
            coverage_level = "Moderate"
            coverage_summary = (
                f"{count} verified station(s) within {radius_km} km; nearest verified station is {nearest_dist} km away."
            )
            overlap_level = "Moderate"
            overlap_summary = (
                f"Moderate proximity: {count} existing verified station(s) inside {radius_km} km "
                f"at an average distance of {avg_nearby_dist} km."
            )
            overlap_risk = "Moderate"
        else:
            coverage_level = "High" if nearest_dist >= 3.0 else "Moderate"
            coverage_summary = (
                f"Only {count} verified station(s) within {radius_km} km; nearest station is {nearest_dist} km away."
            )
            overlap_level = "Low"
            overlap_summary = (
                f"Low geographical overlap within {radius_km} km (nearest station {nearest_dist} km away)."
            )
            overlap_risk = "Low"

        geo = GeographicalMetrics(
            nearby_verified_count=count,
            total_verified_stations_checked=total_checked,
            nearest_station=nearest_overall,
            nearest_within_radius=nearest_within,
            farthest_nearby_station=farthest_nearby,
            average_nearby_distance_km=avg_nearby_dist,
            coverage_improvement_level=coverage_level,  # type: ignore[arg-type]
            coverage_improvement_summary=coverage_summary,
            overlap_level=overlap_level,  # type: ignore[arg-type]
            overlap_summary=overlap_summary,
        )

        with_sales_count = sum(
            1 for s in nearby if s.demand_data_available and s.historical_daily_demand_kg is not None
        )

        if with_sales_count > 0 and nearest_within is not None:
            (
                station_impact_rows,
                demand_estimate,
                network_sales_impact,
                beneficial_assessment,
                diversion_assessment,
            ) = cls._compute_scenario_impact(
                nearby=nearby,
                nearest_station=nearest_within,
                radius_km=radius_km,
                expected_capacity=req.expected_daily_capacity_kg,
                overlap_risk=overlap_risk,
            )
            warnings.append(
                "Nearby sales baselines come from FUELCAST's synthetic Ahmedabad demo series (synthetic_daily_sales.csv) and are labeled as scenario estimates."
            )
        else:
            (
                station_impact_rows,
                demand_estimate,
                network_sales_impact,
                beneficial_assessment,
                diversion_assessment,
            ) = cls._build_insufficient_data_outputs(
                nearby=nearby,
                nearest_within=nearest_within,
                nearest_overall=nearest_overall,
                radius_km=radius_km,
                expected_capacity=req.expected_daily_capacity_kg,
                overlap_risk=overlap_risk,
            )
            warnings.append(
                "Station-level demand and sales history are unavailable for nearby stations here; insufficient data is displayed instead of fabricated estimates."
            )

        if count == 0:
            overall: OverallAssessmentLabel = "Potential Coverage Gap"
            assessment_summary = (
                f"No verified CNG stations were found within {radius_km} km "
                f"(nearest verified station is {nearest_overall.station_name} at {nearest_dist} km). "
                "Strong geographical coverage gap, though commercial demand estimates require corridor baseline data."
            )
        elif overlap_level == "High":
            overall = "High Existing Station Density"
            assessment_summary = beneficial_assessment.summary
        elif overlap_level == "Moderate":
            overall = (
                "Potential Network Expansion Opportunity"
                if beneficial_assessment.outcome == "Potentially Beneficial"
                else "Moderate Geographical Overlap"
            )
            assessment_summary = beneficial_assessment.summary
        else:
            overall = "Potential Network Expansion Opportunity"
            assessment_summary = beneficial_assessment.summary

        if nearest_overall and nearest_overall.distance_km < 1.0:
            warnings.append(
                f"Proposed location is very close ({nearest_overall.distance_km} km) to {nearest_overall.station_name}."
            )

        return NetworkImpactSimulationResponse(
            proposed_station=proposed_point,
            radius_km=radius_km,
            candidate_id=req.candidate_id,
            overall_assessment=overall,
            assessment_summary=assessment_summary,
            geographical_metrics=geo,
            nearby_stations=nearby,
            diversion_assessment=diversion_assessment,
            station_impact_rows=station_impact_rows,
            demand_estimate=demand_estimate,
            network_sales_impact=network_sales_impact,
            beneficial_assessment=beneficial_assessment,
            metric_methodology_note=(
                "All station-to-station distances use great-circle Haversine kilometers against 151 strictly verified "
                "Gujarat CNG stations. Demand, per-station diversion loss, and Before/After network sales use quadratic "
                "distance decay and nearest-station coverage expansion strictly when baseline series exist; otherwise "
                "metrics honestly report Insufficient Data / Unavailable."
            ),
            data_integrity_note=(
                "Existing station capacities are unavailable across all 151 verified stations. "
                "Station-level historical sales exist solely for 11 Ahmedabad stations (synthetic demo dataset). "
                "Every metric separates actual/synthetic baseline, model estimate, scenario assumption, user input, or unavailable."
            ),
            warnings=warnings,
        )
