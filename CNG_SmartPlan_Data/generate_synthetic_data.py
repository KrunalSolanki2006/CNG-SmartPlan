#!/usr/bin/env python3
"""Generate reproducible synthetic CNG sales, planned supply and hourly demand.

This script only writes the three synthetic datasets. It never modifies the
real-public station inventory. It intentionally refuses to invent station rows.
Run from this directory: python generate_synthetic_data.py
Dependencies: pandas, numpy
"""
from __future__ import annotations
from pathlib import Path
import sys
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
STATIONS_FILE = BASE_DIR / "cng_stations.csv"
DAILY_FILE = BASE_DIR / "synthetic_daily_sales.csv"
SUPPLY_FILE = BASE_DIR / "synthetic_supply.csv"
HOURLY_FILE = BASE_DIR / "synthetic_hourly_demand.csv"
HOLIDAYS_FILE = BASE_DIR / "optional" / "official_holidays.csv"
SEED = 20241029
START_DATE = "2024-01-01"
END_DATE = "2025-12-31"
HOURLY_DAYS = 30
HOURLY_STATION_LIMIT = 3
PROFILE_BASE_KG_PER_DAY = {"central_urban": 1100.0, "commuter_corridor": 1350.0, "mixed_urban": 1000.0}
WEEKDAY_MULTIPLIER = {0: 1.02, 1: 1.03, 2: 1.04, 3: 1.02, 4: 1.08, 5: 0.94, 6: 0.78}
GENERATION_METHOD = "python_synthetic_simulation; fixed_seed=20241029; assumed profile/weekday/season/random variation"

def assign_profile(row: pd.Series) -> str:
    text = " ".join(str(row.get(k, "")) for k in ("station_name", "address", "locality")).lower()
    if any(x in text for x in ("relief road", "shahibaug", "khokhra", "ghatlodiya", "zakaria")):
        return "central_urban"
    if any(x in text for x in ("visat", "naroda", "saijpur", "ring road", "baug-e-firdos", "purnima", "chandkheda")):
        return "commuter_corridor"
    return "mixed_urban"

def load_holidays() -> dict[str, str]:
    """Read only a supplied, sourced official_holidays.csv; otherwise encode blanks."""
    if not HOLIDAYS_FILE.exists():
        return {}
    frame = pd.read_csv(HOLIDAYS_FILE, dtype=str).fillna("")
    required = {"date", "holiday_name", "geographic_scope", "source_url", "data_type"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"{HOLIDAYS_FILE.name} is missing columns: {sorted(missing)}")
    if not frame.empty and not frame["data_type"].str.lower().eq("real_public").all():
        raise ValueError("official_holidays.csv must contain only sourced real_public rows")
    for value in frame["date"]:
        pd.to_datetime(value, format="%Y-%m-%d", errors="raise")
    if frame["date"].duplicated().any():
        raise ValueError("official_holidays.csv has duplicate dates; resolve conflicting holiday names first")
    return {pd.Timestamp(r.date).strftime("%Y-%m-%d"): r.holiday_name for r in frame.itertuples(index=False)}

def load_stations() -> pd.DataFrame:
    if not STATIONS_FILE.exists():
        raise FileNotFoundError(f"Required input not found: {STATIONS_FILE}")
    frame = pd.read_csv(STATIONS_FILE, dtype=str).fillna("")
    required = {"station_id", "station_name", "address", "locality", "in_study_area", "verification_status", "data_type"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"cng_stations.csv missing columns: {sorted(missing)}")
    if frame["station_id"].duplicated().any():
        raise ValueError("cng_stations.csv contains duplicate station IDs")
    if not frame["data_type"].eq("real_public").all():
        raise ValueError("cng_stations.csv must contain only real_public station records")
    eligible = frame[frame["in_study_area"].str.lower().eq("yes")].copy()
    if eligible.empty:
        raise ValueError("No rows marked in_study_area=yes. Refusing to invent station records.")
    eligible["simulation_profile"] = eligible.apply(assign_profile, axis=1)
    return eligible.sort_values("station_id").reset_index(drop=True)

