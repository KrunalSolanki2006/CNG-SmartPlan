#!/usr/bin/env python3
"""Generate reconciled 24-hour diurnal demand profiles for all 151 verified Gujarat stations.

Covers the trailing 30 days (2026-10-26 to 2026-11-24) of synthetic_daily_demand_sales.csv,
reconciling each station-day's 24 hourly values to simulated_demand_kg within 0.00 kg.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd

SYNTH_DIR = Path(__file__).resolve().parent
DAILY_FILE = SYNTH_DIR / "synthetic_daily_demand_sales.csv"
HOURLY_FILE = SYNTH_DIR / "synthetic_hourly_demand_151.csv"
SEED = 20261125
HOURLY_DAYS = 30
GENERATION_VERSION = "2.0.0"
GENERATION_METHOD = "gujarat_151_diurnal_profile_reconciled_v2"


def hourly_weights(profile: str, hours: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    if profile == "urban":
        morning, evening, midday = 8.5, 18.5, 13.0
        a, b, c, base = 1.40, 1.55, 0.32, 0.16
    elif profile == "highway":
        morning, evening, midday = 7.5, 19.0, 13.5
        a, b, c, base = 1.10, 1.25, 0.55, 0.28
    elif profile == "industrial":
        morning, evening, midday = 7.0, 17.5, 12.5
        a, b, c, base = 1.60, 1.45, 0.35, 0.14
    elif profile == "suburban":
        morning, evening, midday = 8.0, 18.0, 13.0
        a, b, c, base = 1.25, 1.35, 0.30, 0.18
    else:
        morning, evening, midday = 8.0, 18.0, 13.0
        a, b, c, base = 1.25, 1.35, 0.35, 0.18

    weights = (
        base
        + a * np.exp(-0.5 * ((hours - morning) / 1.8) ** 2)
        + b * np.exp(-0.5 * ((hours - evening) / 2.0) ** 2)
        + c * np.exp(-0.5 * ((hours - midday) / 3.0) ** 2)
    )
    weights *= rng.lognormal(mean=0.0, sigma=0.07, size=len(hours))
    return weights / weights.sum()


def generate_hourly_151() -> pd.DataFrame:
    daily = pd.read_csv(DAILY_FILE, dtype={"station_id": str, "simulation_profile": str})
    end_dt = pd.Timestamp(daily["date"].max())
    start_dt = end_dt - pd.Timedelta(days=HOURLY_DAYS - 1)
    start_str, end_str = start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")

    sub = daily[daily["date"].between(start_str, end_str)].sort_values(["station_id", "date"])
    rng = np.random.default_rng(SEED)
    hours = np.arange(24, dtype=float)
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Vectorized / preallocated lists for fast generation of 108,720 rows
    n_rows = len(sub) * 24
    station_ids = []
    datetimes = []
    dates = []
    hour_col = []
    demands = []
    dows = []
    weekends = []
    profiles = []

    for row in sub.itertuples(index=False):
        sid = row.station_id
        d_str = row.date
        total = float(row.simulated_demand_kg)
        prof = row.simulation_profile
        dow_name = row.day_of_week
        is_wknd = bool(row.is_weekend)

        w = hourly_weights(prof, hours, rng)
        vals = np.round(w * total, 2)
        vals[-1] = round(total - float(vals[:-1].sum()), 2)
        if vals[-1] < 0:
            vals = np.round(w * total, 3)
            vals[-1] = round(total - float(vals[:-1].sum()), 3)

        for h in range(24):
            station_ids.append(sid)
            datetimes.append(f"{d_str} {h:02d}:00:00")
            dates.append(d_str)
            hour_col.append(h)
            demands.append(float(vals[h]))
            dows.append(dow_name)
            weekends.append(is_wknd)
            profiles.append(prof)

    out = pd.DataFrame({
        "station_id": station_ids,
        "datetime": datetimes,
        "date": dates,
        "hour": hour_col,
        "hourly_cng_demand_kg": demands,
        "day_of_week": dows,
        "is_weekend": weekends,
        "simulation_profile": profiles,
        "data_type": "synthetic",
        "generation_method": GENERATION_METHOD,
        "generation_version": GENERATION_VERSION,
        "random_seed": SEED,
        "generated_at": generated_at,
    })
    assert len(out) == n_rows
    out.to_csv(HOURLY_FILE, index=False, encoding="utf-8")
    return out


if __name__ == "__main__":
    df = generate_hourly_151()
    print(f"Generated {len(df):,} hourly rows across {df['station_id'].nunique()} stations ({df['date'].min()} to {df['date'].max()}).")
