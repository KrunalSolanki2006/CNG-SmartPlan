"""Tests for Gujarat-wide Main Dashboard aggregation endpoint GET /api/v1/dashboard/overview."""

import pytest
from fastapi.testclient import TestClient
from main import app
from services.network_impact_service import NetworkImpactService


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_dashboard_overview_network_and_city_distribution(client):
    """Verify verified station count, unique city count, coordinates, and distribution integrity."""
    res = client.get("/api/v1/dashboard/overview")
    assert res.status_code == 200
    data = res.json()

    ns = data["network_summary"]
    expected_verified = len(NetworkImpactService.get_verified_eligible_stations())
    assert ns["total_verified_stations"] == expected_verified
    assert ns["total_verified_stations"] == 151
    assert ns["data_origin"] == "real_public"

    assert ns["cities_covered_count"] == len(ns["cities_covered"])
    assert ns["cities_covered_count"] > 0
    assert sum(c["station_count"] for c in ns["station_distribution_by_city"]) == expected_verified
    assert sum(d["station_count"] for d in ns["station_distribution_by_district"]) == expected_verified
    assert ns["geographic_coverage"]["verified_coordinate_stations"] == expected_verified
    assert len(ns["verified_coordinates"]) == expected_verified


def test_dashboard_overview_forecast_aggregation_and_coverage(client):
    """Verify 7-day forecast aggregation, peak day, coverage ratio, and synthetic labeling."""
    res = client.get("/api/v1/dashboard/overview?horizon_days=7")
    assert res.status_code == 200
    fc = res.json()["aggregated_forecast"]

    assert fc["data_origin"] == "synthetic_demo"
    assert fc["is_synthetic"] is True
    assert fc["horizon_days"] == 7
    assert len(fc["daily_series"]) == 7

    cov = fc["coverage"]
    assert cov["verified_stations_total"] == 151
    assert cov["stations_with_valid_forecast"] == 151
    assert cov["coverage_ratio_label"] == "151/151"
    assert cov["coverage_pct"] == 100.0

    series_sum = round(sum(p["total_demand_kg"] for p in fc["daily_series"]), 1)
    assert abs(fc["total_forecasted_demand_kg"] - series_sum) <= 0.2
    peak = max(fc["daily_series"], key=lambda p: p["total_demand_kg"])
    assert fc["expected_peak_demand_day"]["date"] == peak["date"]
    assert fc["expected_peak_demand_day"]["total_demand_kg"] == peak["total_demand_kg"]


def test_dashboard_overview_alerts_intelligence_and_expansion(client):
    """Verify supply alert counts, network intelligence balance, expansion insights, and provenance."""
    res = client.get("/api/v1/dashboard/overview")
    assert res.status_code == 200
    data = res.json()

    sa = data["supply_alerts"]
    assert sa["total_active_alerts"] == sa["critical_alerts_count"] + sa["warning_alerts_count"]
    assert sa["total_active_alerts"] == (
        sa["peak_demand_warnings_count"] + sa["potential_supply_shortage_alerts_count"]
    )
    assert sa["distinct_stations_affected"] <= sa["total_active_alerts"]
    assert len(sa["recent_notifications"]) <= 10

    ni = data["network_intelligence"]
    assert ni["status"] == "available"
    assert ni["aggregate_demand_kg_per_day"] > 0
    assert ni["aggregate_effective_supply_kg_per_day"] > 0
    assert ni["future_planned_supply_status"] == "unavailable_post_2025_baseline"

    ei = data["expansion_insights"]
    assert ei["total_evaluated_candidates"] > 0
    assert ei["highest_ranked_candidate"] is not None
    assert ei["highest_ranked_candidate"]["rank"] == 1
    assert sum(ei["recommendation_breakdown"].values()) == ei["total_evaluated_candidates"]
    assert ei["existing_impact_simulation"]["available"] is False
    assert ei["existing_impact_simulation"]["status"] == "not_run_yet"

    prov = data["provenance"]
    assert prov["real_sales_data_present"] is False
    assert prov["real_supply_data_present"] is False
    assert prov["last_historical_data_date"] == "2026-11-24"
    assert prov["dashboard_generated_at"].endswith("Z")
    assert prov["forecast_generated_at"].endswith("Z")


def test_dashboard_overview_invalid_horizon_rejected(client):
    """Verify out-of-range horizon_days returns 422 VALIDATION_ERROR."""
    res = client.get("/api/v1/dashboard/overview?horizon_days=99")
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
