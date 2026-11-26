"""Forecasting service implementing station-wise Holt-Winters, 28-day rolling baseline,
3-way chronological validation, dataset-versioned caching, and network aggregation.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import hashlib
from pathlib import Path
import threading
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from config import settings
from schemas.forecast import (
    DataAuditSummary,
    ExclusionRecord,
    ForecastDataStatusResponse,
    ForecastEvaluation,
    ForecastHistoryResponse,
    ForecastMetricsResponse,
    ForecastPoint,
    ForecastReliability,
    ForecastRequest,
    ForecastResponse,
    ForecastStationSummaryItem,
    ForecastStationsListResponse,
    FreshnessPolicy,
    HistoricalContextPoint,
    ModelInfo,
    NetworkEvaluationSummary,
    NetworkForecastSummaryResponse,
    NetworkStationForecastSummary,
    TestPeriod,
    TrainPeriod,
    ValidationPeriod,
)
from services.data_loader import get_data_store
from services.station_service import StationService

MODEL_VERSION = "2.0.0"
IST_TZ = timezone(timedelta(hours=5, minutes=30))

FRESHNESS_MAX_AGE_DAYS = 14
MIN_TRAIN_RECORDS = 28
MIN_TEST_RECORDS = 7
MIN_TOTAL_RECORDS = MIN_TRAIN_RECORDS + MIN_TEST_RECORDS  # 35 valid daily records
RECENT_BASELINE_WINDOW_DAYS = 30
TREND_THRESHOLD_PCT = 2.0


def _compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Tuple[float, float, float]:
    """Compute MAE, RMSE, and sMAPE (%) on aligned arrays."""
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    denom = np.abs(y_true) + np.abs(y_pred)
    smape = float(100.0 * np.mean(np.where(denom > 0, 2.0 * np.abs(y_true - y_pred) / denom, 0.0)))
    return round(mae, 2), round(rmse, 2), round(smape, 2)


def _rolling_mean_eval(full_sales: np.ndarray, start_idx: int, end_idx: int) -> Tuple[float, float, float]:
    """Evaluate 28-day rolling mean out-of-sample over [start_idx, end_idx)."""
    preds = np.array(
        [float(np.mean(full_sales[max(0, idx - 28) : idx])) for idx in range(start_idx, end_idx)],
        dtype=float,
    )
    actuals = full_sales[start_idx:end_idx]
    return _compute_metrics(actuals, preds)


class ForecastService:
    """Thread-safe, cached station-level and network-level CNG demand forecasting service."""

    _lock = threading.RLock()
    _forecast_cache: Dict[Tuple[Any, ...], ForecastResponse] = {}
    _network_cache: Dict[Tuple[Any, ...], NetworkForecastSummaryResponse] = {}
    _station_series_cache: Dict[Tuple[Any, ...], pd.DataFrame] = {}

    @classmethod
    def invalidate_cache(cls) -> None:
        """Clear all cached forecasts and network summaries."""
        with cls._lock:
            cls._forecast_cache.clear()
            cls._network_cache.clear()
            cls._station_series_cache.clear()

    @staticmethod
    def _current_local_date() -> date:
        if settings.forecast_reference_date:
            return datetime.strptime(settings.forecast_reference_date, "%Y-%m-%d").date()
        return datetime.now(IST_TZ).date()

    @staticmethod
    def _resolve_cutoff(cutoff_date: Optional[str]) -> Optional[str]:
        effective = cutoff_date if cutoff_date is not None else settings.forecast_simulation_cutoff
        if effective is not None:
            try:
                datetime.strptime(effective, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={
                        "code": "VALIDATION_ERROR",
                        "message": f"Invalid cutoff_date '{effective}'. Expected YYYY-MM-DD.",
                        "fields": {"cutoff_date": ["Expected YYYY-MM-DD format"]},
                    },
                )
        return effective

    @staticmethod
    def _get_station_and_sales_sources(store: Any) -> Tuple[pd.DataFrame, pd.DataFrame, str]:
        """Select 151-station Gujarat foundation when loaded, else fall back to baseline DataStore."""
        has_151 = (
            getattr(store, "verified_gujarat_stations", None) is not None
            and getattr(store, "gujarat_daily_demand_sales", None) is not None
        )
        if has_151:
            return store.verified_gujarat_stations, store.gujarat_daily_demand_sales, "simulated_demand_kg"
        stations_df = getattr(store, "stations", pd.DataFrame())
        daily_df = getattr(store, "daily_sales", pd.DataFrame())
        sales_col = "synthetic_sales_kg" if "synthetic_sales_kg" in daily_df.columns else "simulated_demand_kg"
        return stations_df, daily_df, sales_col

    @classmethod
    def _get_station_df(cls, fp: Tuple[Any, ...], daily_df: pd.DataFrame, station_id: str) -> pd.DataFrame:
        with cls._lock:
            if fp not in cls._station_series_cache:
                cls._station_series_cache.clear()
                if not daily_df.empty and "station_id" in daily_df.columns:
                    for sid, grp in daily_df.groupby("station_id", sort=False):
                        cls._station_series_cache[(fp, str(sid))] = grp.copy()
                cls._station_series_cache[fp] = pd.DataFrame()
            return cls._station_series_cache.get((fp, station_id), pd.DataFrame()).copy()

    @classmethod
    def _dataset_fingerprint(cls, store: Any, daily_df: pd.DataFrame) -> Tuple[Any, ...]:
        max_date = str(daily_df["date"].max()) if not daily_df.empty and "date" in daily_df.columns else ""
        return (id(store), id(daily_df), len(daily_df), max_date)

    @classmethod
    def _disk_fingerprint(cls, daily_df: pd.DataFrame) -> Tuple[Any, ...]:
        """Deterministic process-independent fingerprint for disk caches."""
        if daily_df.empty:
            return (0, "", "", 0)
        min_date = str(daily_df["date"].min()) if "date" in daily_df.columns else ""
        max_date = str(daily_df["date"].max()) if "date" in daily_df.columns else ""
        n_stations = int(daily_df["station_id"].nunique()) if "station_id" in daily_df.columns else 0
        return (len(daily_df), min_date, max_date, n_stations)

    @classmethod
    def _get_station_meta(cls, station_id: str, stations_df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        if not stations_df.empty and "station_id" in stations_df.columns:
            match = stations_df[stations_df["station_id"] == station_id]
            if not match.empty:
                row = match.iloc[0]
                in_study = str(row.get("in_study_area", "yes")).strip().lower()
                elig_raw = row.get("eligible_for_simulation", in_study == "yes")
                elig = str(elig_raw).strip().lower() in ("true", "1", "yes")
                return {
                    "station_id": str(row["station_id"]),
                    "station_name": str(row.get("station_name", station_id)),
                    "district": str(row.get("district", "Ahmedabad")),
                    "city": str(row.get("city", "Ahmedabad")),
                    "operator": str(row.get("operator", "not_established")),
                    "simulation_profile": str(row.get("simulation_profile", "general")),
                    "in_study_area": in_study,
                    "eligible_for_simulation": elig,
                }
        return StationService.get_station_by_id(station_id)

    @staticmethod
    def _audit_and_prepare_station_series(
        station_df: pd.DataFrame,
        sales_col: str,
        cutoff_date: Optional[str] = None,
    ) -> Tuple[pd.DataFrame, DataAuditSummary, str]:
        """Audit raw station daily rows, apply optional cutoff without fabrication, and record exclusions."""
        total_raw = len(station_df)
        exclusion_reasons: List[ExclusionRecord] = []

        if total_raw == 0:
            audit = DataAuditSummary(
                earliest_date=None,
                latest_date=None,
                total_raw_records=0,
                valid_records=0,
                excluded_records=0,
                duplicate_records=0,
                invalid_or_negative_records=0,
                missing_dates_in_range=0,
                provenance_counts={},
                exclusion_reasons=[],
            )
            return pd.DataFrame(), audit, "unavailable"

        df = station_df.copy()

        # 1. Validate dates
        df["parsed_date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")
        invalid_date_mask = df["parsed_date"].isna()
        invalid_date_count = int(invalid_date_mask.sum())
        if invalid_date_count > 0:
            exclusion_reasons.append(ExclusionRecord(reason="invalid_date_format", count=invalid_date_count))
        df = df[~invalid_date_mask].copy()

        # Optional simulation cutoff filter
        if cutoff_date is not None and not df.empty:
            cutoff_dt = pd.to_datetime(cutoff_date, format="%Y-%m-%d")
            post_cutoff_mask = df["parsed_date"] > cutoff_dt
            post_count = int(post_cutoff_mask.sum())
            if post_count > 0:
                exclusion_reasons.append(ExclusionRecord(reason=f"after_simulation_cutoff_{cutoff_date}", count=post_count))
                df = df[~post_cutoff_mask].copy()

        # 2. Validate numeric non-negative demand/sales
        col = sales_col if sales_col in df.columns else ("synthetic_sales_kg" if "synthetic_sales_kg" in df.columns else "sales_kg")
        df["sales_numeric"] = pd.to_numeric(df[col], errors="coerce")
        invalid_sales_mask = df["sales_numeric"].isna() | ~np.isfinite(df["sales_numeric"]) | (df["sales_numeric"] < 0)
        invalid_sales_count = int(invalid_sales_mask.sum())
        if invalid_sales_count > 0:
            exclusion_reasons.append(
                ExclusionRecord(reason="missing_nonfinite_or_negative_values", count=invalid_sales_count)
            )
        df = df[~invalid_sales_mask].copy()

        # 3. Sort chronologically and resolve duplicates
        df = df.sort_values("parsed_date").reset_index(drop=True)
        dup_mask = df.duplicated(subset=["parsed_date"], keep="last")
        dup_count = int(dup_mask.sum())
        if dup_count > 0:
            exclusion_reasons.append(ExclusionRecord(reason="duplicate_station_date", count=dup_count))
            df = df[~dup_mask].reset_index(drop=True)

        valid_count = len(df)
        excluded_count = total_raw - valid_count

        if valid_count == 0:
            audit = DataAuditSummary(
                earliest_date=None,
                latest_date=None,
                total_raw_records=total_raw,
                valid_records=0,
                excluded_records=excluded_count,
                duplicate_records=dup_count,
                invalid_or_negative_records=invalid_date_count + invalid_sales_count,
                missing_dates_in_range=0,
                provenance_counts={},
                exclusion_reasons=exclusion_reasons,
            )
            return df, audit, "unavailable"

        earliest_dt = df["parsed_date"].min()
        latest_dt = df["parsed_date"].max()
        expected_span = int((latest_dt - earliest_dt).days) + 1
        missing_dates = max(0, expected_span - valid_count)

        if "data_type" in df.columns:
            raw_prov = df["data_type"].fillna("unknown").astype(str).value_counts().to_dict()
        else:
            raw_prov = {"unknown": valid_count}
        provenance_counts = {str(k): int(v) for k, v in raw_prov.items()}

        prov_keys = set(provenance_counts.keys())
        if prov_keys == {"synthetic"}:
            data_origin = "synthetic_demo"
        elif prov_keys.issubset({"real", "real_public", "actual", "verified"}):
            data_origin = "real_public"
        elif "synthetic" in prov_keys and len(prov_keys) > 1:
            data_origin = "mixed_real_and_synthetic"
        else:
            data_origin = "synthetic_demo" if "synthetic" in prov_keys else "unknown"

        audit = DataAuditSummary(
            earliest_date=earliest_dt.strftime("%Y-%m-%d"),
            latest_date=latest_dt.strftime("%Y-%m-%d"),
            total_raw_records=total_raw,
            valid_records=valid_count,
            excluded_records=excluded_count,
            duplicate_records=dup_count,
            invalid_or_negative_records=invalid_date_count + invalid_sales_count,
            missing_dates_in_range=missing_dates,
            provenance_counts=provenance_counts,
            exclusion_reasons=exclusion_reasons,
        )
        return df, audit, data_origin

    @staticmethod
    def _compute_three_way_split(valid_df: pd.DataFrame) -> Tuple[int, Optional[int], int]:
        """Return (val_start_idx, test_start_idx) or (train_end_idx, val_end_idx).
        For 2024-01-01..2026-11-24 series:
          Train: <= 2025-12-31
          Validation: 2026-01-01 to 2026-03-31
          Final Eval (Test): >= 2026-04-01
        Falls back dynamically for shorter/custom series.
        """
        dates = valid_df["parsed_date"]
        n = len(valid_df)
        has_2026_split = (
            (dates <= pd.Timestamp("2025-12-31")).sum() >= MIN_TRAIN_RECORDS
            and ((dates >= pd.Timestamp("2026-01-01")) & (dates <= pd.Timestamp("2026-03-31"))).sum() >= 7
            and (dates >= pd.Timestamp("2026-04-01")).sum() >= 7
        )
        if has_2026_split:
            val_start = int((dates <= pd.Timestamp("2025-12-31")).sum())
            test_start = int((dates <= pd.Timestamp("2026-03-31")).sum())
            return val_start, test_start, n

        # Proportional 70 / 15 / 15 fallback
        test_days = max(MIN_TEST_RECORDS, min(90, int(round(n * 0.15))))
        val_days = max(7, min(90, int(round(n * 0.15)))) if n >= 60 else 0
        if n - test_days - val_days < MIN_TRAIN_RECORDS:
            val_days = 0
            test_days = min(test_days, n - MIN_TRAIN_RECORDS)
        val_start = n - test_days - val_days
        test_start = n - test_days
        return val_start, (test_start if val_days > 0 else None), n

    @classmethod
    def generate_forecast(
        cls,
        request: ForecastRequest,
        cutoff_date: Optional[str] = None,
    ) -> ForecastResponse:
        """Generate or retrieve cached station-level forecast."""
        station_id = request.station_id
        horizon = request.horizon_days
        model_choice = request.model
        include_baseline = request.include_baseline
        effective_cutoff = cls._resolve_cutoff(cutoff_date or request.cutoff_date)

        store = get_data_store()
        stations_df, daily_df, sales_col = cls._get_station_and_sales_sources(store)

        station_meta = cls._get_station_meta(station_id, stations_df)
        if not station_meta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": f"No station with ID {station_id} exists in the inventory.",
                    "fields": None,
                },
            )

        if not station_meta["eligible_for_simulation"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": (
                        f"Station {station_id} is excluded from forecasting "
                        f"(in_study_area={station_meta.get('in_study_area')})."
                    ),
                    "fields": None,
                },
            )

        fp = cls._dataset_fingerprint(store, daily_df)
        ref_date_str = cls._current_local_date().strftime("%Y-%m-%d")
        cache_key = (fp, effective_cutoff, ref_date_str, station_id, horizon, model_choice, include_baseline)

        with cls._lock:
            if cache_key in cls._forecast_cache:
                return cls._forecast_cache[cache_key]

        raw_station_df = cls._get_station_df(fp, daily_df, station_id)
        if raw_station_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": f"No historical sales/demand data found for station {station_id}.",
                    "fields": None,
                },
            )

        result = cls._compute_station_forecast(
            station_meta=station_meta,
            raw_station_df=raw_station_df,
            sales_col=sales_col,
            horizon=horizon,
            model_choice=model_choice,
            include_baseline=include_baseline,
            effective_cutoff=effective_cutoff,
        )

        with cls._lock:
            cls._forecast_cache[cache_key] = result
        return result

    @classmethod
    def _compute_station_forecast(
        cls,
        station_meta: Dict[str, Any],
        raw_station_df: pd.DataFrame,
        sales_col: str,
        horizon: int,
        model_choice: str,
        include_baseline: bool,
        effective_cutoff: Optional[str],
    ) -> ForecastResponse:
        station_id = station_meta["station_id"]
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        current_local_date = cls._current_local_date()
        current_date_str = current_local_date.strftime("%Y-%m-%d")

        valid_df, audit, data_origin = cls._audit_and_prepare_station_series(
            raw_station_df, sales_col=sales_col, cutoff_date=effective_cutoff
        )
        is_simulated = data_origin == "synthetic_demo" or "synthetic" in audit.provenance_counts

        missing_holiday_data = True
        if "is_public_holiday" in valid_df.columns and not valid_df.empty:
            non_blank_holidays = valid_df["is_public_holiday"].notna() & (
                valid_df["is_public_holiday"].astype(str).str.strip() != ""
            )
            missing_holiday_data = not bool(non_blank_holidays.any())

        if audit.latest_date is not None:
            latest_hist_date = datetime.strptime(audit.latest_date, "%Y-%m-%d").date()
            data_age_days = (current_local_date - latest_hist_date).days
            is_stale = data_age_days > FRESHNESS_MAX_AGE_DAYS
            data_freshness = "stale" if is_stale else "current"
            is_historical_replay = data_age_days > 1
        else:
            latest_hist_date = None
            data_age_days = None
            is_stale = True
            data_freshness = "unavailable"
            is_historical_replay = True

        freshness_policy = FreshnessPolicy(
            max_age_days_for_current=FRESHNESS_MAX_AGE_DAYS,
            data_age_days=data_age_days,
            is_stale=is_stale,
            is_simulated=is_simulated,
            policy_note=(
                f"Historical data ends {audit.latest_date} ({data_age_days} days before {current_date_str}). "
                f"Data older than {FRESHNESS_MAX_AGE_DAYS} days is marked stale."
                if audit.latest_date is not None and data_age_days is not None and is_stale
                else (
                    f"Historical data ends {audit.latest_date} ({data_age_days} day(s) before {current_date_str}; within {FRESHNESS_MAX_AGE_DAYS}-day freshness policy)."
                    if audit.latest_date is not None and data_age_days is not None
                    else "No valid historical dates available."
                )
            ),
        )

        hist_context_df = valid_df.tail(RECENT_BASELINE_WINDOW_DAYS)
        historical_context = [
            HistoricalContextPoint(
                date=row["parsed_date"].strftime("%Y-%m-%d"),
                demand_kg=round(float(row["sales_numeric"]), 2),
                day_of_week=row["parsed_date"].day_name(),
                is_weekend=bool(row["parsed_date"].dayofweek >= 5),
                data_type=str(row.get("data_type", "unknown")),
            )
            for _, row in hist_context_df.iterrows()
        ]

        historical_avg_demand_kg = round(float(valid_df["sales_numeric"].mean()), 1) if not valid_df.empty else None
        historical_recent_avg_kg = round(float(hist_context_df["sales_numeric"].mean()), 1) if not hist_context_df.empty else None

        model_info = ModelInfo(
            model_id=model_choice,
            model_name=(
                "Holt-Winters Additive Exponential Smoothing (7-Day Seasonality)"
                if model_choice == "holt_winters"
                else "28-Day Rolling Mean Baseline"
            ),
            model_version=MODEL_VERSION,
            seasonal_period_days=7 if model_choice == "holt_winters" else None,
            confidence_interval_method=(
                "Simulated 95% residual prediction interval (±1.96 * SE_h, clamped >= 0; not proof of real-world accuracy)"
                if model_choice == "holt_winters"
                else None
            ),
            parameters_note=(
                "Additive trend and 7-day weekly seasonality fitted on valid historical demand; out-of-sample chronological validation."
                if model_choice == "holt_winters"
                else "Trailing 28-day arithmetic mean of valid historical daily demand."
            ),
        )

        limitations = [
            "All historical demand/sales records are synthetic (Python-generated simulation; no real station meter data)."
            if is_simulated
            else "Forecast relies solely on historical daily records without external price covariates.",
            "Holiday and regional event effects are unassigned in the dataset."
            if missing_holiday_data
            else "Simulated demand incorporates Gujarat public holiday and festival calendar flags.",
            "Simulated prediction intervals reflect historical residual variance under stationarity, not real-world accuracy.",
        ]
        if is_stale and audit.latest_date is not None:
            limitations.insert(
                0,
                f"Historical data is outdated: latest available record is {audit.latest_date} "
                f"({data_age_days} days before {current_date_str}).",
            )
        if audit.excluded_records > 0:
            limitations.append(
                f"{audit.excluded_records} raw record(s) excluded during data audit "
                f"({', '.join(f'{r.reason}: {r.count}' for r in audit.exclusion_reasons)})."
            )
        if audit.missing_dates_in_range > 0:
            limitations.append(
                f"{audit.missing_dates_in_range} calendar date(s) missing between {audit.earliest_date} and {audit.latest_date}; missing records are never fabricated."
            )

        # Guard: Empty or insufficient history
        if valid_df.empty:
            return ForecastResponse(
                station_id=station_id,
                station_name=station_meta["station_name"],
                model_used=model_choice,
                model_version=MODEL_VERSION,
                data_origin=data_origin,
                horizon_days=horizon,
                forecast_generated_at=now_utc,
                current_date=current_date_str,
                data_age_days=None,
                forecast_status="unavailable",
                data_freshness="unavailable",
                forecast_origin_date=None,
                data_through_date=None,
                target_start_date=None,
                target_end_date=None,
                is_historical_replay=True,
                historical_demo_notice="Forecasting unavailable: no valid historical records remain after data quality audit.",
                historical_avg_demand_kg=None,
                historical_recent_avg_kg=None,
                forecast_avg_demand_kg=None,
                demand_trend="unavailable",
                trend_change_pct=None,
                key_insight="Forecast unavailable because no valid historical records exist for this station.",
                train_period=TrainPeriod(start=None, end=None, n_records=0),
                validation_period=None,
                test_period=TestPeriod(start=None, end=None, n_records=0),
                validation_evaluation=None,
                evaluation=ForecastEvaluation(note="Validation unavailable: no valid historical records."),
                model_info=model_info,
                freshness_policy=freshness_policy,
                data_audit=audit,
                historical_context=[],
                forecast=[],
                baseline_forecast=[],
                reliability=ForecastReliability(
                    data_source=data_origin,
                    history_days=0,
                    missing_values=audit.missing_dates_in_range,
                    missing_holiday_data=missing_holiday_data,
                    confidence_interval_available=False,
                    evaluation_note="Insufficient valid records for forecasting.",
                ),
                limitations=limitations,
            )

        if audit.valid_records < MIN_TOTAL_RECORDS:
            return ForecastResponse(
                station_id=station_id,
                station_name=station_meta["station_name"],
                model_used=model_choice,
                model_version=MODEL_VERSION,
                data_origin=data_origin,
                horizon_days=horizon,
                forecast_generated_at=now_utc,
                current_date=current_date_str,
                data_age_days=data_age_days,
                forecast_status="insufficient_data",
                data_freshness=data_freshness,
                forecast_origin_date=audit.latest_date,
                data_through_date=audit.latest_date,
                target_start_date=None,
                target_end_date=None,
                is_historical_replay=is_historical_replay,
                historical_demo_notice=(
                    f"Insufficient historical data ({audit.valid_records} valid days; minimum {MIN_TOTAL_RECORDS} required)."
                ),
                historical_avg_demand_kg=historical_avg_demand_kg,
                historical_recent_avg_kg=historical_recent_avg_kg,
                forecast_avg_demand_kg=None,
                demand_trend="unavailable",
                trend_change_pct=None,
                key_insight=(
                    f"Insufficient historical data for {station_meta['station_name']} "
                    f"({audit.valid_records} valid days available, minimum {MIN_TOTAL_RECORDS} required). "
                    "No prediction was manufactured."
                ),
                train_period=TrainPeriod(start=audit.earliest_date, end=audit.latest_date, n_records=audit.valid_records),
                validation_period=None,
                test_period=TestPeriod(start=None, end=None, n_records=0),
                validation_evaluation=None,
                evaluation=ForecastEvaluation(
                    note=f"Insufficient data ({audit.valid_records} < {MIN_TOTAL_RECORDS} days) for out-of-sample holdout validation.",
                ),
                model_info=model_info,
                freshness_policy=freshness_policy,
                data_audit=audit,
                historical_context=historical_context,
                forecast=[],
                baseline_forecast=[],
                reliability=ForecastReliability(
                    data_source=data_origin,
                    history_days=audit.valid_records,
                    missing_values=audit.missing_dates_in_range,
                    missing_holiday_data=missing_holiday_data,
                    confidence_interval_available=False,
                    evaluation_note=f"Insufficient valid history ({audit.valid_records} days); forecast withheld.",
                ),
                limitations=limitations,
            )

        # 3-way chronological split: Train / Validation / Final Evaluation (Test)
        val_start_idx, test_start_idx, n_valid = cls._compute_three_way_split(valid_df)
        full_sales = valid_df["sales_numeric"].to_numpy(dtype=float)

        train_df = valid_df.iloc[:val_start_idx]
        train_start = train_df["parsed_date"].iloc[0].strftime("%Y-%m-%d")
        train_end = train_df["parsed_date"].iloc[-1].strftime("%Y-%m-%d")
        train_period = TrainPeriod(start=train_start, end=train_end, n_records=len(train_df))

        validation_period: Optional[ValidationPeriod] = None
        validation_eval: Optional[ForecastEvaluation] = None

        if test_start_idx is not None:
            val_df = valid_df.iloc[val_start_idx:test_start_idx]
            test_df = valid_df.iloc[test_start_idx:]
            val_start = val_df["parsed_date"].iloc[0].strftime("%Y-%m-%d")
            val_end = val_df["parsed_date"].iloc[-1].strftime("%Y-%m-%d")
            validation_period = ValidationPeriod(start=val_start, end=val_end, n_records=len(val_df))
            fit_for_test_end_idx = test_start_idx
        else:
            val_df = pd.DataFrame()
            test_df = valid_df.iloc[val_start_idx:]
            fit_for_test_end_idx = val_start_idx

        test_start = test_df["parsed_date"].iloc[0].strftime("%Y-%m-%d")
        test_end = test_df["parsed_date"].iloc[-1].strftime("%Y-%m-%d")
        test_period = TestPeriod(start=test_start, end=test_end, n_records=len(test_df))

        # Baseline out-of-sample metrics on validation and final evaluation windows
        base_test_mae, base_test_rmse, base_test_smape = _rolling_mean_eval(full_sales, fit_for_test_end_idx, n_valid)
        if not val_df.empty and test_start_idx is not None:
            base_val_mae, base_val_rmse, base_val_smape = _rolling_mean_eval(full_sales, val_start_idx, test_start_idx)
        else:
            base_val_mae = base_val_rmse = base_val_smape = None

        if effective_cutoff is None:
            forecast_start_date = max(latest_hist_date + timedelta(days=1), current_local_date)
        else:
            forecast_start_date = latest_hist_date + timedelta(days=1)

        offset_days = max(0, (forecast_start_date - (latest_hist_date + timedelta(days=1))).days)
        total_steps = offset_days + horizon

        future_dates = [
            (forecast_start_date + timedelta(days=j)).strftime("%Y-%m-%d")
            for j in range(horizon)
        ]

        model_mae: Optional[float] = None
        model_rmse: Optional[float] = None
        model_smape: Optional[float] = None
        val_model_mae: Optional[float] = None
        val_model_rmse: Optional[float] = None
        val_model_smape: Optional[float] = None
        forecast_points: List[ForecastPoint] = []
        conf_int_available = False
        clamped_negative = False

        if model_choice == "holt_winters":
            try:
                # Validation window evaluation (fit on Train only)
                if not val_df.empty and test_start_idx is not None:
                    hw_val = ExponentialSmoothing(
                        full_sales[:val_start_idx],
                        trend="add",
                        seasonal="add",
                        seasonal_periods=7,
                    ).fit()
                    val_preds = np.maximum(0.0, np.asarray(hw_val.forecast(len(val_df)), dtype=float))
                    val_model_mae, val_model_rmse, val_model_smape = _compute_metrics(
                        full_sales[val_start_idx:test_start_idx], val_preds
                    )

                # Final evaluation window (fit on Train+Validation only, zero leakage)
                hw_eval = ExponentialSmoothing(
                    full_sales[:fit_for_test_end_idx],
                    trend="add",
                    seasonal="add",
                    seasonal_periods=7,
                ).fit()
                eval_preds = np.maximum(0.0, np.asarray(hw_eval.forecast(len(test_df)), dtype=float))
                model_mae, model_rmse, model_smape = _compute_metrics(
                    full_sales[fit_for_test_end_idx:n_valid], eval_preds
                )

                # Full fit for future forecast beyond cutoff (stepped forward to forecast_start_date)
                hw_full = ExponentialSmoothing(
                    full_sales,
                    trend="add",
                    seasonal="add",
                    seasonal_periods=7,
                ).fit()
                raw_forecast = np.asarray(hw_full.forecast(total_steps), dtype=float)

                residuals = full_sales - hw_full.fittedvalues
                res_std = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else float(np.std(residuals))
                conf_int_available = True

                for j in range(horizon):
                    step_idx = offset_days + j
                    raw_val = float(raw_forecast[step_idx])
                    if raw_val < 0.0:
                        clamped_negative = True
                    pred_val = round(max(0.0, raw_val), 1)
                    se_h = res_std * np.sqrt(1.0 + 0.04 * step_idx)
                    lower = round(max(0.0, pred_val - 1.96 * se_h), 1)
                    upper = round(max(lower, pred_val + 1.96 * se_h), 1)
                    forecast_points.append(
                        ForecastPoint(
                            date=future_dates[j],
                            forecast_demand_kg=pred_val,
                            lower_bound_kg=lower,
                            upper_bound_kg=upper,
                            model="holt_winters",
                        )
                    )
            except Exception as exc:
                return ForecastResponse(
                    station_id=station_id,
                    station_name=station_meta["station_name"],
                    model_used=model_choice,
                    model_version=MODEL_VERSION,
                    data_origin=data_origin,
                    horizon_days=horizon,
                    forecast_generated_at=now_utc,
                    current_date=current_date_str,
                    data_age_days=data_age_days,
                    forecast_status="unavailable",
                    data_freshness=data_freshness,
                    forecast_origin_date=audit.latest_date,
                    data_through_date=audit.latest_date,
                    target_start_date=None,
                    target_end_date=None,
                    is_historical_replay=is_historical_replay,
                    historical_demo_notice=f"Holt-Winters model fitting failed: {exc}",
                    historical_avg_demand_kg=historical_avg_demand_kg,
                    historical_recent_avg_kg=historical_recent_avg_kg,
                    forecast_avg_demand_kg=None,
                    demand_trend="unavailable",
                    trend_change_pct=None,
                    key_insight=f"Forecasting failed for {station_meta['station_name']}: {exc}",
                    train_period=train_period,
                    validation_period=validation_period,
                    test_period=test_period,
                    validation_evaluation=None,
                    evaluation=ForecastEvaluation(
                        baseline_model="rolling_mean_28d",
                        baseline_mae_kg=base_test_mae,
                        baseline_rmse_kg=base_test_rmse,
                        baseline_smape_pct=base_test_smape,
                        note=f"Holt-Winters fitting failed ({exc}).",
                    ),
                    model_info=model_info,
                    freshness_policy=freshness_policy,
                    data_audit=audit,
                    historical_context=historical_context,
                    forecast=[],
                    baseline_forecast=[],
                    reliability=ForecastReliability(
                        data_source=data_origin,
                        history_days=audit.valid_records,
                        missing_values=audit.missing_dates_in_range,
                        missing_holiday_data=missing_holiday_data,
                        confidence_interval_available=False,
                        evaluation_note=f"Model fitting failed: {exc}",
                    ),
                    limitations=limitations,
                )
        else:
            model_mae = base_test_mae
            model_rmse = base_test_rmse
            model_smape = base_test_smape
            val_model_mae = base_val_mae
            val_model_rmse = base_val_rmse
            val_model_smape = base_val_smape

            rolling_val = round(max(0.0, float(np.mean(full_sales[-28:]))), 1)
            for d in future_dates:
                forecast_points.append(
                    ForecastPoint(
                        date=d,
                        forecast_demand_kg=rolling_val,
                        lower_bound_kg=None,
                        upper_bound_kg=None,
                        model="rolling_mean_baseline",
                    )
                )

        if clamped_negative:
            limitations.append("One or more raw negative model predictions were clamped to 0.0 kg/day.")

        if validation_period is not None:
            validation_eval = ForecastEvaluation(
                baseline_model="rolling_mean_28d",
                baseline_mae_kg=base_val_mae,
                baseline_rmse_kg=base_val_rmse,
                baseline_smape_pct=base_val_smape,
                model_mae_kg=val_model_mae,
                model_rmse_kg=val_model_rmse,
                model_smape_pct=val_model_smape,
                note=f"Synthetic validation window ({validation_period.start} to {validation_period.end}, {validation_period.n_records} days).",
            )

        baseline_points: Optional[List[ForecastPoint]] = None
        if include_baseline:
            baseline_val = round(max(0.0, float(np.mean(full_sales[-28:]))), 1)
            baseline_points = [
                ForecastPoint(
                    date=d,
                    forecast_demand_kg=baseline_val,
                    lower_bound_kg=None,
                    upper_bound_kg=None,
                    model="rolling_mean_28d",
                )
                for d in future_dates
            ]

        forecast_avg_demand_kg = round(
            float(np.mean([pt.forecast_demand_kg for pt in forecast_points])),
            1,
        )

        if historical_recent_avg_kg and historical_recent_avg_kg > 0:
            trend_change_pct = round(
                ((forecast_avg_demand_kg - historical_recent_avg_kg) / historical_recent_avg_kg) * 100.0,
                1,
            )
            if trend_change_pct >= TREND_THRESHOLD_PCT:
                demand_trend = "increasing"
            elif trend_change_pct <= -TREND_THRESHOLD_PCT:
                demand_trend = "decreasing"
            else:
                demand_trend = "stable"
        else:
            trend_change_pct = None
            demand_trend = "unavailable"

        forecast_status = "simulated" if is_simulated else ("stale" if is_stale else "current")

        cutoff_display = latest_hist_date.strftime("%d %b %Y")
        target_start_str = future_dates[0]
        target_end_str = future_dates[-1]
        target_start_display = datetime.strptime(target_start_str, "%Y-%m-%d").strftime("%d %b %Y")

        if is_simulated and is_stale:
            notice = (
                f"Historical synthetic demo — source data ends {cutoff_display} "
                f"({data_age_days} days before {current_date_str}); forecast shown from {target_start_display}. "
                "Not a current operational forecast."
            )
        elif is_simulated:
            notice = (
                f"Synthetic demonstration forecast — source data ends {cutoff_display}; "
                f"{horizon}-day forecast begins {target_start_display}. Simulated data only."
            )
        elif is_stale:
            notice = f"Stale historical data — latest verified records end {cutoff_display} ({data_age_days} days old)."
        else:
            notice = f"Operational forecast generated from verified records through {audit.latest_date}."

        signed_pct = f"{'+' if trend_change_pct > 0 else ''}{trend_change_pct:.1f}%" if trend_change_pct is not None else "N/A"
        trend_phrase = (
            f"Demand is projected to increase ({signed_pct})"
            if demand_trend == "increasing"
            else f"Demand is projected to decrease ({signed_pct})"
            if demand_trend == "decreasing"
            else f"Demand is projected to remain stable ({signed_pct})"
        )

        key_insight = (
            f"{trend_phrase} over the {horizon}-day forecast period ({target_start_str} to {target_end_str}), "
            f"averaging {forecast_avg_demand_kg:,.1f} kg/day compared to {historical_recent_avg_kg:,.1f} kg/day "
            f"in the trailing {len(hist_context_df)} days (synthetic data through {audit.latest_date})."
        )

        eval_note = (
            f"Station-specific synthetic final evaluation ({test_start} to {test_end}, {len(test_df)} days). "
            "Do not claim real-world accuracy."
            if is_simulated
            else f"Station-specific out-of-sample evaluation ({test_start} to {test_end}, {len(test_df)} days)."
        )

        return ForecastResponse(
            station_id=station_id,
            station_name=station_meta["station_name"],
            model_used=model_choice,
            model_version=MODEL_VERSION,
            data_origin=data_origin,
            horizon_days=horizon,
            forecast_generated_at=now_utc,
            current_date=current_date_str,
            data_age_days=data_age_days,
            forecast_status=forecast_status,
            data_freshness=data_freshness,
            forecast_origin_date=audit.latest_date,
            data_through_date=audit.latest_date,
            target_start_date=target_start_str,
            target_end_date=target_end_str,
            is_historical_replay=is_historical_replay,
            historical_demo_notice=notice,
            historical_avg_demand_kg=historical_avg_demand_kg,
            historical_recent_avg_kg=historical_recent_avg_kg,
            forecast_avg_demand_kg=forecast_avg_demand_kg,
            demand_trend=demand_trend,
            trend_change_pct=trend_change_pct,
            key_insight=key_insight,
            train_period=train_period,
            validation_period=validation_period,
            test_period=test_period,
            validation_evaluation=validation_eval,
            evaluation=ForecastEvaluation(
                baseline_model="rolling_mean_28d",
                baseline_mae_kg=base_test_mae,
                baseline_rmse_kg=base_test_rmse,
                baseline_smape_pct=base_test_smape,
                model_mae_kg=model_mae,
                model_rmse_kg=model_rmse,
                model_smape_pct=model_smape,
                note=eval_note,
            ),
            model_info=model_info,
            freshness_policy=freshness_policy,
            data_audit=audit,
            historical_context=historical_context,
            forecast=forecast_points,
            baseline_forecast=baseline_points,
            reliability=ForecastReliability(
                data_source=data_origin,
                history_days=audit.valid_records,
                missing_values=audit.missing_dates_in_range,
                missing_holiday_data=missing_holiday_data,
                confidence_interval_available=conf_int_available,
                evaluation_note=(
                    "Synthetic-only validation. Cannot claim real-world accuracy."
                    if is_simulated
                    else f"Evaluated chronologically on {len(test_df)} out-of-sample days."
                ),
            ),
            limitations=limitations,
        )

    # -----------------------------------------------------------------------
    # Additional Endpoints Required by Master Prompt 2 Section 6
    # -----------------------------------------------------------------------

    @classmethod
    def list_forecast_stations(cls) -> ForecastStationsListResponse:
        store = get_data_store()
        stations_df, daily_df, _ = cls._get_station_and_sales_sources(store)

        grouped = daily_df.groupby("station_id")["date"].agg(["count", "min", "max"]).to_dict("index")
        items: List[ForecastStationSummaryItem] = []

        for _, row in stations_df.iterrows():
            sid = str(row["station_id"])
            elig = str(row.get("eligible_for_simulation", row.get("in_study_area") == "yes")).strip().lower() in (
                "true",
                "1",
                "yes",
            )
            if not elig:
                continue
            stats = grouped.get(sid, {})
            items.append(
                ForecastStationSummaryItem(
                    station_id=sid,
                    station_name=str(row.get("station_name", sid)),
                    district=str(row.get("district", "Ahmedabad")),
                    city=str(row.get("city", "Ahmedabad")),
                    operator=str(row.get("operator", "not_established")),
                    simulation_profile=str(row.get("simulation_profile", "general")),
                    eligible_for_simulation=True,
                    history_records=int(stats.get("count", 0)),
                    earliest_date=str(stats["min"]) if "min" in stats else None,
                    latest_date=str(stats["max"]) if "max" in stats else None,
                    data_origin="synthetic_demo",
                )
            )

        items.sort(key=lambda x: x.station_id)
        return ForecastStationsListResponse(
            total_eligible_stations=len(items),
            stations=items,
            data_origin="synthetic_demo",
            generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        )

    @classmethod
    def get_station_history(
        cls,
        station_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        aggregation: str = "daily",
        cutoff_date: Optional[str] = None,
    ) -> ForecastHistoryResponse:
        store = get_data_store()
        stations_df, daily_df, sales_col = cls._get_station_and_sales_sources(store)
        station_meta = cls._get_station_meta(station_id, stations_df)
        if not station_meta or not station_meta["eligible_for_simulation"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": f"Station {station_id} not found or not eligible for forecasting.",
                    "fields": None,
                },
            )

        effective_cutoff = cls._resolve_cutoff(cutoff_date)
        raw_df = daily_df[daily_df["station_id"] == station_id].copy()
        valid_df, audit, data_origin = cls._audit_and_prepare_station_series(
            raw_df, sales_col=sales_col, cutoff_date=effective_cutoff
        )

        if valid_df.empty:
            return ForecastHistoryResponse(
                station_id=station_id,
                station_name=station_meta["station_name"],
                district=station_meta.get("district", "Ahmedabad"),
                aggregation=aggregation,
                data_origin=data_origin,
                date_range_start=None,
                date_range_end=None,
                total_records=0,
                missing_records=0,
                series=[],
                note="No valid historical records available for this station.",
            )

        start = start_date or audit.earliest_date
        end = end_date or audit.latest_date
        try:
            start_dt = pd.to_datetime(start, format="%Y-%m-%d", errors="raise")
            end_dt = pd.to_datetime(end, format="%Y-%m-%d", errors="raise")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "start_date and end_date must be valid YYYY-MM-DD dates.",
                    "fields": {"date_range": ["Expected YYYY-MM-DD format"]},
                },
            )
        if start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": f"start_date ({start}) cannot be after end_date ({end}).",
                    "fields": {"date_range": ["start_date must be <= end_date"]},
                },
            )

        sub = valid_df[(valid_df["parsed_date"] >= start_dt) & (valid_df["parsed_date"] <= end_dt)].copy()
        expected_days = int((end_dt - start_dt).days) + 1
        missing_records = max(0, expected_days - len(sub))

        series: List[HistoricalContextPoint] = []
        if aggregation == "weekly":
            sub["week_start"] = sub["parsed_date"].apply(lambda d: (d - pd.Timedelta(days=d.weekday())).strftime("%Y-%m-%d"))
            weekly = sub.groupby("week_start", as_index=False).agg({"sales_numeric": "sum", "data_type": "first"})
            for _, row in weekly.iterrows():
                series.append(
                    HistoricalContextPoint(
                        date=str(row["week_start"]),
                        demand_kg=round(float(row["sales_numeric"]), 2),
                        day_of_week="Week",
                        is_weekend=False,
                        data_type=str(row.get("data_type", "synthetic")),
                    )
                )
        else:
            for _, row in sub.iterrows():
                series.append(
                    HistoricalContextPoint(
                        date=row["parsed_date"].strftime("%Y-%m-%d"),
                        demand_kg=round(float(row["sales_numeric"]), 2),
                        day_of_week=row["parsed_date"].day_name(),
                        is_weekend=bool(row["parsed_date"].dayofweek >= 5),
                        data_type=str(row.get("data_type", "synthetic")),
                    )
                )

        return ForecastHistoryResponse(
            station_id=station_id,
            station_name=station_meta["station_name"],
            district=station_meta.get("district", "Ahmedabad"),
            aggregation=aggregation,
            data_origin=data_origin,
            date_range_start=start,
            date_range_end=end,
            total_records=len(series),
            missing_records=missing_records,
            series=series,
            note="Synthetic historical demand series only; not actual observed station meter sales.",
        )

    @classmethod
    def get_station_metrics(
        cls,
        station_id: str,
        model: str = "holt_winters",
        cutoff_date: Optional[str] = None,
    ) -> ForecastMetricsResponse:
        fc = cls.generate_forecast(
            ForecastRequest(station_id=station_id, horizon_days=7, model=model, include_baseline=True),
            cutoff_date=cutoff_date,
        )
        return ForecastMetricsResponse(
            station_id=fc.station_id,
            station_name=fc.station_name,
            model_used=fc.model_used,
            model_version=fc.model_version,
            data_origin=fc.data_origin,
            forecast_status=fc.forecast_status,
            train_period=fc.train_period,
            validation_period=fc.validation_period,
            test_period=fc.test_period,
            validation_evaluation=fc.validation_evaluation,
            final_evaluation=fc.evaluation,
            forecast_generated_at=fc.forecast_generated_at,
            note=fc.evaluation.note,
        )

    @classmethod
    def get_network_summary(
        cls,
        horizon_days: int = 7,
        model: str = "holt_winters",
        cutoff_date: Optional[str] = None,
    ) -> NetworkForecastSummaryResponse:
        if horizon_days not in (7, 14, 30) and not (1 <= horizon_days <= 30):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "horizon_days must be between 1 and 30 (7, 14, or 30 recommended).",
                    "fields": {"horizon_days": ["Must be 1-30"]},
                },
            )
        effective_cutoff = cls._resolve_cutoff(cutoff_date)
        store = get_data_store()
        stations_df, daily_df, _ = cls._get_station_and_sales_sources(store)
        fp = cls._dataset_fingerprint(store, daily_df)
        ref_date_str = cls._current_local_date().strftime("%Y-%m-%d")
        cache_key = (fp, effective_cutoff, ref_date_str, horizon_days, model)

        with cls._lock:
            if cache_key in cls._network_cache:
                return cls._network_cache[cache_key]

        disk_fp = cls._disk_fingerprint(daily_df)
        cache_dir = Path(settings.data_dir) / "synthetic" / ".network_summary_cache"
        key_hash = hashlib.sha256(
            "|".join(str(x) for x in (disk_fp, effective_cutoff, ref_date_str, horizon_days, model)).encode("utf-8")
        ).hexdigest()[:24]
        cache_file = cache_dir / f"{key_hash}.json"
        if cache_file.exists():
            try:
                cached_summary = NetworkForecastSummaryResponse.model_validate_json(
                    cache_file.read_text(encoding="utf-8")
                )
                with cls._lock:
                    cls._network_cache[cache_key] = cached_summary
                return cached_summary
            except Exception:
                pass

        eligible_rows = stations_df[
            stations_df.get("eligible_for_simulation", stations_df.get("in_study_area") == "yes")
            .astype(str)
            .str.lower()
            .isin(["true", "1", "yes"])
        ].sort_values("station_id")

        station_summaries: List[NetworkStationForecastSummary] = []
        failed_or_insuff_ids: List[str] = []
        success_count = 0
        insuff_count = 0
        failed_count = 0
        total_forecast_demand = 0.0
        total_hist_recent = 0.0

        hw_maes: List[float] = []
        hw_rmses: List[float] = []
        hw_smapes: List[float] = []
        base_maes: List[float] = []
        base_rmses: List[float] = []
        base_smapes: List[float] = []
        hw_wins = 0

        sample_fc: Optional[ForecastResponse] = None

        for _, row in eligible_rows.iterrows():
            sid = str(row["station_id"])
            try:
                fc = cls.generate_forecast(
                    ForecastRequest(station_id=sid, horizon_days=horizon_days, model=model, include_baseline=True),
                    cutoff_date=effective_cutoff,
                )
            except HTTPException:
                failed_count += 1
                failed_or_insuff_ids.append(sid)
                station_summaries.append(
                    NetworkStationForecastSummary(
                        station_id=sid,
                        station_name=str(row.get("station_name", sid)),
                        district=str(row.get("district", "Ahmedabad")),
                        simulation_profile=str(row.get("simulation_profile", "general")),
                        forecast_status="unavailable",
                        demand_trend="unavailable",
                    )
                )
                continue

            if sample_fc is None and fc.forecast:
                sample_fc = fc

            if fc.forecast_status in ("insufficient_data", "unavailable") or not fc.forecast:
                if fc.forecast_status == "insufficient_data":
                    insuff_count += 1
                else:
                    failed_count += 1
                failed_or_insuff_ids.append(sid)
            else:
                success_count += 1
                total_forecast_demand += fc.forecast_avg_demand_kg or 0.0
                total_hist_recent += fc.historical_recent_avg_kg or 0.0

            ev = fc.evaluation
            if ev.model_mae_kg is not None:
                hw_maes.append(ev.model_mae_kg)
            if ev.model_rmse_kg is not None:
                hw_rmses.append(ev.model_rmse_kg)
            if ev.model_smape_pct is not None:
                hw_smapes.append(ev.model_smape_pct)
            if ev.baseline_mae_kg is not None:
                base_maes.append(ev.baseline_mae_kg)
            if ev.baseline_rmse_kg is not None:
                base_rmses.append(ev.baseline_rmse_kg)
            if ev.baseline_smape_pct is not None:
                base_smapes.append(ev.baseline_smape_pct)
            if ev.model_mae_kg is not None and ev.baseline_mae_kg is not None and ev.model_mae_kg < ev.baseline_mae_kg:
                hw_wins += 1

            station_summaries.append(
                NetworkStationForecastSummary(
                    station_id=sid,
                    station_name=fc.station_name,
                    district=str(row.get("district", "Ahmedabad")),
                    simulation_profile=str(row.get("simulation_profile", "general")),
                    forecast_status=fc.forecast_status,
                    historical_recent_avg_kg=fc.historical_recent_avg_kg,
                    forecast_avg_demand_kg=fc.forecast_avg_demand_kg,
                    demand_trend=fc.demand_trend,
                    model_mae_kg=ev.model_mae_kg,
                    baseline_mae_kg=ev.baseline_mae_kg,
                    model_smape_pct=ev.model_smape_pct,
                    baseline_smape_pct=ev.baseline_smape_pct,
                )
            )

        net_fc_kg = round(total_forecast_demand, 1)
        net_hist_kg = round(total_hist_recent, 1)
        if net_hist_kg > 0:
            net_pct = round(((net_fc_kg - net_hist_kg) / net_hist_kg) * 100.0, 1)
            net_trend = "increasing" if net_pct >= TREND_THRESHOLD_PCT else ("decreasing" if net_pct <= -TREND_THRESHOLD_PCT else "stable")
        else:
            net_pct = None
            net_trend = "unavailable"

        net_eval = NetworkEvaluationSummary(
            stations_evaluated=len(hw_maes),
            mean_hw_mae_kg=round(float(np.mean(hw_maes)), 2) if hw_maes else None,
            mean_hw_rmse_kg=round(float(np.mean(hw_rmses)), 2) if hw_rmses else None,
            mean_hw_smape_pct=round(float(np.mean(hw_smapes)), 2) if hw_smapes else None,
            mean_baseline_mae_kg=round(float(np.mean(base_maes)), 2) if base_maes else None,
            mean_baseline_rmse_kg=round(float(np.mean(base_rmses)), 2) if base_rmses else None,
            mean_baseline_smape_pct=round(float(np.mean(base_smapes)), 2) if base_smapes else None,
            holt_winters_outperforms_baseline_count=hw_wins,
            note="Network-wide out-of-sample evaluation metrics computed on synthetic data only.",
        )

        summary = NetworkForecastSummaryResponse(
            horizon_days=horizon_days,
            model_used=model,
            model_version=MODEL_VERSION,
            data_origin=sample_fc.data_origin if sample_fc else "synthetic_demo",
            forecast_status=sample_fc.forecast_status if sample_fc else "unavailable",
            data_freshness=sample_fc.data_freshness if sample_fc else "unavailable",
            data_through_date=sample_fc.data_through_date if sample_fc else None,
            target_start_date=sample_fc.target_start_date if sample_fc else None,
            target_end_date=sample_fc.target_end_date if sample_fc else None,
            forecast_generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            eligible_stations=len(eligible_rows),
            successfully_forecasted_stations=success_count,
            insufficient_data_stations=insuff_count,
            failed_stations=failed_count,
            failed_or_insufficient_station_ids=failed_or_insuff_ids,
            simulated_network_demand_kg_per_day=net_fc_kg,
            historical_network_recent_avg_kg_per_day=net_hist_kg,
            network_demand_trend=net_trend,
            network_trend_change_pct=net_pct,
            network_evaluation=net_eval,
            station_summaries=station_summaries,
            note="Aggregated across all eligible verified Gujarat stations; synthetic demonstration figures only.",
        )

        with cls._lock:
            cls._network_cache[cache_key] = summary
        try:
            cache_dir.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(summary.model_dump_json(), encoding="utf-8")
        except Exception:
            pass
        return summary

    @classmethod
    def get_data_status(cls, cutoff_date: Optional[str] = None) -> ForecastDataStatusResponse:
        effective_cutoff = cls._resolve_cutoff(cutoff_date)
        store = get_data_store()
        stations_df, daily_df, _ = cls._get_station_and_sales_sources(store)

        eligible_count = int(
            stations_df.get("eligible_for_simulation", stations_df.get("in_study_area") == "yes")
            .astype(str)
            .str.lower()
            .isin(["true", "1", "yes"])
            .sum()
        )
        current_local_date = cls._current_local_date()
        current_date_str = current_local_date.strftime("%Y-%m-%d")

        filtered_daily = daily_df if effective_cutoff is None else daily_df[daily_df["date"] <= effective_cutoff]
        max_date = str(filtered_daily["date"].max()) if not filtered_daily.empty else None
        stations_with_data = int(filtered_daily["station_id"].nunique()) if not filtered_daily.empty else 0

        if max_date is not None:
            latest_dt = datetime.strptime(max_date, "%Y-%m-%d").date()
            data_age = (current_local_date - latest_dt).days
            is_stale = data_age > FRESHNESS_MAX_AGE_DAYS
            freshness = "stale" if is_stale else "current"
        else:
            data_age = None
            is_stale = True
            freshness = "unavailable"

        ext_counts: Dict[str, int] = {}
        if getattr(store, "external_weather", None) is not None:
            ext_counts["weather_rows"] = len(store.external_weather)
        if getattr(store, "external_holidays", None) is not None:
            ext_counts["holiday_rows"] = len(store.external_holidays)
        if getattr(store, "external_macro_context", None) is not None:
            ext_counts["macro_context_rows"] = len(store.external_macro_context)

        with cls._lock:
            cache_count = len(cls._forecast_cache) + len(cls._network_cache)

        return ForecastDataStatusResponse(
            data_origin="synthetic_demo",
            current_date=current_date_str,
            data_through_date=max_date,
            data_age_days=data_age,
            data_freshness=freshness,
            forecast_status="simulated" if max_date else "unavailable",
            eligible_stations=eligible_count,
            stations_with_data=stations_with_data,
            total_historical_records=len(filtered_daily),
            cache_entries=cache_count,
            model_version=MODEL_VERSION,
            freshness_policy=FreshnessPolicy(
                max_age_days_for_current=FRESHNESS_MAX_AGE_DAYS,
                data_age_days=data_age,
                is_stale=is_stale,
                is_simulated=True,
                policy_note=f"Threshold: <= {FRESHNESS_MAX_AGE_DAYS} days old for current operational status.",
            ),
            external_datasets_loaded=ext_counts,
            limitations=[
                "Historical demand and supply series are Python-generated synthetic data.",
                "Never treat simulated demand or sales as actual station meter telemetry.",
            ],
            checked_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        )
