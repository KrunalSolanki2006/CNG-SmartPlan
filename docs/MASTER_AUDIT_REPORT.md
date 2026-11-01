# CNG SmartPlan — Master Full-Stack Audit Report
**Problem Statement:** PS000002 — Station-Level Demand Forecasting for CNG Sales to Optimize Network Expansion  
**Date of Audit:** November 1, 2026  
**Auditor / Role:** Senior Full-Stack Product & Forecasting Engineer, Geospatial Auditor, API Architect, QA Lead  
**Audit Scope:** End-to-end repository audit covering `server/`, `client/`, `CNG_SmartPlan_Data/`, and shared `docs/`.

---

## 1. Executive Summary

This audit evaluated **CNG SmartPlan** against the official PS000002 requirements, the canonical `docs/API_CONTRACT.md`, `docs/DATA_PROVENANCE.md`, and the 8 critical data-trust defects identified during integrated full-stack review.

### Core Audit Findings:
1. **Source Data Immutability:** All 9 CSV files and the `validate_package.py` validator in `CNG_SmartPlan_Data/` are 100% intact with identical SHA256 hashes. No original source records or validation reports were overwritten or modified.
2. **Data-Trust Defect Remediation:** All 8 identified defects (Sections 3.1 through 3.8) have been comprehensively resolved across backend schemas, services, API contracts, frontend components, and test suites.
3. **Acceptance Test Verification:**
   - **Backend:** 73/73 tests passing in `pytest server/tests/ -v`.
   - **Frontend:** 73/73 tests passing in `vitest run` across 9 test files.
   - **Type Safety:** 0 errors in TypeScript compilation (`tsc --noEmit`).
   - **Production Readiness:** Vite production bundle builds cleanly in 10.10s (`vite build`).
   - **Package Validation:** All 10 check groups pass in `python CNG_SmartPlan_Data/validate_package.py`.

---

## 2. Comprehensive Defect Resolution Log

### Defect 3.1: Stale Forecast Dates & Missing Historical Replay Notice
- **Issue:** Historical synthetic sales end on `2025-12-31`. Earlier versions projected future horizons without explicitly documenting the historical cutoff date, causing potential confusion regarding whether predictions represented real-time operations.
- **Root Cause:** Absence of explicit origin metadata in `ForecastResponse`.
- **Resolution:**
  - Extended `server/schemas/forecast.py` and `docs/API_CONTRACT.md` with:
    - `forecast_origin_date: "2025-12-31"`
    - `data_through_date: "2025-12-31"`
    - `target_start_date: "2026-01-01"`
    - `is_historical_replay: true`
    - `historical_demo_notice: "Historical synthetic demo — source data ends 31 Dec 2025; forecast shown from 1 Jan 2026. Not a current operational forecast."`
  - Added prominent banner in `client/src/pages/ForecastPage.tsx` and historical replay indicator in `client/src/components/dashboard/ForecastSummaryCard.tsx`.
  - Added unit test `test_forecast_origin_dates_and_historical_replay_notice` in `server/tests/test_forecast_service.py`.

---

### Defect 3.2: Future Supply Missing — Missing Is Not Zero
- **Issue:** When forecasting dates beyond 2025-12-31 without a user override, `planned_supply_kg` was set to `None`, but `supply_data_origin` defaulted to `"synthetic_demo"`. Missing supply was at risk of being conflated with zero supply or treated as an outage.
- **Root Cause:** Incomplete coverage classification in supply check service.
- **Resolution:**
  - Updated `server/services/supply_service.py` and `server/schemas/supply.py`:
    - Dates without supply or override now return `supply_data_origin: "unavailable"` and `supply_status: "unavailable"`.
    - Added summary coverage metrics: `days_covered`, `days_missing_supply`, `active_user_overrides_count`, `dates_requiring_override`.
    - Clarified operational alert label as `alert_label: "Potential Planning Shortfall"`.
  - Updated `client/src/components/alerts/SupplySummaryCards.tsx` and `SupplyComparisonTable.tsx` to prominently show coverage gaps with an "Override Needed" badge.
  - Added unit test `test_supply_check_coverage_summary_metrics` in `server/tests/test_supply_service.py`.

---

### Defect 3.3: Provisional Coordinate Envelope Phrasing
- **Issue:** `ProposedLocationPanel.tsx` claimed `"Coordinates are within the validated Ahmedabad study boundary (22.85°N-23.25°N, 72.40°E-72.75°E)"`. Official municipal GIS boundaries (AMC polygon) are not part of the dataset.
- **Root Cause:** Conflation between an exploratory coordinate view envelope and a validated legal municipality boundary.
- **Resolution:**
  - Replaced text in `client/src/components/map/ProposedLocationPanel.tsx` with:
    `"Coordinates fall within the provisional coordinate envelope (approximate view range: 22.85°N–23.25°N, 72.40°E–72.75°E). Municipal boundary verification is unavailable (official AMC GIS polygon is not validated in dataset)."`
  - Updated test regex assertion in `client/src/__tests__/Milestone4Map.test.tsx`.

---

