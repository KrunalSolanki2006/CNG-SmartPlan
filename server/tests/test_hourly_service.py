"""Tests for 151-station hourly demand service, profile retrieval, and daily reconciliation."""


def test_hourly_demand_station_and_date_coverage(client):
    """Verify all 151 stations and 30-day trailing date range are exposed."""
    response = client.get("/api/v1/hourly-demand")
    assert response.status_code == 200
    data = response.json()

    assert data["data_origin"] == "synthetic_demo"
    assert len(data["available_stations"]) == 151
    assert "AMD001" in data["available_stations"]
    assert "DISC_SUR_001" in data["available_stations"]
    assert data["period_start"] == "2026-10-26"
    assert data["period_end"] == "2026-11-24"
    # Default unfiltered returns latest date (151 * 24 = 3,624 rows)
    assert data["total_records"] == 151 * 24


def test_hourly_demand_single_station_and_date_24h(client):
    """Verify any of the 151 stations returns exactly 24 hourly records for a valid date."""
    for sid in ["AMD001", "DISC_SUR_001"]:
        response = client.get(f"/api/v1/hourly-demand?station_id={sid}&date=2026-11-15")
        assert response.status_code == 200
        data = response.json()

        assert data["total_records"] == 24
        records = data["records"]
        assert len(records) == 24
        assert [r["hour"] for r in records] == list(range(24))
        for r in records:
            assert r["station_id"] == sid
            assert r["date"] == "2026-11-15"
            assert r["hourly_demand_kg"] > 0


def test_hourly_daily_reconciliation(client):
    """Verify hourly sum reconciles to daily simulated_demand_kg within 0.011 kg."""
    for sid in ["AMD001", "DISC_SUR_001"]:
        h_resp = client.get(f"/api/v1/hourly-demand?station_id={sid}&date=2026-11-15")
        assert h_resp.status_code == 200
        hourly_sum = sum(r["hourly_demand_kg"] for r in h_resp.json()["records"])

        d_resp = client.get(f"/api/v1/forecast/{sid}/history?start_date=2026-11-15&end_date=2026-11-15")
        assert d_resp.status_code == 200
        daily_demand = d_resp.json()["series"][0]["demand_kg"]

        assert abs(hourly_sum - daily_demand) <= 0.011


def test_hourly_demand_unsupported_station_rejected(client):
    """Verify requesting unknown station returns 422 VALIDATION_ERROR."""
    response = client.get("/api/v1/hourly-demand?station_id=AMD999")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_hourly_demand_out_of_range_date_rejected(client):
    """Verify requesting date before 2026-10-26 returns 422 VALIDATION_ERROR."""
    response = client.get("/api/v1/hourly-demand?date=2024-06-01")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_hourly_demand_current_date_projected_24h(client):
    """Verify requesting current/future IST date returns 24 projected hourly records."""
    from datetime import datetime, timedelta, timezone
    today_ist = datetime.now(timezone(timedelta(hours=5, minutes=30))).date().strftime("%Y-%m-%d")
    response = client.get(f"/api/v1/hourly-demand?station_id=AMD001&date={today_ist}")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 24
    assert [r["hour"] for r in data["records"]] == list(range(24))
    assert all(r["date"] == today_ist and r["hourly_demand_kg"] > 0 for r in data["records"])
