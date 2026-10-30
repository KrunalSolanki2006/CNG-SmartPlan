# CNG SmartPlan — Data Provenance

**Version:** 1.0  
**Date:** 2026-10-30  
**Based on:** Physical inspection of all files in `CNG_SmartPlan_Data/` on 2026-10-30  
**Status:** Authoritative — both developers must label and treat data exactly as described here.

> This is the single canonical data-provenance document. Neither developer may independently
> redefine the classification, label, or treatment of any dataset.

---

## 1. File Inventory with Verified Row and Column Counts

All counts were recalculated from the actual files on 2026-10-30.

| File | Rows | Columns | Classification |
|------|-----:|--------:|----------------|
| `cng_stations.csv` | 12 | 22 | REAL_PUBLIC station inventory |
| `station_coordinate_candidates.csv` | 8 | 12 | RESEARCH_QUEUE — not approved for map use |
| `synthetic_daily_sales.csv` | 8,041 | 12 | SYNTHETIC_DEMO time series |
| `synthetic_supply.csv` | 8,041 | 5 | SYNTHETIC_DEMO time series |
| `synthetic_hourly_demand.csv` | 2,160 | 10 | SYNTHETIC_DEMO time series |
| `data_sources.csv` | 18 | 13 | PROVENANCE record |
| `data_gaps.csv` | 8 | 8 | RESEARCH_GAP register |
| `data_dictionary.csv` | 103 | 9 | SCHEMA documentation |
| `optional/cng_infrastructure.csv` | 4 | 12 | REAL_PUBLIC historical context only |

---

## 2. `cng_stations.csv` — Station Inventory

**Classification:** REAL_PUBLIC  
**Rows:** 12 (data rows, excluding header)  
**Columns:** 22  
**Data origin:** `real_public`

### Sources

| Source ID | Publisher | URL | What was extracted | Access date |
|-----------|-----------|-----|--------------------|-------------|
| SRC001 | Gujarat Energy Limited (formerly Gujarat Gas Limited) | https://www.gujarat-energy.com/cng/cng-stations/ | 2 Chandkheda rows (AMD001, AMD002) | 2026-10-29 |
| SRC002 | Hindustan Petroleum Corporation Limited (HPCL) | https://www.hindustanpetroleum.com/pages/cng | 10 Ahmedabad-address rows (AMD003–AMD012) | 2026-10-29 |

### Stations in the inventory

| station_id | station_name | locality | in_study_area | operator established | coordinates_verified |
|-----------|-------------|---------|--------------|---------------------|---------------------|
| AMD001 | Visat Automobile | Chandkheda / Visat Cross Roads | yes | Gujarat Energy Limited | False |
| AMD002 | Sharada Petroleum Services | Chandkheda / Nigam Nagar | yes | Gujarat Energy Limited | False |
| AMD003 | Purnima Motors | Baug-e-Firdos / Narol-Naroda Highway | yes | Not established | False |
| AMD004 | Mahalakshmi Motor Service | Relief Road / Zakaria Masjid | yes | Not established | False |
| AMD005 | Naroda Automobile Services | Naroda / Vijay Mills | yes | Not established | False |
| AMD006 | Vadilal Maganlal & Co | Shahibaug Road | yes | Not established | False |
| AMD007 | J R Amin & Co | Saijpur Bogha / Naroda Road | yes | Not established | False |
| AMD008 | HP Auto Care Centre Vastrapur | Vastrapur | yes | Not established | False |
| AMD009 | Shah Mehta & Co Khokhra | Khokhra / Anupam Cinema | yes | Not established | False |
| AMD010 | Kanha Petroleum | Ognaj / Sardar Patel Ring Road | **uncertain** | Not established | False |
| AMD011 | Grand Millennium Ahmedabad Satellite | Vejalpur / Jodhpur Village / Satellite | yes | Not established | False |
| AMD012 | Adhoc Satsangi Petroleum | Ghatlodiya / K K Nagar Road | yes | Not established | False |

### Critical facts

