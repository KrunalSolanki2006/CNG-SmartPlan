# CNG SmartPlan — Ahmedabad Data Package

**Prepared/accessed:** 2026-10-29  
**Problem statement:** PS000002 — Station-Level Demand Forecasting for CNG Sales to Optimize Network Expansion.

## What this package can and cannot claim

This is a source-attributed prototype data package. It is **not a complete, coordinate-verified census of every Ahmedabad CNG station**, because the accessible official directories do not expose a complete cross-operator station table with verified point coordinates. It is also **not real station-level sales/supply history**. The time-series CSVs are synthetic and exist to demonstrate development and evaluation workflows only.

The station master contains 12 named records extracted from two official operator directories: two Gujarat Energy (formerly Gujarat Gas) city-locality listings and ten Ahmedabad-address entries from HPCL's official CNG directory. They are marked `partially_verified` because exact coordinates/current physical dispensing state and complete boundary validation are not established for each record. One fringe record at Ognaj / Sardar Patel Ring Road has `in_study_area=uncertain` and is excluded from the synthetic series. A record appearing in a directory is not by itself proof that every field (especially coordinates and geographic inclusion) is fully verified. Two secondary coordinate-candidate page URLs for Visat Automobile and Sharada Petroleum Services use an Adani CNG label while the corresponding primary entries came from the Gujarat Energy directory. This source discrepancy is unresolved; operator/brand attribution must be checked before operator-specific network comparisons.

## Files

### Core station/data files

- `cng_stations.csv` — real-public station inventory with source URLs and blank coordinates where verified point geometry is unavailable. Only rows with `in_study_area=yes` are used as synthetic IDs. Do not fill coordinates by guessing.
- `station_coordinate_candidates.csv` — **research queue only**. It stores points shown by secondary CNGbunk station pages for a subset of the station master. Some pages explicitly say CNG dispensing is unconfirmed, and those pages are not an authoritative map validation. Every row has `approved_for_map_pin=no`. Independently verify each address and point before copying any coordinate into the master.
- `synthetic_daily_sales.csv` — simulated sales (kg/day) for every eligible station from 2024-01-01 through 2025-12-31 (731 days per station).
- `synthetic_supply.csv` — simulated planned available supply in kg/day, one row per station and date; not actual deliveries, inventory, or operator plans.
- `synthetic_hourly_demand.csv` — simulated hourly demand for up to three station profiles for the last 30 days of 2025. It is normalized so the 24 hourly values sum to the matching synthetic daily total (within 0.011 kg tolerance).

### Provenance and supporting files

