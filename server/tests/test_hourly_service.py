"""Tests for hourly demand service, profile retrieval, and reconciliation."""

import pytest


def test_hourly_demand_station_and_date_coverage(client):
    """Verify available stations and date range (AT-D07, AT-D08)."""
    response = client.get("/api/v1/hourly-demand")
    assert response.status_code == 200
    data = response.json()

    assert data["data_origin"] == "synthetic_demo"
    assert data["available_stations"] == ["AMD001", "AMD004", "AMD008"]
    assert data["period_start"] == "2025-12-02"
    assert data["period_end"] == "2025-12-31"
    assert data["total_records"] == 2160
    assert len(data["records"]) == 2160


def test_hourly_demand_single_station_and_date_24h(client):
    """Verify single station and date returns exactly 24 records (AT-H01)."""
    response = client.get("/api/v1/hourly-demand?station_id=AMD001&date=2025-12-15")
    assert response.status_code == 200
    data = response.json()

    assert data["total_records"] == 24
    records = data["records"]
    assert len(records) == 24

    hours = [r["hour"] for r in records]
    assert hours == list(range(24))

    for r in records:
        assert r["station_id"] == "AMD001"
        assert r["date"] == "2025-12-15"
        assert r["hourly_demand_kg"] > 0
        assert r["simulation_profile"] == "commuter_corridor"


def test_hourly_daily_reconciliation(client):
    """Verify hourly sum reconciles to daily sales within 0.011 kg (AT-H02)."""
    # 1. Fetch hourly sum for AMD001 on 2025-12-15
    h_resp = client.get("/api/v1/hourly-demand?station_id=AMD001&date=2025-12-15")
    assert h_resp.status_code == 200
    hourly_sum = sum(r["hourly_demand_kg"] for r in h_resp.json()["records"])

    # 2. Fetch daily history for AMD001
    d_resp = client.get("/api/v1/stations/AMD001/history?start_date=2025-12-15&end_date=2025-12-15")
    assert d_resp.status_code == 200
    daily_sales = d_resp.json()["series"][0]["demand_kg"]

    # Difference must be <= 0.011 kg
    diff = abs(hourly_sum - daily_sales)
    assert diff <= 0.011


def test_hourly_demand_unsupported_station_rejected(client):
    """Verify requesting station without hourly profile returns 422 VALIDATION_ERROR."""
    response = client.get("/api/v1/hourly-demand?station_id=AMD002")
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "AMD002" in data["error"]["message"]


def test_hourly_demand_out_of_range_date_rejected(client):
    """Verify requesting date outside 2025-12-02 to 2025-12-31 returns 422 VALIDATION_ERROR."""
    response = client.get("/api/v1/hourly-demand?date=2024-06-01")
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "2024-06-01" in data["error"]["message"]

