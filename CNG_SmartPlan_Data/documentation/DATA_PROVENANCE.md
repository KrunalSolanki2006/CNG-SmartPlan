# FUELCAST — Data Provenance & Directory Governance

**Generated:** 2026-11-25  
**Scope:** 151 Verified Gujarat CNG Stations (`2024-01-01` through `2026-11-24`)

## 1. Directory Structure

```text
CNG_SmartPlan_Data/
  reference/       # Canonical real_public verified station master & exclusions log
  external/        # Real external datasets (weather, holidays/festivals, macro context)
  synthetic/       # Reproducible synthetic demand, sales, supply, and outage series
  documentation/   # Audit, provenance, external source, and generation documentation
```

Original baseline package files in `CNG_SmartPlan_Data/` (`cng_stations.csv`, `synthetic_daily_sales.csv`, `synthetic_supply.csv`, `synthetic_hourly_demand.csv`, `station_coordinate_candidates.csv`, `data_dictionary.csv`, `data_gaps.csv`, `data_sources.csv`, `validation_report.md`) are **preserved unmodified**.

## 2. Provenance Separation Rules

| Layer | `data_type` / `data_origin` | Source | Description |
| :--- | :--- | :--- | :--- |
| Station Master | `real_public` | `gujarat_network_stations.json`, `discovered_cng_stations_gujarat.json` | 151 `VERIFIED_OPERATING_CNG` outlets across 12 Gujarat districts |
| Weather | `real_public` | Open-Meteo Historical Weather API | 12,708 district-day observations (`2024-01-01` to `2026-11-24`) |
| Holidays & Festivals | `real_public` | Gujarat GAD Notifications | 65 public holidays and major Gujarat festivals (`2024`–`2026`) |
| Macro Context | `real_public` | VAHAN / PPAC / PNGRB | State-level CNG penetration and infrastructure indicators |
| Demand, Sales, Supply & Outages | `synthetic` | `generate_gujarat_synthetic.py` | 159,909 station-day records (`seed=20261125`, `v2.0.0`) |

## 3. Mandatory Row-Level Provenance Fields (Synthetic)

Every synthetic row includes:
- `data_type = "synthetic"`
- `generation_method = "gujarat_multi_profile_ar1_weather_holiday_simulation_v2"`
- `generation_version = "2.0.0"`
- `random_seed = 20261125`
- `generated_at` (UTC ISO 8601 timestamp)
- `source_station_id` (foreign key to `reference/gujarat_verified_stations.csv`)

**Strict Rule:** Simulated sales (`simulated_sales_kg`) and simulated demand (`simulated_demand_kg`) must never be presented as real observed CNG station meter data.