- `data_sources.csv` — sources actually reviewed, what was extracted, source scope and limitations.
- `data_gaps.csv` — important data still unavailable / not verified.
- `data_dictionary.csv` — field definitions for every column in the core and supporting CSV files (including this dictionary's own schema).
- `optional/cng_infrastructure.csv` — historical/source-attributed context only. Three Ahmedabad-related metrics are dated 2021-09-30 and use different authorized-area definitions; one 2026 metric is India-wide. These are **not current AMC-only counts**.
- `generate_synthetic_data.py` — deterministic generation script; never writes to `cng_stations.csv`.
- `validate_package.py` — cross-file integrity tests and a synthetic-only baseline evaluation.
- `README.md` and `validation_report.md` — usage and the latest validation results.

No `vehicle_registrations.csv` or `official_holidays.csv` is included because a usable source-backed Ahmedabad-specific registration export and complete official holiday table were not obtained. Missing holiday flags remain blank in the synthetic daily file instead of inventing festival/holiday effects.

## Quick start

Install dependencies:

```bash
python -m pip install pandas numpy
```

From this folder, regenerate the synthetic series:

```bash
python generate_synthetic_data.py
```

Run package validation:

```bash
python validate_package.py
```

The generator uses a fixed random seed (`20241029`). It reads only station rows marked `in_study_area=yes`. At present, 11 rows are used for simulation; Ognaj / Sardar Patel Ring Road is excluded because its study-boundary inclusion is uncertain. The generated sales, supply, and hourly files will be deterministic for the same input rows/script version.

## Data relationships

- `cng_stations.station_id` is the station key.
- `synthetic_daily_sales` has a unique `(station_id, date)` key.
- `synthetic_supply` must have exactly the same `(station_id, date)` keys as daily sales.
- `synthetic_hourly_demand` has a unique `(station_id, datetime)` key and 24 rows for each included station-day in the 30-day hourly slice.
- `station_coordinate_candidates.station_id` references the master, but the candidate latitude/longitude must not be treated as production-ready coordinates.
- Use ISO date strings (`YYYY-MM-DD`). `datetime` is local Ahmedabad clock time with no timezone suffix; it is simulated time, not measured timestamps.

Example pandas join:

```python
import pandas as pd
sales = pd.read_csv('synthetic_daily_sales.csv', parse_dates=['date'])
supply = pd.read_csv('synthetic_supply.csv', parse_dates=['date'])
joined = sales.merge(supply, on=['station_id', 'date'], validate='one_to_one')
joined['potential_shortfall_kg'] = (
    joined['synthetic_sales_kg'] - joined['planned_available_supply_kg']
).clip(lower=0)
```

For the actual website, compare **forecast demand** (not historic synthetic sales) against a planned supply value for the forecast date. Label any resulting alert a *potential planning shortfall*, not proof of a stockout.

## Forecast demonstration guidance

Use a chronological split, for example train on the earlier dates and test on the final months. Never randomly shuffle dates for the principal time-series evaluation. Compare a model to a simple baseline such as the mean of the previous 28 days. Any error metrics from this package apply only to simulated series; they are not evidence that real Ahmedabad CNG demand is predictable at the same error level.

## How each file supports the PS000002 features

1. **Demand forecasting:** synthetic daily history supports a pipeline smoke test and basic baseline/model comparison.
2. **Supply alert demonstration:** simulated supply lets you exercise the shortfall calculation; actual supply must replace it before operational use.
3. **Station map and candidate ranking:** not ready for real map pins. The primary station master has blank coordinates until verified. Coordinate candidates are research leads only. The complete, dated AMC boundary was not loaded and tested in this package.
4. **New-station impact simulation:** can be prototyped using adjustable assumptions, but should not calculate distance to a candidate coordinate until the existing station points are verified. Demand capture/diversion is a scenario assumption, not an observed fact.
5. **Forecast reliability:** display whether a series is synthetic/real, history length, missingness, out-of-sample synthetic metrics and explicit warnings. Do not convert the current simulation into a claim about actual operating accuracy.
6. **Long-term scenarios:** vehicle registrations, traffic, land use, actual fuel prices at relevant stations, EV adoption and new-station changes are not available as a fully joined Ahmedabad-specific dataset here.

## Key definitions

- **Historical sales:** recorded quantity dispensed during a past period; not present in this package as real station data.
- **Synthetic sales:** simulated kg/day created by the Python script.
- **Forecast demand:** a model's estimate for a future date; generated by the application/model, not stored here as observed data.
- **Planned available supply:** assumed quantity available for the day in the synthetic planning scenario; not actual station stock or delivery.
- **Potential planning shortfall:** `max(0, forecast_demand_kg - planned_available_supply_kg)`.
- **Net additional network demand:** `estimated_new_station_demand - estimated_demand_diverted_from_existing_stations`; both components need explicit assumptions.

## Licensing and attribution

Operator directory terms were not independently assessed; retain source URLs and attribution and confirm reuse permissions before public redistribution. The DataMeet municipal spatial data page states CC BY 4.0. OpenStreetMap-derived sources require appropriate attribution and ODbL compliance if their data is reused. The secondary coordinate review queue is not a substitute for authoritative spatial data.

## Critical remaining inputs for real-world validation

Request an authorized, documented dataset from Gujarat Gas and/or other relevant operators containing station ID, date/time, CNG quantity in kg, sales/dispensing status and data-quality markers, plus planned supply/deliveries where appropriate. Also obtain verified coordinates and a suitable dated AMC boundary. For richer site ranking, add matched vehicle/RTO, accessibility, traffic, land-use and site feasibility indicators with clear scope, licensing and reporting period.
