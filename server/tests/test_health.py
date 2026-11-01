"""Test suite for GET /api/v1/health endpoint."""

from datetime import datetime
import pytest


def test_health_endpoint_success(client):
    """Test health endpoint returns 200 and matches API_CONTRACT.md schema."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()

    # Field structure
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert data["timestamp"].endswith("Z")

    # Verify timestamp parses as valid ISO datetime
    dt_str = data["timestamp"][:-1] + "+00:00"
    parsed_dt = datetime.fromisoformat(dt_str)
    assert parsed_dt is not None

    # Exact data_loaded counts per acceptance test AT-A01
    loaded = data["data_loaded"]
    assert loaded["stations"] == 12
    assert loaded["eligible_stations"] == 11
    assert loaded["daily_sales_rows"] == 8041
    assert loaded["supply_rows"] == 8041
    assert loaded["hourly_rows"] == 2160


def test_health_endpoint_extra_fields_forbidden(client):
    """Verify extra unexpected fields are not returned."""
    response = client.get("/api/v1/health")
    data = response.json()
    assert set(data.keys()) == {"status", "timestamp", "data_loaded"}
    assert set(data["data_loaded"].keys()) == {
        "stations",
        "eligible_stations",
        "daily_sales_rows",
        "supply_rows",
        "hourly_rows",
    }

