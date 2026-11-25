"""Comprehensive integration tests for Overview, Stations, History, and Data Quality endpoints."""

import pytest
from datetime import datetime


def test_overview_endpoint(client):
    """Verify GET /api/v1/overview returns complete schema and exact calculated figures."""
    response = client.get("/api/v1/overview")
    assert response.status_code == 200
    data = response.json()

    # Required top-level keys
    assert set(data.keys()) == {
        "station_counts",
        "network_summary",
        "forecast_summary",
        "shortfall_alerts",
        "hourly_summary",
        "data_quality_flags",
        "generated_at",
    }

    # Station counts (151-station Gujarat network)
    sc = data["station_counts"]
    assert sc["total_in_inventory"] == 151
    assert sc["eligible_for_simulation"] == 151
    assert sc["eligible_for_map_display"] == 151
    assert "151 verified Gujarat CNG stations" in sc["note"]

    # Network summary
    ns = data["network_summary"]
    assert ns["data_origin"] == "synthetic_demo"
    assert ns["date_range_start"] == "2024-01-01"
    assert ns["date_range_end"] == "2026-11-24"
    assert ns["total_stations_in_series"] == 151
    assert ns["mean_daily_network_demand_kg"] > 100000

    # Forecast summary
    fs = data["forecast_summary"]
    assert fs["data_origin"] == "synthetic_demo"
    assert fs["horizon_days"] == 7
    assert fs["stations_forecasted"] == 151

    # Shortfall alerts
    sa = data["shortfall_alerts"]
    assert sa["data_origin"] == "synthetic_demo"
    assert sa["total_station_days_with_shortfall"] == 18244
    assert isinstance(sa["stations_with_current_alert"], list)

    # Hourly summary
    hs = data["hourly_summary"]
    assert hs["data_origin"] == "synthetic_demo"
    assert len(hs["stations_with_hourly_data"]) == 151
    assert "AMD001" in hs["stations_with_hourly_data"]
    assert hs["hourly_period_start"] == "2026-10-26"
    assert hs["hourly_period_end"] == "2026-11-24"

    # Data quality flags
    dq = data["data_quality_flags"]
    assert dq["verified_coordinates"] is True
    assert dq["real_sales_data"] is False
    assert dq["real_supply_data"] is False
    assert dq["holiday_data"] is True

    # Timestamp
    assert data["generated_at"].endswith("Z")


def test_stations_endpoint_all(client):
    """Verify GET /api/v1/stations returns all 151 verified Gujarat stations."""
    response = client.get("/api/v1/stations")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 151
    assert data["eligible_for_simulation"] == 151
    assert data["eligible_for_map_pin"] == 151
    assert data["map_availability"]["available"] is True

    stations = data["stations"]
    assert len(stations) == 151

    for s in stations:
        assert s["data_origin"] == "real_public"
        assert s["coordinates_verified"] is True
        assert s["eligible_for_map_pin"] is True
        assert isinstance(s["latitude"], float)
        assert isinstance(s["longitude"], float)
        assert s["brand"] != ""


def test_stations_endpoint_eligible_filter(client):
    """Verify GET /api/v1/stations?eligible_for_simulation=true returns 151 stations and excludes AMD010."""
    response = client.get("/api/v1/stations?eligible_for_simulation=true")
    assert response.status_code == 200
    data = response.json()

    stations = data["stations"]
    assert len(stations) == 151

    station_ids = [s["station_id"] for s in stations]
    assert "AMD010" not in station_ids
    for s in stations:
        assert s["in_study_area"] == "yes"
        assert s["eligible_for_simulation"] is True


def test_stations_endpoint_in_study_area_filter(client):
    """Verify in_study_area filter behaves correctly."""
    response = client.get("/api/v1/stations?in_study_area=uncertain")
    assert response.status_code == 200
    data = response.json()
    stations = data["stations"]
    assert len(stations) == 0


def test_station_history_success_daily(client):
    """Verify GET /api/v1/stations/AMD001/history returns full 1,059-day daily series."""
    response = client.get("/api/v1/stations/AMD001/history")
    assert response.status_code == 200
    data = response.json()

    assert data["station_id"] == "AMD001"
    assert data["station_name"] == "Visat Automobile"
    assert data["data_origin"] == "synthetic_demo"
    assert data["aggregation"] == "daily"
    assert data["date_range_start"] == "2024-01-01"
    assert data["date_range_end"] == "2026-11-24"
    assert data["total_records"] == 1059
    assert data["missing_records"] == 0
    assert data["missing_holiday_data"] is False
    assert len(data["series"]) == 1059

    first = data["series"][0]
    assert first["date"] == "2024-01-01"
    assert first["demand_kg"] > 0
    assert first["day_of_week"] == "Monday"
    assert first["is_weekend"] is False
    assert first["simulation_profile"] == "highway"


