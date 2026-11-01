"""Tests for demand forecasting service, chronological split, metrics, and models."""

import pytest
from schemas.forecast import ForecastRequest
from services.forecast_service import ForecastService


def test_forecast_chronological_split(client):
    """Verify chronological train/test split dates (AT-F01)."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "horizon_days": 7},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["train_period"]["end"] <= "2025-10-02"
    assert data["train_period"]["n_records"] == 641
    assert data["test_period"]["start"] == "2025-10-03"
    assert data["test_period"]["end"] == "2025-12-31"
    assert data["test_period"]["n_records"] == 90


def test_baseline_metrics_match_validated_results(client):
    """Verify baseline evaluation metrics match pre-validated benchmark (AT-F02)."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "model": "rolling_mean_baseline"},
    )
    assert response.status_code == 200
    data = response.json()

    eval_data = data["evaluation"]
    assert eval_data["baseline_model"] == "rolling_mean_28d"
    assert abs(eval_data["baseline_mae_kg"] - 150.55) < 1.0
    assert abs(eval_data["baseline_rmse_kg"] - 189.69) < 2.0
    assert abs(eval_data["baseline_smape_pct"] - 11.41) < 0.5


def test_forecast_horizon_lengths_and_dates_ascending(client):
    """Verify forecast horizons and strictly ascending future dates (AT-F03, AT-F04)."""
    for h in [1, 7, 14, 30]:
        response = client.post(
            "/api/v1/forecast",
            json={"station_id": "AMD001", "horizon_days": h},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["forecast"]) == h

        # Check strictly ascending dates starting 2026-01-01
        dates = [pt["date"] for pt in data["forecast"]]
        assert dates[0] == "2026-01-01"
        for i in range(1, len(dates)):
            assert dates[i] > dates[i - 1]


def test_holt_winters_confidence_intervals(client):
    """Verify Holt-Winters returns valid prediction intervals."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "model": "holt_winters", "horizon_days": 7},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["reliability"]["confidence_interval_available"] is True
    assert data["model_used"] == "holt_winters"

    for pt in data["forecast"]:
        assert pt["lower_bound_kg"] is not None
        assert pt["upper_bound_kg"] is not None
        assert pt["lower_bound_kg"] <= pt["forecast_demand_kg"] <= pt["upper_bound_kg"]
        assert pt["lower_bound_kg"] >= 0.0


def test_rolling_mean_has_null_confidence_intervals(client):
    """Verify rolling mean baseline returns null for prediction intervals."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "model": "rolling_mean_baseline", "horizon_days": 7},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["reliability"]["confidence_interval_available"] is False
    for pt in data["forecast"]:
        assert pt["lower_bound_kg"] is None
        assert pt["upper_bound_kg"] is None


def test_synthetic_disclaimers_present(client):
    """Verify synthetic disclaimers are prominently included (AT-F05)."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["data_origin"] == "synthetic_demo"
    assert "synthetic" in data["reliability"]["evaluation_note"].lower()
    assert any("synthetic" in lim.lower() for lim in data["limitations"])


def test_forecast_invalid_horizon_rejected(client):
    """Verify out-of-range horizon is rejected with 422 VALIDATION_ERROR (AT-A06)."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "horizon_days": 999},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"

    response_zero = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "horizon_days": 0},
    )
    assert response_zero.status_code == 422


def test_forecast_unknown_station_rejected(client):
    """Verify unknown station returns 404 STATION_NOT_FOUND."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD999"},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "STATION_NOT_FOUND"


def test_forecast_excluded_station_rejected(client):
    """Verify AMD010 (excluded from simulation) returns 404 STATION_NOT_FOUND."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD010"},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "STATION_NOT_FOUND"