def generate_daily(stations: pd.DataFrame, rng: np.random.Generator, holidays: dict[str, str]) -> pd.DataFrame:
    dates = pd.date_range(START_DATE, END_DATE, freq="D")
    if len(dates) != 731:
        raise AssertionError(f"Expected 731 dates, got {len(dates)}")
    output = []
    for st in stations.itertuples(index=False):
        profile = st.simulation_profile
        base = PROFILE_BASE_KG_PER_DAY[profile] * rng.uniform(0.76, 1.28)
        noise_sd = rng.uniform(0.075, 0.12)
        for i, dt in enumerate(dates):
            dow = int(dt.dayofweek)
            annual_cycle = 1.0 + 0.055 * np.cos(2 * np.pi * (dt.dayofyear - 15) / 365.25)
            slow_drift = 1.0 + 0.00008 * i
            random_factor = max(0.68, float(rng.normal(1.0, noise_sd)))
            value = max(0.0, base * WEEKDAY_MULTIPLIER[dow] * annual_cycle * slow_drift * random_factor)
            key = dt.strftime("%Y-%m-%d")
            holiday = holidays.get(key, "")
            output.append({"station_id": st.station_id, "date": key, "synthetic_sales_kg": round(value, 2),
                "day_of_week": dt.day_name(), "is_weekend": bool(dow >= 5), "month": int(dt.month), "year": int(dt.year),
                "is_public_holiday": bool(holiday) if holidays else "", "event_name": holiday,
                "simulation_profile": profile, "data_type": "synthetic", "generation_method": GENERATION_METHOD})
    return pd.DataFrame(output).sort_values(["station_id", "date"]).reset_index(drop=True)

