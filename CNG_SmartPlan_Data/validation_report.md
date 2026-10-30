# CNG SmartPlan — Validation Report

**Validation run date:** 2026-10-29  
**Package:** Ahmedabad, Gujarat, India — PS000002  
**Validator:** `validate_package.py`  
**Synthetic generator:** `generate_synthetic_data.py` (fixed seed 20241029)

> **Interpretation:** Passing these tests confirms technical consistency of the included files. It does not mean the real station inventory is complete, coordinates are verified, or synthetic values represent actual station operations.

## 1. Validation result

**PASS — 10 automated check groups. No technical integrity checks failed.**

- PASS: Required core files, scripts, README and optional infrastructure file exist (11 files).
- PASS: Station master: 12 distinct source-backed directory records; 11 locality-screened rows eligible for synthetic demonstration; no approved coordinates.
- PASS: Coordinate review queue: 8 candidate points from secondary sources; all remain unapproved for production map pins.
- PASS: Daily synthetic sales: 8,041 rows, exact 2024-01-01 through 2025-12-31 coverage, no duplicate station-date keys or negative values.
- PASS: Synthetic supply: 8,041 rows; exact one-to-one station-date match with daily sales; nonnegative quantities.
- PASS: Hourly synthetic demand: 2,160 rows; up to three stations; 24 rows per station-day; daily reconciliation max difference 0.00000 kg.
- PASS: Optional infrastructure context: 4 sourced indicators; geographic scope and periods preserved in notes.
- PASS: Provenance: 18 source/method records; 8 documented data gaps; no blank source URL except the internal simulation method.
- PASS: Data dictionary: covers all 9 CSV files and every column, including its own schema; no stale entries.
- PASS: Synthetic-only baseline: chronological 28-day rolling mean; test period 2025-10-03 through 2025-12-31; n=990 station-days; MAE=150.55 kg/day, RMSE=189.69 kg/day, sMAPE=11.41%.

## 2. CSV row and column counts

| File | Rows | Columns |
|---|---:|---:|
| `cng_stations.csv` | 12 | 22 |
| `data_dictionary.csv` | 103 | 9 |
| `data_gaps.csv` | 8 | 8 |
| `data_sources.csv` | 18 | 13 |
| `optional/cng_infrastructure.csv` | 4 | 12 |
| `station_coordinate_candidates.csv` | 8 | 12 |
| `synthetic_daily_sales.csv` | 8,041 | 12 |
| `synthetic_hourly_demand.csv` | 2,160 | 10 |
| `synthetic_supply.csv` | 8,041 | 5 |

## 3. Key record counts

- Station master: **12** rows.
- Locality-screened records included in synthetic time series: **11**.
- Coordinate candidates: **8**, with **0 approved** for production map use.
- Daily synthetic sales: **8,041** rows.
- Synthetic planned supply: **8,041** rows.
- Synthetic hourly demand: **2,160** rows across **3** stations.
- Contextual infrastructure indicators: **4** rows.
- Station-days where simulated supply is below simulated sales: **1,628** (scenario output only).

### Station operator-field counts

| Operator field | Records |
|---|---:|
| not established | 10 |
| Gujarat Energy Limited (formerly Gujarat Gas Limited) | 2 |

## 4. Synthetic forecasting-readiness check

A simple baseline was evaluated without random shuffling: each test-day prediction is the mean of the prior 28 days for the same station. The chronological test period is 2025-10-03 through 2025-12-31.

| Metric | Result |
|---|---:|
| Test observations | 990 station-days |
| MAE | 150.55 kg/day |
| RMSE | 189.69 kg/day |
| sMAPE | 11.41% |

These are **synthetic-demo evaluation metrics only**. They do not establish model performance on real CNG sales. A seven-day forecast can be generated technically, but its operational usefulness cannot be inferred from simulated inputs.

## 5. Remaining data-readiness limitations

- No station in cng_stations.csv has independently verified latitude/longitude; the primary master intentionally leaves both fields blank.
- All eight points in station_coordinate_candidates.csv are secondary-source leads and are explicitly barred from production map pins until independently checked.
- The 12-row station master is a source-backed subset, not a complete census of Ahmedabad CNG stations. Eleven rows are locality-screened in-scope; one fringe row is uncertain and excluded from simulation.
- All historical sales, planned supply and hourly demand values are synthetic. The baseline metrics above measure only simulation behavior, not actual Ahmedabad operating accuracy.
- No reusable Ahmedabad-specific Vahan registration export, actual station-day sales/supply data, verified full station network, or dated/processed AMC boundary was obtained for this package.
- PPAC context indicators use historical or broader authorized-area/national scopes and must not be interpreted as a current AMC-only station count.
- optional/vehicle_registrations.csv was intentionally not created because no suitable Ahmedabad-specific export was retrieved; no empty placeholder file is included.
- optional/official_holidays.csv was intentionally not created because a complete, sourced 2024-2025 Gujarat holiday table was not retrieved; holiday and event fields remain unassigned in the simulation.

## 6. Practical readiness decision

- **Ready:** synthetic forecasting experiments, supply-alert UI logic, hourly profile visualization, CSV ingestion and prototype demonstrations.
- **Not ready:** production station map pins, distance-based nearest-station analysis, geospatial candidate rankings, evidence-backed new-station impact prediction, or claims about real-world forecast accuracy.
- **Required next inputs:** verified station coordinates and a dated Ahmedabad urban boundary; a more complete cross-operator station inventory; and, for operational validation, authorized historical station-level sales and supply data.

## 7. Technical note

The generator never modifies `cng_stations.csv`. It uses only rows with `in_study_area=yes`, leaves holiday/event values unassigned unless a properly sourced `optional/official_holidays.csv` is added, and labels generated observations `data_type=synthetic`.
