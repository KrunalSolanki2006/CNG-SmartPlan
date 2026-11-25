# FUELCAST — Station Inventory Audit (151 Verified Gujarat Stations)

**Audit Date:** 2026-11-25  
**Canonical Output:** `CNG_SmartPlan_Data/reference/gujarat_verified_stations.csv`  
**Exclusions Log:** `CNG_SmartPlan_Data/reference/station_inventory_exclusions.csv`

## 1. Source Inventory Reconciliation

| Source File | Total Rows | Verified (`VERIFIED_OPERATING_CNG`) | Excluded / Non-Verified | Notes |
| :--- | ---: | ---: | ---: | :--- |
| `server/data/curated/gujarat_network_stations.json` | 23 | 22 | 1 (`POTENTIAL_CNG`) | Includes the 11 eligible Ahmedabad baseline stations (`AMD001`–`AMD009`, `AMD011`, `AMD012`) |
| `server/data/curated/discovered_cng_stations_gujarat.json` | 227 | 129 | 98 (`25` `POTENTIAL_CNG`, `73` `NOT_CNG`) | SerpApi multi-city Gujarat audit |
| `CNG_SmartPlan_Data/cng_stations.csv` | 12 | 11 *(already in network JSON)* | 1 (`AMD010`, `in_study_area=uncertain`) | `AMD010` excluded from simulation |
| **Canonical Verified Master** | **151** | **151** | **100 total exclusions logged** | **Zero `station_id` or `place_id` overlap** |

## 2. Integrity & Quality Findings

- **Unique `station_id`:** `151 / 151` unique.
- **Unique `place_id`:** `151 / 151` unique.
- **Coordinates:** `0` null latitudes or longitudes; bounds `20.3394°–23.7496° N`, `69.8702°–73.4004° E`.
- **District Coverage (`12` districts, `0` missing):**
  - Ahmedabad (`30`), Surat (`21`), Vadodara (`17`), Rajkot (`15`), Bharuch (`14`), Anand (`13`), Mehsana (`12`), Jamnagar (`8`), Bhavnagar (`7`), Valsad (`6`), Navsari (`5`), Kutch (`3`).
- **Missing Operator Metadata:** `129` discovered stations lack an explicit operator field in `discovered_cng_stations_gujarat.json` and are recorded as `not_established` rather than fabricated.
- **Near-Duplicate Coordinates (`< ~50m`):** Two pairs share close proximity (`DISC_VAD_041` / `DISC_VAD_046` in Vadodara; `DISC_BHA_150` / `DISC_BHA_159` in Bharuch) with distinct `place_id` and station names; both are retained and flagged.
- **Simulation Profile Assignment:** Heuristic keyword-based classification (`urban`: `51`, `general`: `49`, `industrial`: `25`, `highway`: `22`, `suburban`: `4`), explicitly marked `heuristic_address_keyword_classification` — not verified operational telemetry.