- **All 12 `latitude` and `longitude` fields are blank.** No station has verified coordinates.
- **AMD010 is excluded from synthetic simulation** (`in_study_area=uncertain`).
- **AMD001 and AMD002** have an unresolved operator/brand discrepancy: primary records come from the Gujarat Energy directory, but the secondary coordinate-candidate pages use an Adani CNG label.
- The 12-station inventory is **not a complete census** of Ahmedabad CNG stations.
- `verification_status` for all rows: `partially_verified` (directory-listing evidence; no field visit).
- `data_type` for all rows: `real_public`.

### Frontend labelling requirement

Display stations as "Directory-listed station (partially verified)" — never as "verified" or "confirmed operating station."

### Backend treatment

Load `cng_stations.csv` as the master station table. Never assign `eligible_for_map_pin=true` to any row.
Simulate only rows where `in_study_area=yes` (11 rows). AMD010 must never appear in synthetic analysis.

---

## 3. `station_coordinate_candidates.csv` — Research Queue

**Classification:** RESEARCH_QUEUE (not a map layer)  
**Rows:** 8  
**Columns:** 12  
**Data origin:** `secondary_coordinate_candidate`

### Source

| Source ID | Publisher | URL |
|-----------|-----------|-----|
| SRC003 | CNGbunk.com (secondary web directory) | https://cngbunk.com/ |
| SRC011–SRC018 | Individual CNGbunk station-detail pages | See data_sources.csv |

### Candidate coordinates (for inspection reference only)

| station_id | candidate_lat | candidate_lon | approved_for_map_pin | cng_status_conflict |
|-----------|--------------|--------------|---------------------|-------------------|
| AMD001 | 23.1157 | 72.5878 | **no** | Adani CNG label vs. Gujarat Energy primary source |
| AMD002 | 23.1160 | 72.5800 | **no** | Adani CNG label vs. Gujarat Energy primary source |
| AMD003 | 22.9990 | 72.6356 | **no** | Secondary page flags CNG unconfirmed |
| AMD005 | 23.0500 | 72.6236 | **no** | Secondary page flags CNG unconfirmed |
| AMD006 | 23.0415 | 72.5887 | **no** | Secondary page flags CNG unconfirmed |
| AMD007 | 23.0692 | 72.6470 | **no** | Secondary page flags CNG unconfirmed |
| AMD009 | 23.0066 | 72.6128 | **no** | Secondary page flags CNG unconfirmed |
| AMD011 | 23.0178 | 72.5188 | **no** | Secondary page flags CNG unconfirmed |

### Critical rules (mandatory)

- **NONE of these 8 coordinates may be displayed as a confirmed station map pin.**
- **NONE of these coordinates may be used for distance calculations or geographic analysis.**
- This file is a research queue for future independent verification — it is not an approved geospatial dataset.
- AMD004, AMD008, AMD010, AMD012 have no coordinate candidates at all.

### Frontend labelling requirement

Never render these as station markers. If displayed for informational purposes, label as:
"Unverified secondary-source candidate — not confirmed as a station location."

### Backend treatment

Never copy candidate coordinates into the station master. Never use them in distance or spatial calculations.
When `geographic_analysis_available = false`, return the structured unavailable response defined in API_CONTRACT.md.

---

## 4. `synthetic_daily_sales.csv` — Synthetic Time Series

**Classification:** SYNTHETIC_DEMO  
**Rows:** 8,041  
**Columns:** 12  
**Data origin:** `synthetic_demo`  
**Generation:** `generate_synthetic_data.py`, seed 20241029

### Schema

| Column | Type | Unit | Notes |
|--------|------|------|-------|
| `station_id` | string | — | AMD001–AMD012 except AMD010; 11 stations |
| `date` | date | YYYY-MM-DD | 2024-01-01 to 2025-12-31; 731 days per station |
| `synthetic_sales_kg` | float | kg/day | Simulated; not actual sales |
| `day_of_week` | string | — | Derived from date |
| `is_weekend` | boolean | — | True for Saturday/Sunday |
| `month` | integer | — | 1–12 |
| `year` | integer | — | 2024 or 2025 |
| `is_public_holiday` | blank | — | **Intentionally blank in all 8,041 rows** |
| `event_name` | blank | — | **Intentionally blank in all 8,041 rows** |
| `simulation_profile` | string | — | `central_urban`, `commuter_corridor`, `mixed_urban` |
| `data_type` | string | — | `synthetic` in all rows |
| `generation_method` | string | — | Full seed/version description |