def generate_supply(daily: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    output = []
    for row in daily.itertuples(index=False):
        # A synthetic scenario: constrained availability on about one-fifth of station-days.
        factor = rng.uniform(0.58, 0.94) if rng.random() < 0.20 else rng.uniform(1.02, 1.20)
        output.append({"station_id": row.station_id, "date": row.date,
            "planned_available_supply_kg": round(max(0.0, row.synthetic_sales_kg * factor), 2),
            "data_type": "synthetic",
            "generation_method": "python_synthetic_simulation; assumed supply factor; fixed_seed=20241029"})
    return pd.DataFrame(output).sort_values(["station_id", "date"]).reset_index(drop=True)

def hourly_weights(profile: str, hours: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    if profile == "central_urban":
        morning, evening, midday = 8.0, 18.0, 13.0; a, b, c = 1.35, 1.55, 0.30
    elif profile == "commuter_corridor":
        morning, evening, midday = 7.0, 18.5, 13.0; a, b, c = 1.55, 1.40, 0.22
    else:
        morning, evening, midday = 8.5, 18.0, 13.0; a, b, c = 1.15, 1.30, 0.40
    weights = 0.18 + a*np.exp(-0.5*((hours-morning)/1.7)**2) + b*np.exp(-0.5*((hours-evening)/2.0)**2) + c*np.exp(-0.5*((hours-midday)/3.0)**2)
    weights *= rng.lognormal(mean=0.0, sigma=0.09, size=len(hours))
    return weights / weights.sum()

def generate_hourly(daily: pd.DataFrame, stations: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    end = pd.Timestamp(END_DATE)
    start = end - pd.Timedelta(days=HOURLY_DAYS-1)
    first, last = start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
    selected = []
    for profile in ("central_urban", "commuter_corridor", "mixed_urban"):
        matches = stations[stations["simulation_profile"].eq(profile)]
        if not matches.empty and len(selected) < HOURLY_STATION_LIMIT:
            selected.append(matches.iloc[0]["station_id"])
    if not selected:
        selected = stations["station_id"].head(HOURLY_STATION_LIMIT).tolist()
    sub = daily[daily["station_id"].isin(selected) & daily["date"].between(first, last)]
    lookup = {(r.station_id, r.date): float(r.synthetic_sales_kg) for r in sub.itertuples(index=False)}
    profile_lookup = stations.set_index("station_id")["simulation_profile"].to_dict()
    output = []
    hours = np.arange(24, dtype=float)
    for station_id in selected:
        for date in pd.date_range(start, end, freq="D"):
            key = date.strftime("%Y-%m-%d")
            total = lookup[(station_id, key)]
            weights = hourly_weights(profile_lookup[station_id], hours, rng)
            # Round to 2 decimals then reconcile final hour so hourly sum equals daily total.
            vals = np.round(weights * total, 2)
            vals[-1] = round(total - float(vals[:-1].sum()), 2)
            if vals[-1] < 0:
                # Defensive rebalancing for unusually tiny totals (not expected with parameters above).
                vals = np.round(weights * total, 3)
                vals[-1] = round(total - float(vals[:-1].sum()), 3)
            for hour, value in enumerate(vals):
                stamp = date + pd.Timedelta(hours=hour)
                dow = int(date.dayofweek)
                output.append({"station_id": station_id, "datetime": stamp.strftime("%Y-%m-%d %H:%M:%S"), "date": key,
                    "hour": int(hour), "hourly_cng_demand_kg": float(value), "day_of_week": date.day_name(),
                    "is_weekend": bool(dow >= 5), "simulation_profile": profile_lookup[station_id],
                    "data_type": "synthetic", "generation_method": "python_synthetic_simulation; normalized hourly peak profile; reconciled to daily total; fixed_seed=20241029"})
    return pd.DataFrame(output).sort_values(["station_id", "datetime"]).reset_index(drop=True)

def validate_outputs(stations: pd.DataFrame, daily: pd.DataFrame, supply: pd.DataFrame, hourly: pd.DataFrame) -> list[str]:
    checks = []
    if stations.station_id.duplicated().any(): raise AssertionError("Duplicate eligible station IDs")
    checks.append(f"Eligible real station IDs unique: {len(stations)}")
    expected_days = pd.date_range(START_DATE, END_DATE, freq="D").strftime("%Y-%m-%d").tolist()
    if len(daily) != len(stations)*731: raise AssertionError("Daily row count does not equal stations x 731 days")
    if daily.duplicated(["station_id","date"]).any(): raise AssertionError("Duplicate station-date row in daily dataset")
    if not daily.groupby("station_id").date.apply(lambda s: sorted(s.tolist()) == expected_days).all(): raise AssertionError("Date coverage is incomplete")
    if (pd.to_numeric(daily.synthetic_sales_kg, errors="coerce").isna().any() or (daily.synthetic_sales_kg < 0).any()): raise AssertionError("Invalid daily sales values")
    if not daily.data_type.eq("synthetic").all(): raise AssertionError("Daily labels incorrect")
    checks.append(f"Daily rows/date coverage/nonnegative sales/synthetic labels: PASS ({len(daily):,} rows; 731 dates per station)")
    if supply.duplicated(["station_id","date"]).any() or set(map(tuple,supply[["station_id","date"]].values)) != set(map(tuple,daily[["station_id","date"]].values)):
        raise AssertionError("Supply station-date keys do not exactly match daily data")
    if (supply.planned_available_supply_kg < 0).any() or not supply.data_type.eq("synthetic").all(): raise AssertionError("Invalid supply quantities/labels")
    checks.append(f"Supply exact key match/nonnegative quantities/synthetic labels: PASS ({len(supply):,} rows)")
    if hourly.duplicated(["station_id","datetime"]).any(): raise AssertionError("Duplicate station-datetime in hourly data")
    if (hourly.hourly_cng_demand_kg < 0).any() or not hourly.data_type.eq("synthetic").all(): raise AssertionError("Invalid hourly quantities/labels")
    counts = hourly.groupby(["station_id","date"]).size()
    if not counts.eq(24).all(): raise AssertionError("Hourly data must contain 24 rows per station-day")
    sums = hourly.groupby(["station_id","date"]).hourly_cng_demand_kg.sum()
    day_idx = daily.set_index(["station_id","date"]).synthetic_sales_kg
    deltas = (sums - day_idx.loc[sums.index]).abs()
    if (deltas > 0.011).any(): raise AssertionError(f"Hourly totals do not reconcile; max delta {deltas.max()}")
    checks.append(f"Hourly rows/24 hours per station-day/nonnegative/reconciled: PASS ({len(hourly):,} rows; max delta {deltas.max():.5f} kg)")
    all_ids = set(stations.station_id)
    for frame_name, frame in [("daily",daily),("supply",supply),("hourly",hourly)]:
        if not set(frame.station_id).issubset(all_ids): raise AssertionError(f"Unknown station ID in {frame_name}")
    checks.append("Cross-file station IDs: PASS")
    # Ensure synthetic daily patterns are not identical across station IDs.
    means = daily.groupby("station_id").synthetic_sales_kg.mean()
    if len(means) > 1 and means.nunique() == 1: raise AssertionError("Station patterns unexpectedly identical")
    checks.append("Station profiles differ (not one repeated series): PASS")
    return checks

def main() -> None:
    stations = load_stations()
    rng = np.random.default_rng(SEED)
    holidays = load_holidays()
    daily = generate_daily(stations, rng, holidays)
    supply = generate_supply(daily, rng)
    hourly = generate_hourly(daily, stations, rng)
    checks = validate_outputs(stations, daily, supply, hourly)
    daily.to_csv(DAILY_FILE, index=False, encoding="utf-8")
    supply.to_csv(SUPPLY_FILE, index=False, encoding="utf-8")
    hourly.to_csv(HOURLY_FILE, index=False, encoding="utf-8")
    print("Synthetic data generation complete. The cng_stations.csv input was not modified.")
    print(f"Eligible stations: {len(stations)} (in_study_area=yes only)")
    print(f"Daily sales: {len(daily):,} rows x {len(daily.columns)} columns")
    print(f"Supply: {len(supply):,} rows x {len(supply.columns)} columns")
    print(f"Hourly: {len(hourly):,} rows x {len(hourly.columns)} columns")
    for check in checks: print("- " + check)

if __name__ == "__main__":
    try: main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise
