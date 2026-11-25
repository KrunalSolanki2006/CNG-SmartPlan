#!/usr/bin/env python3
"""Configurable synthetic daily demand, supply, outage, and constrained sales generator.

Generates reproducible synthetic historical records for all eligible verified Gujarat
CNG stations using real external weather (Open-Meteo) and Gujarat holiday/festival dates,
while strictly separating simulated demand, available supply, compressor outages, and
supply-constrained sales.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import numpy as np
import pandas as pd

SYNTH_DIR = Path(__file__).resolve().parent
DATA_DIR = SYNTH_DIR.parent
DEFAULT_CONFIG = SYNTH_DIR / "synthetic_generation_config.json"
DEFAULT_STATIONS = DATA_DIR / "reference" / "gujarat_verified_stations.csv"
DEFAULT_WEATHER = DATA_DIR / "external" / "gujarat_district_weather_daily.csv"
DEFAULT_HOLIDAYS = DATA_DIR / "external" / "gujarat_holidays_festivals_2024_2026.csv"


def generate_dataset(
    config_path: Path = DEFAULT_CONFIG,
    stations_path: Path = DEFAULT_STATIONS,
    weather_path: Path = DEFAULT_WEATHER,
    holidays_path: Path = DEFAULT_HOLIDAYS,
    output_dir: Path = SYNTH_DIR,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    seed = int(cfg["random_seed"])
    version = str(cfg["generation_version"])
    method = str(cfg["generation_method"])
    start_date = str(cfg["start_date"])
    end_date = str(cfg["end_date"])
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    stations = pd.read_csv(stations_path, dtype={"station_id": str, "district": str, "simulation_profile": str})
    eligible = stations[stations["eligible_for_simulation"].astype(str).str.lower().isin(["true", "1", "yes"])].copy()
    eligible = eligible.sort_values("station_id").reset_index(drop=True)

    weather = pd.read_csv(weather_path)
    weather_lookup = {
        (str(r["district"]), str(r["date"])): (
            float(r["temp_mean_c"]) if pd.notna(r["temp_mean_c"]) else 28.0,
            float(r["precipitation_mm"]) if pd.notna(r["precipitation_mm"]) else 0.0,
        )
        for _, r in weather.iterrows()
    }

    holidays = pd.read_csv(holidays_path)
    holiday_lookup = {
        str(r["date"]): (
            bool(r["is_public_holiday"]),
            bool(r["is_festival"]),
            str(r["holiday_name"]),
        )
        for _, r in holidays.iterrows()
    }

    dates = pd.date_range(start_date, end_date, freq="D")
    n_days = len(dates)
    rng = np.random.default_rng(seed)

    profile_cfgs = cfg["profiles"]
    sup_cfg = cfg["supply_and_outage"]

    demand_sales_rows = []
    supply_outage_rows = []

    # Precompute date arrays
    date_strs = [d.strftime("%Y-%m-%d") for d in dates]
    dows = [int(d.dayofweek) for d in dates]
    day_names = [d.day_name() for d in dates]
    doys = np.array([int(d.dayofyear) for d in dates], dtype=float)
    months = [int(d.month) for d in dates]
    years = [int(d.year) for d in dates]

    for _, st in eligible.iterrows():
        sid = str(st["station_id"])
        district = str(st["district"])
        profile = str(st.get("simulation_profile", "general"))
        if profile not in profile_cfgs:
            profile = "general"
        pcfg = profile_cfgs[profile]

        base_lo, base_hi = pcfg["base_kg_range"]
        base_demand = float(rng.uniform(base_lo, base_hi))
        phase_shift = float(rng.uniform(-20.0, 20.0))
        noise_sd = float(rng.uniform(0.035, 0.065))

        # Autocorrelated latent demand factor (AR(1), rho=0.72) for realistic temporal continuity
        ar_state = 0.0
        rho = 0.72

        for idx in range(n_days):
            d_str = date_strs[idx]
            dow = dows[idx]

            # Seasonality + growth drift
            dow_mult = pcfg["weekday_multipliers"][dow]
            annual_season = 1.0 + 0.06 * np.cos(2.0 * np.pi * (doys[idx] - 15.0 + phase_shift) / 365.25)
            growth_drift = 1.0 + (pcfg["annual_growth_rate"] * (idx / 365.25))

            # External holiday / festival multipliers
            is_pub_hol, is_fest, event_name = holiday_lookup.get(d_str, (False, False, ""))
            cal_mult = 1.0
            if is_fest:
                cal_mult *= pcfg["festival_multiplier"]
            elif is_pub_hol:
                cal_mult *= pcfg["holiday_multiplier"]

            # External weather effect (Open-Meteo district temperature & rainfall)
            temp_c, precip_mm = weather_lookup.get((district, d_str), (28.0, 0.0))
            rain_adj = max(-0.18, pcfg["rain_sensitivity"] * min(precip_mm, 80.0))
            heat_adj = max(-0.04, min(0.08, pcfg["heat_sensitivity"] * (temp_c - 27.0)))
            weather_mult = 1.0 + rain_adj + heat_adj

            # AR(1) temporal noise
            ar_state = rho * ar_state + float(rng.normal(0.0, noise_sd))
            noise_mult = max(0.72, min(1.32, 1.0 + ar_state + float(rng.normal(0.0, 0.025))))

            sim_demand = round(
                max(50.0, base_demand * dow_mult * annual_season * growth_drift * cal_mult * weather_mult * noise_mult),
                2,
            )

            # Separate simulated supply & compressor outage
            if rng.random() < sup_cfg["constrained_supply_prob"]:
                sup_factor = float(rng.uniform(*sup_cfg["constrained_supply_range"]))
            else:
                sup_factor = float(rng.uniform(*sup_cfg["nominal_supply_buffer_range"]))
            sim_supply = round(max(0.0, sim_demand * sup_factor), 2)

            outage_flag = bool(rng.random() < sup_cfg["compressor_outage_prob"])
            outage_factor = (
                round(float(rng.uniform(*sup_cfg["outage_capacity_factor_range"])), 3)
                if outage_flag
                else 1.0
            )
            effective_supply = round(sim_supply * outage_factor, 2)

            # Sales strictly constrained by effective available supply
            sim_sales = round(min(sim_demand, effective_supply), 2)
            unmet_demand = round(max(0.0, sim_demand - sim_sales), 2)

            demand_sales_rows.append({
                "station_id": sid,
                "source_station_id": sid,
                "district": district,
                "date": d_str,
                "simulated_demand_kg": sim_demand,
                "simulated_sales_kg": sim_sales,
                "simulated_available_supply_kg": sim_supply,
                "effective_supply_kg": effective_supply,
                "unmet_demand_kg": unmet_demand,
                "compressor_outage_flag": outage_flag,
                "day_of_week": day_names[idx],
                "is_weekend": bool(dow >= 5),
                "month": months[idx],
                "year": years[idx],
                "is_public_holiday": is_pub_hol,
                "is_festival": is_fest,
                "event_name": event_name,
                "simulation_profile": profile,
                "data_type": "synthetic",
                "generation_method": method,
                "generation_version": version,
                "random_seed": seed,
                "generated_at": generated_at,
            })

            supply_outage_rows.append({
                "station_id": sid,
                "source_station_id": sid,
                "date": d_str,
                "simulated_available_supply_kg": sim_supply,
                "compressor_outage_flag": outage_flag,
                "outage_capacity_factor": outage_factor,
                "effective_supply_kg": effective_supply,
                "data_type": "synthetic",
                "generation_method": method,
                "generation_version": version,
                "random_seed": seed,
                "generated_at": generated_at,
            })

    df_sales = pd.DataFrame(demand_sales_rows)
    df_supply = pd.DataFrame(supply_outage_rows)

    output_dir.mkdir(parents=True, exist_ok=True)
    df_sales.to_csv(output_dir / "synthetic_daily_demand_sales.csv", index=False, encoding="utf-8")
    df_supply.to_csv(output_dir / "synthetic_supply_outages.csv", index=False, encoding="utf-8")
    return df_sales, df_supply


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Gujarat 151-station synthetic CNG datasets.")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--stations", type=Path, default=DEFAULT_STATIONS)
    parser.add_argument("--weather", type=Path, default=DEFAULT_WEATHER)
    parser.add_argument("--holidays", type=Path, default=DEFAULT_HOLIDAYS)
    parser.add_argument("--output-dir", type=Path, default=SYNTH_DIR)
    args = parser.parse_args()

    df_sales, df_supply = generate_dataset(
        config_path=args.config,
        stations_path=args.stations,
        weather_path=args.weather,
        holidays_path=args.holidays,
        output_dir=args.output_dir,
    )
    print(f"Generated {len(df_sales):,} demand/sales rows across {df_sales['station_id'].nunique()} stations.")
    print(f"Date range: {df_sales['date'].min()} to {df_sales['date'].max()}")
    print(f"Outage days: {int(df_supply['compressor_outage_flag'].sum()):,}")
    print(f"Supply-constrained days (sales < demand): {int((df_sales['simulated_sales_kg'] < df_sales['simulated_demand_kg']).sum()):,}")


if __name__ == "__main__":
    main()