### Key statistics (from actual file)

| Metric | Value |
|--------|-------|
| Total rows | 8,041 |
| Unique stations | 11 |
| Unique station-date pairs | 8,041 (no duplicates) |
| Date range | 2024-01-01 to 2025-12-31 |
| Mean synthetic_sales_kg | 1,280.1 kg/day |
| Std synthetic_sales_kg | 283.9 kg/day |
| Min | 564.4 kg/day |
| Max | 2,398.7 kg/day |
| Rows with missing holiday data | 8,041 (all rows) |

### Profile assignment (how the generator assigns stations)

| Profile | Stations | Base demand |
|---------|---------|------------|
| `central_urban` | AMD004 (Relief Road), AMD006 (Shahibaug), AMD009 (Khokhra), AMD012 (Ghatlodiya) | ~1,100 kg/day base |
| `commuter_corridor` | AMD001 (Visat), AMD002 (Chandkheda), AMD003 (Purnima), AMD005 (Naroda), AMD007 (Saijpur) | ~1,350 kg/day base |
| `mixed_urban` | AMD008 (Vastrapur), AMD011 (Satellite/Vejalpur) | ~1,000 kg/day base |

### Mandatory warning text

Every forecast or display showing synthetic_sales_kg must carry this label:
> "⚠ Synthetic demonstration data — not actual station sales records."

---

## 5. `synthetic_supply.csv` — Synthetic Supply

**Classification:** SYNTHETIC_DEMO  
**Rows:** 8,041  
**Columns:** 5  
**Data origin:** `synthetic_demo`

### Schema

| Column | Type | Unit | Notes |
|--------|------|------|-------|
| `station_id` | string | — | Same 11 stations as daily sales |
| `date` | date | YYYY-MM-DD | Same 2024-01-01 to 2025-12-31 range |
| `planned_available_supply_kg` | float | kg/day | Simulated; not actual stock or deliveries |
| `data_type` | string | — | `synthetic` in all rows |
| `generation_method` | string | — | Seed/version description |

### Generation logic

For each station-day: 20% probability of a constrained scenario (factor 0.58–0.94 of synthetic sales);
80% probability of a surplus scenario (factor 1.02–1.20 of synthetic sales).

**Station-days where supply < sales:** 1,628 out of 8,041 (scenario outputs only).

### Frontend labelling requirement

Label all supply values as "Synthetic planned supply — not actual stock or delivery records."
Distinguish clearly from forecast demand. Alert label: "Potential planning shortfall" (not "stockout").

---

## 6. `synthetic_hourly_demand.csv` — Synthetic Hourly Profiles

**Classification:** SYNTHETIC_DEMO  
**Rows:** 2,160  
**Columns:** 10  
**Data origin:** `synthetic_demo`

### Schema

| Column | Type | Unit | Notes |
|--------|------|------|-------|
| `station_id` | string | — | AMD001, AMD004, AMD008 only |
| `datetime` | datetime | local Ahmedabad time | No timezone suffix; simulated |
| `date` | date | YYYY-MM-DD | 2025-12-02 to 2025-12-31 |
| `hour` | integer | 0–23 | Hour of day |
| `hourly_cng_demand_kg` | float | kg/hour | Normalized to daily total within 0.011 kg |
| `day_of_week` | string | — | Derived from datetime |
| `is_weekend` | boolean | — | True for Saturday/Sunday |
| `simulation_profile` | string | — | Station's assigned profile |
| `data_type` | string | — | `synthetic` |
| `generation_method` | string | — | Full description |

### Coverage

| Station | Profile | Reason selected |
|---------|---------|----------------|
| AMD001 | commuter_corridor | First station of this profile |
| AMD004 | central_urban | First station of this profile |
| AMD008 | mixed_urban | First station of this profile |

Period: final 30 calendar days of 2025 (2025-12-02 to 2025-12-31).  
3 stations × 30 days × 24 hours = 2,160 rows.  
Daily reconciliation: max delta = 0.00000 kg (exact, per validation run).

---

