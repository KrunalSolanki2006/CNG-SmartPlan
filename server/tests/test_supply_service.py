"""Tests for supply check service, shortfall formula, and date matching."""

import pytest


def test_supply_check_post_2025_handling(client):
    """Verify forecast dates beyond 2025-12-31 return null supply and warnings (AT-S03)."""
    response = client.post(
        "/api/v1/supply-check",
        json={"station_id": "AMD001", "horizon_days": 7},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["station_id"] == "AMD001"
    assert data["data_origin"] == "synthetic_demo"
    assert len(data["comparison"]) == 7

    # Since all forecast dates are in 2026-01-01+, without user overrides planned supply must be null
    for pt in data["comparison"]:
        assert pt["planned_supply_kg"] is None
        assert pt["potential_shortfall_kg"] is None
        assert pt["has_shortfall"] is None

    assert any("Synthetic supply covers only 2024-01-01 to 2025-12-31" in w for w in data["warnings"])
    assert any("potential planning shortfalls" in w for w in data["warnings"])


def test_supply_check_user_overrides_and_formula(client):
    """Verify user overrides are respected and shortfall formula is verified (AT-S01, AT-S04)."""
    overrides = [
        {"date": "2026-01-01", "supply_kg": 1000.0},
        {"date": "2026-01-02", "supply_kg": 3000.0},
    ]
    response = client.post(
        "/api/v1/supply-check",
        json={
            "station_id": "AMD001",
            "horizon_days": 3,
            "user_supply_overrides": overrides,
        },
    )
    assert response.status_code == 200
    data = response.json()

    comp = data["comparison"]
    assert len(comp) == 3

    # Date 1: demand ~1700, supply 1000 -> shortfall > 0
    pt1 = comp[0]
    assert pt1["date"] == "2026-01-01"
    assert pt1["planned_supply_kg"] == 1000.0
    assert pt1["supply_data_origin"] == "user_entered_scenario"
    expected_shortfall = round(max(0.0, pt1["forecast_demand_kg"] - 1000.0), 1)
    assert abs(pt1["potential_shortfall_kg"] - expected_shortfall) < 0.01
    assert pt1["has_shortfall"] is True

    # Date 2: supply 3000 -> surplus -> shortfall == 0.0
    pt2 = comp[1]
    assert pt2["date"] == "2026-01-02"
    assert pt2["planned_supply_kg"] == 3000.0
    assert pt2["supply_data_origin"] == "user_entered_scenario"
    assert pt2["potential_shortfall_kg"] == 0.0
    assert pt2["has_shortfall"] is False

    # Date 3: no override provided -> null
    pt3 = comp[2]
    assert pt3["date"] == "2026-01-03"
    assert pt3["planned_supply_kg"] is None
    assert pt3["potential_shortfall_kg"] is None
    assert pt3["has_shortfall"] is None


def test_supply_check_summary_aggregation(client):
    """Verify summary metrics correctly aggregate over comparison points."""
    overrides = [
        {"date": "2026-01-01", "supply_kg": 500.0},
        {"date": "2026-01-02", "supply_kg": 600.0},
        {"date": "2026-01-03", "supply_kg": 5000.0},
    ]
    response = client.post(
        "/api/v1/supply-check",
        json={
            "station_id": "AMD001",
            "horizon_days": 3,
            "user_supply_overrides": overrides,
        },
    )
    assert response.status_code == 200
    data = response.json()
    summary = data["summary"]

    assert summary["days_with_shortfall"] == 2
    assert summary["max_shortfall_kg"] > 0
    assert summary["total_shortfall_kg"] > 0


def test_supply_check_invalid_station_rejected(client):
    """Verify unknown station returns 404."""
    response = client.post(
        "/api/v1/supply-check",
        json={"station_id": "AMD999"},
    )
    assert response.status_code == 404