def test_station_history_date_range_filter(client):
    """Verify date range filtering on history endpoint."""
    response = client.get("/api/v1/stations/AMD001/history?start_date=2024-06-01&end_date=2024-06-30")
    assert response.status_code == 200
    data = response.json()

    assert data["total_records"] == 30
    assert len(data["series"]) == 30
    assert data["date_range_start"] == "2024-06-01"
    assert data["date_range_end"] == "2024-06-30"
    assert data["series"][0]["date"] == "2024-06-01"
    assert data["series"][-1]["date"] == "2024-06-30"


def test_station_history_weekly_aggregation(client):
    """Verify weekly aggregation returns aggregated weekly points."""
    response = client.get("/api/v1/stations/AMD001/history?aggregation=weekly")
    assert response.status_code == 200
    data = response.json()

    assert data["aggregation"] == "weekly"
    # ~152 calendar weeks in 1,059 days
    assert 150 <= data["total_records"] <= 155
    assert len(data["series"]) == data["total_records"]

    # Each point has positive aggregated demand
    for pt in data["series"]:
        assert pt["demand_kg"] > 0
        assert pt["day_of_week"] is None
        assert pt["is_weekend"] is None


def test_station_history_not_found_unknown_station(client):
    """Verify unknown station returns HTTP 404 with standard error schema (AT-A05)."""
    response = client.get("/api/v1/stations/AMD999/history")
    assert response.status_code == 404
    data = response.json()

    assert "error" in data
    assert data["error"]["code"] == "STATION_NOT_FOUND"
    assert "AMD999" in data["error"]["message"]


def test_station_history_excluded_station_amd010(client):
    """Verify AMD010 (excluded from verified 151-station inventory) returns HTTP 404."""
    response = client.get("/api/v1/stations/AMD010/history")
    assert response.status_code == 404
    data = response.json()

    assert "error" in data
    assert data["error"]["code"] == "STATION_NOT_FOUND"
    assert "AMD010" in data["error"]["message"]


def test_data_quality_endpoint(client):
    """Verify GET /api/v1/data-quality returns provenance, metrics, and all 8 gaps (AT-D05, AT-D06, AT-D10)."""
    response = client.get("/api/v1/data-quality")
    assert response.status_code == 200
    data = response.json()

    assert set(data.keys()) == {
        "generated_at",
        "station_inventory",
        "synthetic_data",
        "baseline_evaluation",
        "data_gaps",
    }

    # Station inventory quality
    inv = data["station_inventory"]
    assert inv["total_stations"] == 12
    assert inv["eligible_for_simulation"] == 11
    assert inv["eligible_for_map_pin"] == 11
    assert inv["data_origin"] == "real_public"
    assert len(inv["sources"]) == 2

    # Synthetic data metrics (AT-D05, AT-D06)
    synth = data["synthetic_data"]
    assert synth["daily_sales"]["rows"] == 8041
    assert synth["daily_sales"]["columns"] == 12
    assert synth["daily_sales"]["stations"] == 11
    assert synth["daily_sales"]["missing_holiday_rows"] == 8041
    assert synth["supply"]["rows"] == 8041
    assert synth["supply"]["columns"] == 5
    assert synth["hourly_demand"]["rows"] == 2160
    assert synth["hourly_demand"]["columns"] == 10
    assert synth["hourly_demand"]["stations"] == 3

    # Baseline evaluation
    base = data["baseline_evaluation"]
    assert base["model"] == "28-day rolling mean"
    assert base["evaluation_type"] == "chronological"
    assert base["mae_kg"] == 150.55
    assert base["rmse_kg"] == 189.69
    assert base["smape_pct"] == 11.41
    assert base["data_origin"] == "synthetic_demo"

    # Data gaps (AT-D10: at least 8 gaps)
    gaps = data["data_gaps"]
    assert len(gaps) >= 8
    gap_names = [g["gap"] for g in gaps]
    assert "Verified station coordinates" in gap_names
    assert "Actual station-level daily/hourly sales" in gap_names
    assert "Actual planned supply and delivery records" in gap_names
    assert "Ahmedabad-specific vehicle registrations" in gap_names
    assert "Official holiday calendar 2024-2025" in gap_names
    assert "Complete cross-operator station inventory" in gap_names
    assert "Verified Ahmedabad municipal boundary" in gap_names
    assert "Road/traffic/land-use indicators" in gap_names