## 7. `data_sources.csv` — Provenance Log

**Classification:** PROVENANCE record  
**Rows:** 18  
**Columns:** 13  
**Data origin:** metadata

Records every source actually reviewed. Sources SRC001–SRC002 contributed real station records.
SRC003, SRC011–SRC018 contributed only unverified coordinate candidates.
SRC004–SRC005 contributed historical/national context indicators.
SRC006–SRC009 were reviewed but did not yield usable structured datasets.
SRC010 documents the synthetic generation method (not an external source).

---

## 8. `data_gaps.csv` — Research Gap Register

**Classification:** RESEARCH_GAP register  
**Rows:** 8  
**Columns:** 8

### Documented gaps

| Gap | Project impact |
|-----|----------------|
| Verified station coordinates | No map pins; no distance analysis |
| Verified Ahmedabad municipal boundary | Study-area is locality-screened only |
| Complete cross-operator station inventory | 12-station master is partial |
| Ahmedabad-specific vehicle registrations | No real demand covariate |
| Actual station-level daily/hourly sales | All forecasting uses synthetic data |
| Actual planned supply / deliveries | Supply alerts are synthetic-demo only |
| Official Gujarat holiday calendar 2024–2025 | is_public_holiday blank in all rows |
| Road/accessibility/traffic/land-use indicators | Impact simulator is assumption-based only |

---

## 9. `data_dictionary.csv` — Schema Documentation

**Classification:** SCHEMA documentation  
**Rows:** 103  
**Columns:** 9  
**Coverage:** All 9 CSV files documented; no stale entries as of validation run 2026-10-29.

---

## 10. `optional/cng_infrastructure.csv` — Historical Context

**Classification:** REAL_PUBLIC historical context  
**Rows:** 4  
**Columns:** 12

| record_id | Indicator | Value | Scope | Period |
|-----------|-----------|-------|-------|--------|
| INF001 | CNG stations (Adani authorized area) | 73 | Ahmedabad City + Daskroi | 2021-09-30 |
| INF002 | CNG stations (HPCL area) | 22 | Ahmedabad City (HPCL label) | 2021-09-30 |
| INF003 | CNG stations (Gujarat Gas EAAA) | 8 | Ahmedabad District (EAAA) | 2021-09-30 |
| INF004 | Total CNG stations India-wide | 9,158 | India | 2026-08-31 |

**Critical constraints:**
- These are **historical** indicators. They are **not current AMC-only counts**.
- Different records use different geographic-area definitions that cannot be summed or compared.
- Display with source attribution and the "as on YYYY-MM-DD" date.

---

## 11. Python Scripts

### `generate_synthetic_data.py`

**Classification:** GENERATION SCRIPT — not a forecasting model  
**Dependencies:** pandas, numpy  
**Lines:** 212

- Reads only rows with `in_study_area=yes` from `cng_stations.csv` (11 rows).
- Writes: `synthetic_daily_sales.csv`, `synthetic_supply.csv`, `synthetic_hourly_demand.csv`.
- **Never modifies `cng_stations.csv`.**
- Fixed random seed: 20241029. Output is deterministic.
- Profiles: `central_urban` (base 1,100 kg/day), `commuter_corridor` (1,350 kg/day), `mixed_urban` (1,000 kg/day).
- Seasonal factor: cosine with amplitude 0.055. Slow drift: +0.008% per day.
- Weekday multipliers: Mon 1.02, Tue 1.03, Wed 1.04, Thu 1.02, Fri 1.08, Sat 0.94, Sun 0.78.
- Supply: 20% constrained (0.58–0.94×), 80% surplus (1.02–1.20×) of synthetic sales.
- Hourly: Gaussian peaks at morning (~7–8h) and evening (~18h) with profile-specific amplitude.

### `validate_package.py`

**Classification:** VALIDATION SCRIPT  
**Dependencies:** pandas, numpy  
**Lines:** 329

- Checks: file existence, station schema, unique IDs, coordinate approval status, daily date coverage,
  supply key matching, hourly 24-row structure, daily reconciliation, provenance records, data dictionary coverage.
- Runs the synthetic-only baseline evaluation (28-day rolling mean, chronological test).
- Writes `validation_report.md`.
- **Does not modify any data file.**

