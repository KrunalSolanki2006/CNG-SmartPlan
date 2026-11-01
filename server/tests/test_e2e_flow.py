"""End-to-end integration tests verifying the full workflow across all 9 canonical API routes.

Flow:
1. Health -> /api/v1/health
2. Overview -> /api/v1/overview
3. Stations List -> /api/v1/stations
4. Station Sales History -> /api/v1/stations/AMD001/history
5. Excluded Station History -> /api/v1/stations/AMD010/history (404)
6. Demand Forecast -> /api/v1/forecast
7. Supply Shortfall Check -> /api/v1/supply-check
8. Hourly Diurnal Demand -> /api/v1/hourly-demand
9. New-Station Impact Simulator -> /api/v1/impact-simulator
10. Data Quality & Provenance -> /api/v1/data-quality

Governed by docs/API_CONTRACT.md and Milestone 5 tasks.
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="module")
def client():
    """Module-level FastAPI test client."""
    return TestClient(app)


def test_full_e2e_workflow(client):
    """Test full sequential workflow through all canonical API endpoints."""
    # 1. Health check
    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200
    health_data = res_health.json()
    assert health_data["status"] == "ok"
    assert health_data["data_loaded"]["stations"] == 12
    assert health_data["data_loaded"]["daily_sales_rows"] == 8041

    # 2. Network overview
    res_overview = client.get("/api/v1/overview")
    assert res_overview.status_code == 200
    overview_data = res_overview.json()
    assert overview_data["station_counts"]["total_in_inventory"] == 12
    assert overview_data["station_counts"]["eligible_for_simulation"] == 11
    assert overview_data["station_counts"]["eligible_for_map_display"] == 0
    assert overview_data["forecast_summary"]["stations_forecasted"] == 11
    assert overview_data["forecast_summary"]["data_origin"] == "synthetic_demo"

    # 3. Stations list
    res_stations = client.get("/api/v1/stations")
    assert res_stations.status_code == 200
    stations_data = res_stations.json()
    assert stations_data["total"] == 12
    assert stations_data["eligible_for_simulation"] == 11
    assert stations_data["eligible_for_map_pin"] == 0
    assert stations_data["map_availability"]["available"] is False
    assert len(stations_data["stations"]) == 12
    # Verify all 12 stations have null coordinates and false map eligibility
    for s in stations_data["stations"]:
        assert s["eligible_for_map_pin"] is False
        assert s["coordinates_verified"] is False
        assert s["latitude"] is None
        assert s["longitude"] is None

    # 4. Station sales history for AMD001
    res_hist = client.get("/api/v1/stations/AMD001/history?aggregation=daily")
    assert res_hist.status_code == 200
    hist_data = res_hist.json()
    assert hist_data["station_id"] == "AMD001"
    assert hist_data["data_origin"] == "synthetic_demo"
    assert hist_data["total_records"] == 731
    assert len(hist_data["series"]) == 731

    # 5. Station AMD010 exclusion handling (404)
    res_amd010 = client.get("/api/v1/stations/AMD010/history")
    assert res_amd010.status_code == 404
    err_amd010 = res_amd010.json()
    assert err_amd010["error"]["code"] == "STATION_NOT_FOUND"

    # 6. Demand forecast for AMD001 (7-day horizon)
    forecast_payload = {
        "station_id": "AMD001",
        "horizon_days": 7,
        "model": "holt_winters",
        "include_baseline": True,
    }
    res_fc = client.post("/api/v1/forecast", json=forecast_payload)
    assert res_fc.status_code == 200
    fc_data = res_fc.json()
    assert fc_data["station_id"] == "AMD001"
    assert fc_data["data_origin"] == "synthetic_demo"
    assert len(fc_data["forecast"]) == 7
    assert fc_data["evaluation"]["baseline_mae_kg"] == 150.55
    assert fc_data["reliability"]["data_source"] == "synthetic_demo"

    # 7. Supply shortfall check for AMD001
    supply_payload = {
        "station_id": "AMD001",
        "horizon_days": 7,
        "supply_source": "synthetic",
    }
    res_sup = client.post("/api/v1/supply-check", json=supply_payload)
    assert res_sup.status_code == 200
    sup_data = res_sup.json()
    assert sup_data["station_id"] == "AMD001"
    assert sup_data["data_origin"] == "synthetic_demo"
    assert len(sup_data["comparison"]) == 7
    for d in sup_data["comparison"]:
        # shortfall formula: max(0, forecast - supply)
        if d["planned_supply_kg"] is not None:
            expected_shortfall = max(0.0, round(d["forecast_demand_kg"] - d["planned_supply_kg"], 2))
            assert d["potential_shortfall_kg"] == pytest.approx(expected_shortfall, abs=0.01)

    # 8. Hourly diurnal demand
    res_hr = client.get("/api/v1/hourly-demand?station_id=AMD001&date=2025-12-05")
    assert res_hr.status_code == 200
    hr_data = res_hr.json()
    assert hr_data["data_origin"] == "synthetic_demo"
    assert "AMD001" in hr_data["available_stations"]
    assert hr_data["total_records"] == 24
    assert len(hr_data["records"]) == 24
    assert all(r["station_id"] == "AMD001" for r in hr_data["records"])

    # 9. Signature New-Station Impact Simulator
    impact_payload = {
        "proposed_latitude": 23.05,
        "proposed_longitude": 72.60,
        "catchment_radius_km": 3.0,
        "catchment_demand_kg_per_day": 5000.0,
        "capture_proportion": 0.35,
        "diversion_proportion": 0.60,
        "accessibility_demand_kg_per_day": 0.0,
    }
    res_imp = client.post("/api/v1/impact-simulator", json=impact_payload)
    assert res_imp.status_code == 200
    imp_data = res_imp.json()
    assert imp_data["data_origin"] == "illustrative_scenario"
    assert imp_data["results"]["proposed_station_demand_kg_per_day"] == 1750.0
    assert imp_data["results"]["estimated_diverted_demand_kg_per_day"] == 1050.0
    assert imp_data["results"]["net_additional_network_demand_kg_per_day"] == 700.0
    assert imp_data["geographic_analysis"]["available"] is False

    # 10. Data quality and provenance
    res_qual = client.get("/api/v1/data-quality")
    assert res_qual.status_code == 200
    qual_data = res_qual.json()
    assert qual_data["station_inventory"]["total_stations"] == 12
    assert qual_data["station_inventory"]["eligible_for_map_pin"] == 0
    assert qual_data["synthetic_data"]["daily_sales"]["rows"] == 8041
    assert qual_data["synthetic_data"]["supply"]["rows"] == 8041
    assert qual_data["synthetic_data"]["hourly_demand"]["rows"] == 2160
    assert len(qual_data["data_gaps"]) == 8
