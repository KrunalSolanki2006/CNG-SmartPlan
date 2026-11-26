"""Tests for 151-station demand forecasting engine, 3-way split, endpoints, caching, and edge cases."""

import numpy as np
import pandas as pd
import pytest

from schemas.forecast import ForecastRequest
from services.forecast_service import ForecastService


def test_forecast_three_way_chronological_split(client):
    """Verify 3-way chronological Train / Validation / Final Evaluation split."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "horizon_days": 7},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["train_period"]["start"] == "2024-01-01"
    assert data["train_period"]["end"] == "2025-12-31"
    assert data["train_period"]["n_records"] == 731

    assert data["validation_period"]["start"] == "2026-01-01"
    assert data["validation_period"]["end"] == "2026-03-31"
    assert data["validation_period"]["n_records"] == 90

    assert data["test_period"]["start"] == "2026-04-01"
    assert data["test_period"]["end"] == "2026-11-24"
    assert data["test_period"]["n_records"] == 238

    assert data["validation_evaluation"] is not None
    assert data["validation_evaluation"]["model_mae_kg"] is not None


def test_station_specific_out_of_sample_metrics(client):
    """Verify out-of-sample metrics are computed per station and differ across stations."""
    r1 = client.get("/api/v1/forecast/AMD001/metrics")
    r2 = client.get("/api/v1/forecast/DISC_SUR_001/metrics")
    assert r1.status_code == 200
    assert r2.status_code == 200

    d1, d2 = r1.json(), r2.json()
    assert d1["final_evaluation"]["model_mae_kg"] is not None
    assert d1["final_evaluation"]["baseline_mae_kg"] is not None
    assert d1["final_evaluation"]["model_mae_kg"] != d2["final_evaluation"]["model_mae_kg"]


def test_forecast_horizons_7_14_30_and_dates_start_2026_11_25(client):
    """Verify 7, 14, and 30 day horizons begin on current IST date (>= 2026-11-25) after 2026-11-24 cutoff."""
    for h in [7, 14, 30]:
        response = client.get(f"/api/v1/forecast/AMD001?horizon_days={h}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["forecast"]) == h
        assert data["data_through_date"] == "2026-11-24"
        assert data["target_start_date"] == data["current_date"]
        assert data["target_start_date"] >= "2026-11-25"
        assert data["target_end_date"] == data["forecast"][-1]["date"]

        dates = [pt["date"] for pt in data["forecast"]]
        assert dates[0] > data["data_through_date"]
        for i in range(1, len(dates)):
            assert dates[i] > dates[i - 1]


def test_holt_winters_confidence_intervals_and_nonnegativity(client):
    """Verify Holt-Winters prediction intervals are aligned, ordered, and non-negative."""
    response = client.post(
        "/api/v1/forecast",
        json={"station_id": "AMD001", "model": "holt_winters", "horizon_days": 14},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["reliability"]["confidence_interval_available"] is True
    assert "prediction interval" in data["model_info"]["confidence_interval_method"].lower()
    assert "simulated" in data["model_info"]["confidence_interval_method"].lower()

    for pt in data["forecast"]:
        assert pt["lower_bound_kg"] is not None
        assert pt["upper_bound_kg"] is not None
        assert 0.0 <= pt["lower_bound_kg"] <= pt["forecast_demand_kg"] <= pt["upper_bound_kg"]


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


def test_configurable_cutoff_date_filtering(client):
    """Verify cutoff_date filters history without fabricating future points."""
    res = client.get("/api/v1/forecast/AMD001?horizon_days=7&cutoff_date=2025-12-31")
    assert res.status_code == 200
    data = res.json()
    assert data["data_through_date"] == "2025-12-31"
    assert data["target_start_date"] == "2026-01-01"
    assert data["data_freshness"] == "stale"


def test_all_six_forecast_endpoints(client):
    """Verify all 6 forecast GET endpoints return valid 200 responses."""
    r_st = client.get("/api/v1/forecast/stations")
    assert r_st.status_code == 200
    assert r_st.json()["total_eligible_stations"] == 151

    r_status = client.get("/api/v1/forecast/data-status")
    assert r_status.status_code == 200
    st_data = r_status.json()
    assert st_data["eligible_stations"] == 151
    assert st_data["data_through_date"] == "2026-11-24"
    assert st_data["total_historical_records"] == 159909

    r_hist = client.get("/api/v1/forecast/AMD001/history?start_date=2026-11-01&end_date=2026-11-24")
    assert r_hist.status_code == 200
    assert r_hist.json()["total_records"] == 24

    r_net = client.get("/api/v1/forecast/network/summary?horizon_days=7")
    assert r_net.status_code == 200
    net = r_net.json()
    assert net["eligible_stations"] == 151
    assert net["successfully_forecasted_stations"] == 151
    assert net["failed_stations"] == 0
    assert net["simulated_network_demand_kg_per_day"] > 0


def test_forecast_validation_and_error_codes(client):
    """Verify 422 and 404 error responses."""
    assert client.post("/api/v1/forecast", json={"station_id": "AMD001", "horizon_days": 999}).status_code == 422
    assert client.post("/api/v1/forecast", json={"station_id": "AMD999"}).status_code == 404
    assert client.post("/api/v1/forecast", json={"station_id": "AMD010"}).status_code == 404
    assert client.get("/api/v1/forecast/AMD001?cutoff_date=bad-date").status_code == 422


def test_audit_records_exclusions_and_insufficient_data(monkeypatch):
    """Verify dirty records are audited transparently and short series return insufficient_data."""
    rows = [
        {"station_id": "AMD001", "date": f"2026-10-{i + 1:02d}", "simulated_demand_kg": 1200.0 + i, "data_type": "synthetic", "is_public_holiday": False}
        for i in range(20)
    ]
    rows.append({"station_id": "AMD001", "date": "2026-10-20", "simulated_demand_kg": 1250.0, "data_type": "synthetic", "is_public_holiday": False})
    rows.append({"station_id": "AMD001", "date": "2026-10-21", "simulated_demand_kg": -10.0, "data_type": "synthetic", "is_public_holiday": False})
    rows.append({"station_id": "AMD001", "date": "bad-date", "simulated_demand_kg": 1000.0, "data_type": "synthetic", "is_public_holiday": False})

    dirty_df = pd.DataFrame(rows)
    stations_df = pd.DataFrame([{"station_id": "AMD001", "station_name": "Visat Automobile", "district": "Ahmedabad", "eligible_for_simulation": True}])

    class _MockStore:
        verified_gujarat_stations = stations_df
        gujarat_daily_demand_sales = dirty_df

    monkeypatch.setattr("services.forecast_service.get_data_store", lambda: _MockStore())
    ForecastService.invalidate_cache()
    res = ForecastService.generate_forecast(ForecastRequest(station_id="AMD001", horizon_days=7))

    assert res.forecast_status == "insufficient_data"
    assert res.forecast == []
    assert res.data_audit.total_raw_records == 23
    assert res.data_audit.valid_records == 20
    assert res.data_audit.excluded_records == 3


def test_negative_prediction_clamping_and_model_failure_isolation(monkeypatch):
    """Verify negative forecasts clamp to 0.0 and single-station failure does not crash network summary."""
    dates = pd.date_range("2026-08-01", "2026-11-24", freq="D").strftime("%Y-%m-%d").tolist()
    rows = []
    for sid in ["ST1", "ST2"]:
        for i, d in enumerate(dates):
            # Steep downward trend on ST1 to force negative raw linear extrapolation
            val = max(5.0, 400.0 - 3.4 * i) if sid == "ST1" else 1000.0 + (i % 7) * 20.0
            rows.append({
                "station_id": sid,
                "date": d,
                "simulated_demand_kg": val,
                "data_type": "synthetic",
                "is_public_holiday": False,
            })

    class _MockStore:
        verified_gujarat_stations = pd.DataFrame([
            {"station_id": "ST1", "station_name": "Drop Station", "district": "Ahmedabad", "eligible_for_simulation": True, "simulation_profile": "urban"},
            {"station_id": "ST2", "station_name": "Fail Station", "district": "Surat", "eligible_for_simulation": True, "simulation_profile": "urban"},
        ])
        gujarat_daily_demand_sales = pd.DataFrame(rows)

    monkeypatch.setattr("services.forecast_service.get_data_store", lambda: _MockStore())
    ForecastService.invalidate_cache()

    res1 = ForecastService.generate_forecast(ForecastRequest(station_id="ST1", horizon_days=7))
    assert all(pt.forecast_demand_kg >= 0.0 for pt in res1.forecast)

    # Simulate model exception on ST2 only
    orig_compute = ForecastService._compute_station_forecast

    def _failing_st2(*args, **kwargs):
        if kwargs["station_meta"]["station_id"] == "ST2":
            res = orig_compute(*args, **kwargs)
            res.forecast_status = "unavailable"
            res.forecast = []
            return res
        return orig_compute(*args, **kwargs)

    monkeypatch.setattr(ForecastService, "_compute_station_forecast", _failing_st2)
    ForecastService.invalidate_cache()

    net = ForecastService.get_network_summary(horizon_days=7)
    assert net.eligible_stations == 2
    assert net.successfully_forecasted_stations == 1
    assert net.failed_stations == 1
    assert "ST2" in net.failed_or_insufficient_station_ids