### Defect 3.4: Prediction Intervals vs Fixed ±15% Static Wording
- **Issue:** `client/src/components/forecast/ForecastChart.tsx` hardcoded the confidence interval legend label as `Confidence Band (85-115%)`. The backend actually calculates an empirical 95% prediction interval using in-sample Holt-Winters residual standard error ($\pm 1.96 \times \text{SE}_h$).
- **Root Cause:** Stale UI mockup legend string remaining from early prototype scaffolding.
- **Resolution:**
  - Relabeled in `client/src/components/forecast/ForecastChart.tsx` to:
    `"Calibrated Prediction Interval (95% Empirical Residuals)"`.
  - Updated fixture documentation in `client/src/fixtures/forecastFixture.ts`.

---

### Defect 3.5: Inaccurate "Live" Language in Static Prototype
- **Issue:** `client/src/pages/DashboardPage.tsx` and `DataQualityFlagsBanner.tsx` referred to "Live overview telemetry" and "Live Data Provenance & Verification Audit".
- **Root Cause:** Aspirational copy suggesting real-time streaming telemetry rather than prototype snapshot data.
- **Resolution:**
  - In `DashboardPage.tsx`: Replaced with `"Current prototype data snapshot connecting station inventory, synthetic time series, and data quality flags."`
  - In `DataQualityFlagsBanner.tsx` and `Milestone2Dashboard.test.tsx`: Replaced with `"Data Provenance & Verification Audit"`.

---

### Defect 3.6: Impact Simulator Sensitivity Table & Before/After Network Totals
- **Issue:**
  1. The reference benchmark case ($5,000\text{ kg/day}$ capacity, $81\%$ capture, $60\%$ diversion $\rightarrow 1,620\text{ kg/day}$ net) lacked a direct 1-click preset and automated verification.
  2. The UI lacked a multi-scenario sensitivity table comparing outcomes across varying capture and diversion rates.
  3. The UI only displayed station-level throughput without showing the network baseline before vs. after.
- **Resolution:**
  - Updated `server/schemas/impact.py` and `server/services/impact_service.py`:
    - Added `network_baseline_daily_demand_kg: 14081.2` and `scenario_network_daily_demand_kg: baseline + net_additional`.
    - Added `sensitivity_analysis` computing 12 combinations of capture ($20\%, 35\%, 50\%, 81\%$) and diversion ($40\%, 60\%, 80\%$).
  - Added `SimulatorSensitivityTable.tsx` component with interactive scenario selection and active-cell highlighting.
  - Added Before & After Network Totals cards in `client/src/components/simulator/SimulatorResultsCards.tsx`.
  - Added 1-click Quick Preset in `client/src/components/simulator/SimulatorInputsPanel.tsx`.
  - Added tests `test_impact_simulation_screenshot_benchmark_arithmetic_and_sensitivity` in `server/tests/test_impact_service.py` and `AT-I04` in `client/src/__tests__/Milestone5Simulator.test.tsx`.

---

### Defect 3.7 & 3.8: Station Verification Statuses & Metric Scope Disclaimers
- **Issue:** Directory listings, brand inferences, and spatial coordinates risked being conflated. Overview metrics risked misunderstanding $14,081.2\text{ kg/day}$ as a single station's sales rather than the network daily sum.
- **Resolution:**
  - Clarified KPI labels in `client/src/components/dashboard/OverviewKPIs.tsx`:
    - KPI 3: `"Network Mean Daily Total (11 stations)"` ($14,081.2\text{ kg/day}$ synthetic sales sum across all 11 stations).
    - KPI 4: `"Synthetic Constrained-Supply Days"` ($1,628$ station-days).
  - Maintained strict station status separation in `StationInventoryTable.tsx`:
    - Directory source status: `government_opendata` (GEL + HPCL).
    - Coordinate verification status: `candidate_only_not_verified` ($0$ verified pins, coordinates blank in master).
    - Study area status: 11 Yes, 1 Uncertain (AMD010).

---

## 3. Test Verification Matrix

| Test Suite | Environment | Total Tests | Passed | Failed | Status |
|---|---|---|---|---|---|
| `server/tests/` | Python 3.13 / pytest | 73 | 73 | 0 | **PASS** |
| `client/src/__tests__/` | Node / Vitest | 73 | 73 | 0 | **PASS** |
| TypeScript Typecheck | `tsc --noEmit` | N/A | Clean | 0 | **PASS** |
| Vite Production Build | Vite 5.4.21 | N/A | 10.10s | 0 | **PASS** |
| Data Package Validator | Python 3.13 | 10 groups | 10 | 0 | **PASS** |

---

## 4. Known Residual Limitations

1. **Station Coordinates:** 0 of 12 stations have verified coordinates. Secondary coordinates from `station_coordinate_candidates.csv` remain strictly in quarantine review and are not plotted as confirmed pins.
2. **Municipal Boundary:** The official AMC municipal boundary GIS polygon is not provided in public open data. The geographic envelope $[22.85^\circ\text{N}–23.25^\circ\text{N}, 72.40^\circ\text{E}–72.75^\circ\text{E}]$ is an exploratory bounding envelope.
3. **Sales & Supply:** Daily sales and planned deliveries are synthetic simulation models designed for planning logic demonstration. No claims of real-world forecasting accuracy are made.