---

## 12. Websites Researched and Actual Access Status

| Website / Publisher | URL | Status |
|---------------------|-----|--------|
| Gujarat Energy Limited | https://www.gujarat-energy.com/cng/cng-stations/ | **Used** — 2 rows extracted |
| HPCL | https://www.hindustanpetroleum.com/pages/cng | **Used** — 10 rows extracted |
| CNGbunk.com | https://cngbunk.com/ | **Used for candidate leads only** — 8 unverified points; not approved |
| PPAC Ready Reckoner | https://ppac.gov.in/...ReadyReckoner... | **Used** — historical indicators only |
| PPAC CNG tracker | https://ppac.gov.in/d/Industry_Consumption_Report/NTI= | **Used** — India-wide total only |
| Vahan dashboard | https://www.analytics.parivahan.gov.in/ | **Reviewed only** — no data extracted |
| Adani Total Gas | https://www.adanigas.com/cng | **Reviewed only** — no station table retrieved |
| WhereFUEL / OSM | https://wherefuel.com/lpg/ahmedabad | **Reviewed only** — not used as inventory |
| DataMeet | https://projects.datameet.org/Municipal_Spatial_Data/ahmedabad/ | **Reviewed only** — GeoJSON not processed |

---

## 13. Data Relationships and Joins

```
cng_stations.station_id (PK)
  └── synthetic_daily_sales.(station_id, date)  [unique composite key]
  └── synthetic_supply.(station_id, date)        [exact 1:1 match with daily_sales]
  └── synthetic_hourly_demand.(station_id, datetime) [AMD001, AMD004, AMD008 only]
  └── station_coordinate_candidates.station_id  [research reference only; never join for production]
```

**Joining rule:** Use `(station_id, date)` for daily/supply joins. Validate with `validate='one_to_one'`.
AMD010 never appears in synthetic files. Station_coordinate_candidates rows must never be used to
enrich the station master with coordinates.

---

## 14. How the Frontend Must Label Data

| Data source | Required UI label |
|-------------|------------------|
| `synthetic_demo` | ⚠ Synthetic demonstration data |
| `real_public` (station directory) | Directory-listed station (partially verified) |
| `illustrative_scenario` | Illustrative scenario — user-entered assumptions |
| `user_entered_scenario` | User-entered value |
| Historical PPAC indicators | Historical (2021) — not current AMC-only counts |
| Coordinate candidates | Unverified secondary-source candidate — not confirmed location |
| Evaluation metrics | Synthetic-demo evaluation only — not real-world accuracy |

---

## 15. How the Backend Must Treat Each Source

| File | Treatment |
|------|-----------|
| `cng_stations.csv` | Read-only master; never write or modify; `eligible_for_map_pin=False` for all rows |
| `synthetic_daily_sales.csv` | Training/forecasting input; always tag responses with `data_origin=synthetic_demo` |
| `synthetic_supply.csv` | Comparison input; always label as synthetic; warn if forecast dates exceed 2025-12-31 |
| `synthetic_hourly_demand.csv` | Hourly profile display; AMD001, AMD004, AMD008 only; 2025-12-02 to 2025-12-31 |
| `station_coordinate_candidates.csv` | Never use for map pins or distance calculations; document in data_quality response |
| `optional/cng_infrastructure.csv` | Contextual display only; preserve geographic scope labels; do not present as current |
| `data_sources.csv`, `data_gaps.csv` | Power the `/api/v1/data-quality` endpoint |

---

## 16. Critical Outstanding Data Needs

Before this system can support real operational decisions:

1. **Verified station coordinates** — from operator or authoritative geocoder.
2. **Verified AMC boundary** — to enable proper point-in-polygon validation.
3. **Complete cross-operator inventory** — Gujarat Energy, HPCL, Adani Total Gas reconciled.
4. **Authorized historical station-level sales** — daily or hourly CNG kg dispensed.
5. **Actual supply/delivery records** — to replace synthetic supply data.
6. **Ahmedabad RTO vehicle registration data** — from Vahan by fuel type.
7. **Official holiday calendar 2024–2025** — to enable holiday-effect analysis.
