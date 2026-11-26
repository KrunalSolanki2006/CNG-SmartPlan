"""Gujarat-wide Main Dashboard aggregation service reusing existing station, forecast, supply, and candidate services."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import threading
from typing import Dict, List, Optional, Tuple

from config import settings
from schemas.dashboard import (
    AggregatedDemandForecast,
    CityStationCount,
    DailyAggregateForecastPoint,
    DashboardAlertNotification,
    DataProvenanceSummary,
    DistrictStationCount,
    EvaluatedCandidateSummary,
    ForecastCoverageSummary,
    GeographicCoverageSummary,
    GujaratNetworkSummary,
    ImpactSimulationHistoryStatus,
    MainDashboardOverviewResponse,
    NetworkExpansionInsights,
    NetworkIntelligenceSummary,
    PeakDemandDaySummary,
    ServiceGapArea,
    SupplyAlertAggregation,
    VerifiedStationCoordinate,
)
from schemas.forecast import ForecastRequest
from services.candidate_ranking_service import CandidateRankingService
from services.data_loader import get_data_store
from services.forecast_service import ForecastService, TREND_THRESHOLD_PCT
from services.network_impact_service import NetworkImpactService


class DashboardService:
    """Aggregates Gujarat-wide network, forecast, supply-alert, intelligence, and expansion insights."""

    _lock = threading.Lock()
    _cache: Dict[Tuple[str, str, int], MainDashboardOverviewResponse] = {}

    @classmethod
    def get_dashboard_overview(cls, horizon_days: int = 7) -> MainDashboardOverviewResponse:
        """Compute or retrieve cached Main Dashboard overview across all verified Gujarat stations."""
        store = get_data_store()
        _, daily_df, _ = ForecastService._get_station_and_sales_sources(store)
        fp = ForecastService._dataset_fingerprint(store, daily_df)
        ref_date_str = ForecastService._current_local_date().strftime("%Y-%m-%d")
        cache_key = (fp, ref_date_str, horizon_days)

        with cls._lock:
            if cache_key in cls._cache:
                return cls._cache[cache_key]

        disk_fp = ForecastService._disk_fingerprint(daily_df)
        cache_dir = Path(settings.data_dir) / "synthetic" / ".dashboard_overview_cache"
        key_hash = hashlib.sha256(
            "|".join(str(x) for x in (disk_fp, ref_date_str, horizon_days)).encode("utf-8")
        ).hexdigest()[:24]
        cache_file = cache_dir / f"{key_hash}.json"
        if cache_file.exists():
            try:
                cached = MainDashboardOverviewResponse.model_validate_json(
                    cache_file.read_text(encoding="utf-8")
                )
                with cls._lock:
                    cls._cache[cache_key] = cached
                return cached
            except Exception:
                pass

        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # ------------------------------------------------------------------
        # TASK 1: Gujarat CNG Network Overview (verified stations only)
        # ------------------------------------------------------------------
        verified_stations = NetworkImpactService.get_verified_eligible_stations()
        total_verified = len(verified_stations)

        all_inventory = CandidateRankingService.load_network_stations(
            include_discovered=True, include_rejected=False
        )
        excluded_count = max(0, len(all_inventory) - total_verified)
        if getattr(store, "station_exclusions", None) is not None and not store.station_exclusions.empty:
            excluded_count = int(len(store.station_exclusions))

        city_counts: Dict[Tuple[str, str], int] = defaultdict(int)
        district_counts: Dict[str, int] = defaultdict(int)
        verified_coords: List[VerifiedStationCoordinate] = []

        for st in verified_stations:
            city_name = (st.city or st.district or "Unknown").strip()
            dist_name = (st.district or "Unknown").strip()
            city_counts[(city_name, dist_name)] += 1
            district_counts[dist_name] += 1
            if st.latitude is not None and st.longitude is not None:
                verified_coords.append(
                    VerifiedStationCoordinate(
                        station_id=st.station_id,
                        station_name=st.station_name,
                        city=city_name,
                        district=dist_name,
                        operator=st.operator,
                        latitude=float(st.latitude),
                        longitude=float(st.longitude),
                    )
                )

        unique_cities = sorted({c for (c, _) in city_counts.keys()})
        unique_districts = sorted(district_counts.keys())

        city_distribution = [
            CityStationCount(
                city=city,
                district=dist,
                station_count=cnt,
                share_pct=round((cnt / total_verified) * 100.0, 1) if total_verified else 0.0,
            )
            for (city, dist), cnt in sorted(
                city_counts.items(), key=lambda item: (-item[1], item[0][0])
            )
        ]

        district_distribution = [
            DistrictStationCount(
                district=dist,
                station_count=cnt,
                share_pct=round((cnt / total_verified) * 100.0, 1) if total_verified else 0.0,
            )
            for dist, cnt in sorted(
                district_counts.items(), key=lambda item: (-item[1], item[0])
            )
        ]

        lats = [c.latitude for c in verified_coords]
        lngs = [c.longitude for c in verified_coords]
        geo_coverage = GeographicCoverageSummary(
            min_latitude=round(min(lats), 4) if lats else None,
            max_latitude=round(max(lats), 4) if lats else None,
            min_longitude=round(min(lngs), 4) if lngs else None,
            max_longitude=round(max(lngs), 4) if lngs else None,
            verified_coordinate_stations=len(verified_coords),
            total_verified_stations=total_verified,
            data_origin="real_public",
        )

        network_summary = GujaratNetworkSummary(
            total_verified_stations=total_verified,
            excluded_or_unverified_count=excluded_count,
            cities_covered_count=len(unique_cities),
            cities_covered=unique_cities,
            districts_covered_count=len(unique_districts),
            districts_covered=unique_districts,
            station_distribution_by_city=city_distribution,
            station_distribution_by_district=district_distribution,
            verified_coordinates=verified_coords,
            geographic_coverage=geo_coverage,
            data_origin="real_public",
        )

        # ------------------------------------------------------------------
        # TASK 2: Network-Wide Demand Forecast Aggregation
        # ------------------------------------------------------------------
        net_fc = ForecastService.get_network_summary(horizon_days=horizon_days, model="holt_winters")

        daily_totals: Dict[str, float] = defaultdict(float)
        daily_station_counts: Dict[str, int] = defaultdict(int)
        peak_warnings: List[DashboardAlertNotification] = []
        valid_fc_stations = 0
        last_hist_date: Optional[str] = net_fc.data_through_date

        station_lookup = {st.station_id: st for st in verified_stations}

        for st in verified_stations:
            try:
                fc = ForecastService.generate_forecast(
                    ForecastRequest(
                        station_id=st.station_id,
                        horizon_days=horizon_days,
                        model="holt_winters",
                        include_baseline=True,
                    )
                )
            except Exception:
                continue

            if fc.data_through_date and (last_hist_date is None or fc.data_through_date > last_hist_date):
                last_hist_date = fc.data_through_date

            if fc.forecast_status in ("insufficient_data", "unavailable") or not fc.forecast:
                continue

            valid_fc_stations += 1
            for pt in fc.forecast:
                if pt.forecast_demand_kg is not None:
                    daily_totals[pt.date] += float(pt.forecast_demand_kg)
                    daily_station_counts[pt.date] += 1

            # Peak-demand warning from actual ForecastService output (never duplicate algorithm)
            if (
                fc.demand_trend == "increasing"
                and fc.trend_change_pct is not None
                and fc.trend_change_pct >= TREND_THRESHOLD_PCT
                and fc.forecast_avg_demand_kg is not None
            ):
                peak_warnings.append(
                    DashboardAlertNotification(
                        station_id=st.station_id,
                        station_name=st.station_name,
                        district=st.district,
                        alert_type="peak_demand_warning",
                        severity="warning",
                        message=(
                            f"Forecasted {horizon_days}d demand trending +{fc.trend_change_pct:.1f}% "
                            f"above trailing 30d ({fc.forecast_avg_demand_kg:,.1f} kg/day)."
                        ),
                        metric_value=round(fc.trend_change_pct, 1),
                        metric_unit="%",
                        timestamp=fc.forecast_generated_at,
                        data_origin=fc.data_origin,
                    )
                )

        daily_series = [
            DailyAggregateForecastPoint(
                date=d,
                total_demand_kg=round(daily_totals[d], 1),
                stations_included=daily_station_counts[d],
            )
            for d in sorted(daily_totals.keys())
        ]

        total_forecast_kg = round(sum(p.total_demand_kg for p in daily_series), 1) if daily_series else None
        avg_daily_forecast_kg = (
            round(total_forecast_kg / len(daily_series), 1)
            if total_forecast_kg is not None and daily_series
            else None
        )
        peak_day_pt = max(daily_series, key=lambda p: p.total_demand_kg) if daily_series else None
        expected_peak_day = (
            PeakDemandDaySummary(
                date=peak_day_pt.date,
                total_demand_kg=peak_day_pt.total_demand_kg,
                stations_included=peak_day_pt.stations_included,
            )
            if peak_day_pt
            else None
        )

        unavailable_fc_stations = max(0, total_verified - valid_fc_stations)
        coverage_pct = round((valid_fc_stations / total_verified) * 100.0, 1) if total_verified else 0.0

        aggregated_forecast = AggregatedDemandForecast(
            data_origin=net_fc.data_origin,
            is_synthetic=True,
            model_used=net_fc.model_used,
            horizon_days=horizon_days,
            date_range_start=daily_series[0].date if daily_series else net_fc.target_start_date,
            date_range_end=daily_series[-1].date if daily_series else net_fc.target_end_date,
            total_forecasted_demand_kg=total_forecast_kg,
            average_daily_forecast_demand_kg=avg_daily_forecast_kg,
            historical_recent_avg_daily_kg=net_fc.historical_network_recent_avg_kg_per_day,
            demand_trend=net_fc.network_demand_trend,
            trend_change_pct=net_fc.network_trend_change_pct,
            expected_peak_demand_day=expected_peak_day,
            daily_series=daily_series,
            coverage=ForecastCoverageSummary(
                verified_stations_total=total_verified,
                stations_with_valid_forecast=valid_fc_stations,
                stations_unavailable_or_insufficient=unavailable_fc_stations,
                coverage_ratio_label=f"{valid_fc_stations}/{total_verified}",
                coverage_pct=coverage_pct,
            ),
            note=(
                f"Synthetic prototype forecast across {valid_fc_stations}/{total_verified} verified Gujarat stations "
                f"(historical cutoff {last_hist_date or 'N/A'}). Not actual CNG sales."
            ),
        )

        # ------------------------------------------------------------------
        # TASK 3 & TASK 4: Supply Alerts & Network Intelligence Aggregation
        # ------------------------------------------------------------------
        shortfall_notifications: List[DashboardAlertNotification] = []
        trailing_start: Optional[str] = None
        trailing_end: Optional[str] = None
        agg_demand_kg_day: Optional[float] = None
        agg_supply_kg_day: Optional[float] = None
        net_balance_kg_day: Optional[float] = None
        balance_pct: Optional[float] = None
        balance_status = "unavailable"

        if (
            getattr(store, "gujarat_daily_demand_sales", None) is not None
            and not store.gujarat_daily_demand_sales.empty
        ):
            gdf = store.gujarat_daily_demand_sales
            # Filter to verified station IDs only
            verified_ids = set(station_lookup.keys())
            gdf_verified = gdf[gdf["station_id"].isin(verified_ids)]
            if not gdf_verified.empty:
                max_date = str(gdf_verified["date"].max())
                trailing_end = max_date
                all_dates = sorted(gdf_verified["date"].unique().tolist())
                trailing_30_dates = all_dates[-30:]
                trailing_7_dates = all_dates[-7:]
                trailing_start = trailing_30_dates[0] if trailing_30_dates else max_date

                # Aggregate demand vs effective supply over trailing 30d window
                t30 = gdf_verified[gdf_verified["date"].isin(trailing_30_dates)]
                daily_d = t30.groupby("date")["simulated_demand_kg"].sum()
                daily_s = t30.groupby("date")["effective_supply_kg"].sum()
                agg_demand_kg_day = round(float(daily_d.mean()), 1)
                agg_supply_kg_day = round(float(daily_s.mean()), 1)
                net_balance_kg_day = round(agg_supply_kg_day - agg_demand_kg_day, 1)
                balance_pct = (
                    round((agg_supply_kg_day / agg_demand_kg_day) * 100.0, 1)
                    if agg_demand_kg_day > 0
                    else None
                )
                if balance_pct is not None:
                    balance_status = "surplus_or_balanced" if net_balance_kg_day >= 0 else "constrained_deficit"

                # Active trailing 7-day operational supply-shortage & compressor-outage alerts
                t7 = gdf_verified[gdf_verified["date"].isin(trailing_7_dates)]
                latest_rows = t7[
                    (t7["unmet_demand_kg"] > 0) | (t7["compressor_outage_flag"].astype(bool))
                ].sort_values(["date", "unmet_demand_kg"], ascending=[False, False])

                # Keep most recent relevant alert per station in trailing 7d window
                seen_shortage_stations = set()
                for row in latest_rows.itertuples(index=False):
                    sid = str(row.station_id)
                    if sid in seen_shortage_stations:
                        continue
                    seen_shortage_stations.add(sid)
                    st_meta = station_lookup.get(sid)
                    st_name = st_meta.station_name if st_meta else sid
                    st_dist = st_meta.district if st_meta else str(getattr(row, "district", "Gujarat"))
                    unmet = float(row.unmet_demand_kg)
                    demand = float(row.simulated_demand_kg)
                    is_outage = bool(row.compressor_outage_flag)
                    unmet_ratio = (unmet / demand) if demand > 0 else 0.0

                    if is_outage or unmet_ratio >= 0.15:
                        severity = "critical"
                        alert_type = "compressor_outage" if is_outage else "potential_supply_shortage"
                    else:
                        severity = "warning"
                        alert_type = "potential_supply_shortage"

                    shortfall_notifications.append(
                        DashboardAlertNotification(
                            station_id=sid,
                            station_name=st_name,
                            district=st_dist,
                            alert_type=alert_type,
                            severity=severity,
                            message=(
                                f"Simulated compressor outage with {unmet:,.1f} kg unmet demand."
                                if is_outage
                                else f"Supply-constrained day: {unmet:,.1f} kg unmet demand ({unmet_ratio * 100:.1f}% of demand)."
                            ),
                            metric_value=round(unmet, 1),
                            metric_unit="kg",
                            timestamp=f"{row.date}T23:59:00Z",
                            data_origin="synthetic_demo",
                        )
                    )

        all_alerts = shortfall_notifications + peak_warnings
        critical_count = sum(1 for a in all_alerts if a.severity == "critical")
        warning_count = sum(1 for a in all_alerts if a.severity == "warning")
        distinct_alert_stations = len({a.station_id for a in all_alerts})

        # Sort notifications: critical first, then most recent timestamp
        sorted_notifications = sorted(
            all_alerts,
            key=lambda a: (0 if a.severity == "critical" else 1, a.timestamp),
            reverse=False,
        )
        # Keep critical first and sort descending by timestamp within each tier
        critical_list = sorted(
            [a for a in all_alerts if a.severity == "critical"],
            key=lambda a: a.timestamp,
            reverse=True,
        )
        warning_list = sorted(
            [a for a in all_alerts if a.severity == "warning"],
            key=lambda a: a.timestamp,
            reverse=True,
        )
        recent_notifications = (critical_list + warning_list)[:10]

        supply_alerts = SupplyAlertAggregation(
            data_origin="synthetic_demo",
            total_active_alerts=len(all_alerts),
            distinct_stations_affected=distinct_alert_stations,
            critical_alerts_count=critical_count,
            warning_alerts_count=warning_count,
            peak_demand_warnings_count=len(peak_warnings),
            potential_supply_shortage_alerts_count=len(shortfall_notifications),
            future_supply_schedule_status="unavailable_without_planner_override",
            recent_notifications=recent_notifications,
            note=(
                "Combines trailing 7-day synthetic supply/outage alerts with forecasted peak-demand warnings. "
                "Post-2025 planned supply schedule requires planner overrides on Supply Alerts."
            ),
        )

        # ------------------------------------------------------------------
        # TASK 4 & TASK 5: Candidate Evaluation, Service Gaps & Expansion Insights
        # ------------------------------------------------------------------
        rankings_resp = CandidateRankingService.rank_candidates()
        all_cand_models = {c.candidate_id: c for c in CandidateRankingService.load_candidate_locations()}
        ranked_items = rankings_resp.candidates

        insufficient_cov_areas: List[ServiceGapArea] = []
        further_eval_areas: List[ServiceGapArea] = []
        evaluated_summaries: List[EvaluatedCandidateSummary] = []
        rec_breakdown: Dict[str, int] = {
            "Beneficial": 0,
            "Further Evaluation Required": 0,
            "Not Beneficial": 0,
        }

        for item in ranked_items:
            cand_raw = all_cand_models.get(item.candidate_id)
            nearest_km = (
                (item.nearest_station.road_distance_km or item.nearest_station.straight_line_distance_km)
                if item.nearest_station
                else None
            )

            if not item.is_rankable or item.final_score is None:
                rec_status = "Further Evaluation Required"
            elif item.final_score >= 75.0 and (nearest_km is None or nearest_km >= 3.0):
                rec_status = "Beneficial"
            elif item.final_score >= 55.0:
                rec_status = "Further Evaluation Required"
            else:
                rec_status = "Not Beneficial"

            rec_breakdown[rec_status] += 1

            evaluated_summaries.append(
                EvaluatedCandidateSummary(
                    candidate_id=item.candidate_id,
                    name=item.name,
                    city=item.city,
                    district=item.district,
                    category=item.category,
                    rank=item.rank,
                    evaluation_score=item.final_score,
                    confidence_tier=item.confidence_tier,
                    nearest_station_distance_km=nearest_km,
                    recommendation_status=rec_status,
                    evaluated_at=cand_raw.last_verified_at if cand_raw else None,
                )
            )

            # Service gap identification from existing CandidateRankingService criteria
            if (item.service_gap_score is not None and item.service_gap_score >= 65.0) or (
                nearest_km is not None and nearest_km >= 5.0
            ):
                insufficient_cov_areas.append(
                    ServiceGapArea(
                        area_name=item.name,
                        city=item.city,
                        district=item.district,
                        nearest_verified_station_km=nearest_km,
                        service_gap_score=item.service_gap_score,
                        reason=(
                            f"Nearest verified station is {nearest_km:.2f} km away"
                            if nearest_km is not None
                            else "High service gap score in MCDA evaluation"
                        ),
                    )
                )

            if not item.is_rankable or item.confidence_tier != "High":
                further_eval_areas.append(
                    ServiceGapArea(
                        area_name=item.name,
                        city=item.city,
                        district=item.district,
                        nearest_verified_station_km=nearest_km,
                        service_gap_score=item.service_gap_score,
                        reason=(
                            item.unrankable_reason
                            or f"{item.confidence_tier} confidence ({item.data_completeness_pct:.0f}% data completeness)"
                        ),
                    )
                )

        # Sort recently evaluated by evaluated_at timestamp descending
        recently_evaluated = sorted(
            evaluated_summaries,
            key=lambda c: c.evaluated_at or "",
            reverse=True,
        )[:5]

        highest_ranked = next(
            (e for e in evaluated_summaries if e.rank == 1),
            evaluated_summaries[0] if evaluated_summaries else None,
        )

        network_intelligence = NetworkIntelligenceSummary(
            status="available" if agg_demand_kg_day is not None else "unavailable",
            data_origin="synthetic_demo",
            trailing_window_start=trailing_start,
            trailing_window_end=trailing_end,
            aggregate_demand_kg_per_day=agg_demand_kg_day,
            aggregate_effective_supply_kg_per_day=agg_supply_kg_day,
            net_supply_demand_balance_kg_per_day=net_balance_kg_day,
            supply_demand_balance_pct=balance_pct,
            overall_balance_status=balance_status,
            future_planned_supply_status="unavailable_post_2025_baseline",
            areas_with_insufficient_coverage=insufficient_cov_areas[:5],
            areas_for_further_evaluation=further_eval_areas[:5],
            note=(
                "Trailing 30-day supply-demand balance uses synthetic effective supply vs. simulated demand; "
                "service gaps are derived from CandidateRankingService MCDA criteria."
            ),
        )

        expansion_insights = NetworkExpansionInsights(
            total_evaluated_candidates=len(evaluated_summaries),
            rankable_candidates_count=rankings_resp.rankable_count,
            recently_evaluated_locations=recently_evaluated,
            highest_ranked_candidate=highest_ranked,
            recommendation_breakdown=rec_breakdown,
            existing_impact_simulation=ImpactSimulationHistoryStatus(
                available=False,
                status="not_run_yet",
                estimated_additional_demand_kg_per_day=None,
                note=(
                    "Impact Simulator runs on demand per candidate; no persisted simulation runs are stored on disk. "
                    "Open Impact Simulator or click Direct Simulate on Network Map to compute catchment capture."
                ),
            ),
            data_origin="real_public",
            note=(
                f"Evaluated {len(evaluated_summaries)} curated candidate locations across Gujarat "
                f"({rankings_resp.rankable_count} rankable)."
            ),
        )

        provenance = DataProvenanceSummary(
            station_inventory_origin="real_public",
            demand_forecast_origin=net_fc.data_origin,
            supply_alerts_origin="synthetic_demo",
            candidate_evaluation_origin="real_public",
            real_sales_data_present=False,
            real_supply_data_present=False,
            last_historical_data_date=last_hist_date,
            forecast_generated_at=net_fc.forecast_generated_at,
            dashboard_generated_at=now_utc,
        )

        response = MainDashboardOverviewResponse(
            network_summary=network_summary,
            aggregated_forecast=aggregated_forecast,
            supply_alerts=supply_alerts,
            network_intelligence=network_intelligence,
            expansion_insights=expansion_insights,
            provenance=provenance,
        )

        with cls._lock:
            cls._cache[cache_key] = response
        try:
            cache_dir.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(response.model_dump_json(), encoding="utf-8")
        except Exception:
            pass
        return response
