# CNG SmartPlan — Acceptance Tests

**Version:** 1.0  
**Date:** 2026-10-30  
**References:** `docs/API_CONTRACT.md`, `docs/DATA_PROVENANCE.md`, `docs/PROJECT_SPEC.md`

> These tests define objectively verifiable pass/fail criteria. Run all tests before declaring the
> hackathon prototype complete. Record pass/fail results in the final demo review.

---

## Category 1 — Data Integrity and Provenance

### AT-D01: Station count accuracy

**Setup:** Backend running with CSV data loaded.  
**Action:** `GET /api/v1/stations`  
**Expected:** Response contains `total: 12`, `eligible_for_simulation: 11`, `eligible_for_map_pin: 0`  
**Pass criterion:** All three counts match exactly.

### AT-D02: AMD010 exclusion from simulation

**Setup:** Backend running.  
**Action:** `GET /api/v1/stations?eligible_for_simulation=true`  
**Expected:** No station with `station_id: "AMD010"` in the response `stations` array.  
**Pass criterion:** AMD010 absent from the eligible list.

### AT-D03: No verified coordinates

**Setup:** Backend running.  
**Action:** `GET /api/v1/stations`  
**Expected:** Every station object has `coordinates_verified: false`, `latitude: null`, `longitude: null`.  
**Pass criterion:** All 12 station objects pass this check.

### AT-D04: Map availability unavailable

**Setup:** Backend running.  
**Action:** `GET /api/v1/stations`  
**Expected:** `map_availability.available` is `false`.  
**Pass criterion:** Field is `false`.

### AT-D05: Daily sales row count

**Setup:** Backend running.  
**Action:** `GET /api/v1/data-quality`  
**Expected:** `synthetic_data.daily_sales.rows` equals `8041`.  
**Pass criterion:** Exact match.

### AT-D06: Supply row count

**Setup:** Backend running.  
**Action:** `GET /api/v1/data-quality`  
**Expected:** `synthetic_data.supply.rows` equals `8041`.  
**Pass criterion:** Exact match.

### AT-D07: Hourly data station coverage

**Setup:** Backend running.  
**Action:** `GET /api/v1/hourly-demand`  
**Expected:** `available_stations` contains exactly `["AMD001", "AMD004", "AMD008"]`.  
**Pass criterion:** Exact set match.

### AT-D08: Hourly data date range

**Setup:** Backend running.  
**Action:** `GET /api/v1/hourly-demand`  
**Expected:** `period_start: "2025-12-02"`, `period_end: "2025-12-31"`, `total_records: 2160`.  
**Pass criterion:** All three values match exactly.

### AT-D09: Synthetic data origin labels

**Setup:** Backend running.  
**Action:** `GET /api/v1/stations/AMD001/history`  
**Expected:** `data_origin` equals `"synthetic_demo"`.  
**Pass criterion:** Field is `"synthetic_demo"`.

### AT-D10: data_gaps count

**Setup:** Backend running.  
**Action:** `GET /api/v1/data-quality`  
**Expected:** `data_gaps` array contains at least 8 entries.  
**Pass criterion:** Array length ≥ 8.

---

## Category 2 — API Schema Consistency

### AT-A01: Health endpoint schema

**Setup:** Backend running.  
**Action:** `GET /api/v1/health`  
**Expected:** Response contains `status`, `timestamp`, `data_loaded` with sub-fields `stations`, `eligible_stations`, `daily_sales_rows`, `supply_rows`, `hourly_rows`.  
**Pass criterion:** All required fields present with correct types.

### AT-A02: Stations endpoint schema

**Setup:** Backend running.  
**Action:** `GET /api/v1/stations`  
**Expected:** Each item in `stations` array contains all required fields from `API_CONTRACT.md` Section 3 (`GET /api/v1/stations`).  
**Pass criterion:** No required field missing; no unexpected field.

### AT-A03: Forecast endpoint schema

**Setup:** Backend running.  
**Action:** `POST /api/v1/forecast` with `{"station_id": "AMD001", "horizon_days": 7}`  
**Expected:** Response contains `forecast` array; each forecast point has `date`, `forecast_demand_kg`, `lower_bound_kg`, `upper_bound_kg`, `model`. Response contains `evaluation` with `baseline_mae_kg`, `baseline_rmse_kg`, `baseline_smape_pct`.  
**Pass criterion:** All required fields present.

### AT-A04: Impact simulator schema

**Setup:** Backend running.  
**Action:** `POST /api/v1/impact-simulator` with valid inputs.  
**Expected:** Response contains `assumptions`, `results`, `formulas_applied`, `geographic_analysis`, `warnings`. `geographic_analysis.available` is `false`.  
**Pass criterion:** All required fields present; `geographic_analysis.available = false`.

### AT-A05: Error schema compliance

**Setup:** Backend running.  
**Action:** `GET /api/v1/stations/AMD999/history`  
**Expected:** HTTP 404; response body: `{"error": {"code": "STATION_NOT_FOUND", "message": "...", "fields": null}}`  
**Pass criterion:** HTTP status 404; error object matches exact schema.

### AT-A06: Validation error schema

**Setup:** Backend running.  
**Action:** `POST /api/v1/forecast` with `{"station_id": "AMD001", "horizon_days": 999}`  
**Expected:** HTTP 422; response body contains `error.code: "VALIDATION_ERROR"`.  
**Pass criterion:** HTTP status 422; error code matches.

---

## Category 3 — Forecast Generation and Evaluation

### AT-F01: Chronological train/test split

**Setup:** Backend running.  
**Action:** `POST /api/v1/forecast` with `{"station_id": "AMD001"}`  
**Expected:** `train_period.end` ≤ `"2025-10-02"` and `test_period.start` = `"2025-10-03"`.  
**Pass criterion:** Both date constraints satisfied.

### AT-F02: Baseline metrics match validated results

**Setup:** Backend running.  
**Action:** `POST /api/v1/forecast` with `{"station_id": "AMD001", "model": "rolling_mean_baseline"}`  
**Expected:** `evaluation.baseline_mae_kg` ≈ 150.55 (within ±1 kg), `baseline_rmse_kg` ≈ 189.69 (±2 kg), `baseline_smape_pct` ≈ 11.41 (±0.5%).  
**Pass criterion:** All three metrics within tolerances.

### AT-F03: Forecast horizon count

**Setup:** Backend running.  
**Action:** `POST /api/v1/forecast` with `{"station_id": "AMD001", "horizon_days": 7}`  
**Expected:** `forecast` array contains exactly 7 items.  
**Pass criterion:** Array length = 7.

### AT-F04: No date shuffling (dates in order)

**Setup:** Backend running.  
**Action:** `POST /api/v1/forecast` with `{"station_id": "AMD001"}`  
**Expected:** Dates in `forecast` array are strictly ascending.  
**Pass criterion:** Each date > previous date.

### AT-F05: Synthetic disclaimer present

**Setup:** Backend running.  
**Action:** `POST /api/v1/forecast`  
**Expected:** `reliability.evaluation_note` contains text explaining synthetic-only evaluation.  
**Pass criterion:** Field is non-empty and references synthetic data.

---

## Category 4 — Supply Shortfall Calculation

### AT-S01: Shortfall formula correctness

**Setup:** Backend running; AMD001 supply known to have some shortfall days.  
**Action:** `POST /api/v1/supply-check` with `{"station_id": "AMD001", "horizon_days": 7}`  
**Expected:** For each comparison item, `potential_shortfall_kg = max(0, forecast_demand_kg - planned_supply_kg)` within 0.01 kg.  
**Pass criterion:** Formula verified for all 7 comparison items.

### AT-S02: Shortfall label distinction

**Setup:** Frontend rendering Alerts page.  
**Action:** View supply shortfall alerts.  
**Expected:** UI label reads "Potential planning shortfall" — not "stockout" or "shortage."  
**Pass criterion:** Exact label requirement met.

### AT-S03: Post-2025 date handling

**Setup:** Backend running.  
**Action:** `POST /api/v1/supply-check` with dates beyond 2025-12-31 and no user override.  
**Expected:** `planned_supply_kg` is `null`; `warnings` contains message about supply range.  
**Pass criterion:** `null` supply returned with warning text.

### AT-S04: User override supply respected

**Setup:** Backend running.  
**Action:** `POST /api/v1/supply-check` with `user_supply_overrides: [{"date": "2025-12-31", "supply_kg": 2000.0}]`  
**Expected:** The overridden date uses `planned_supply_kg = 2000.0` and `supply_data_origin = "user_entered_scenario"`.  
**Pass criterion:** Override value used; origin correctly labelled.

---

## Category 5 — Hourly Data Consistency

### AT-H01: 24 rows per station-day

**Setup:** Backend running.  
**Action:** `GET /api/v1/hourly-demand?station_id=AMD001&date=2025-12-15`  
**Expected:** Response contains exactly 24 records (hours 0–23).  
**Pass criterion:** Record count = 24.

### AT-H02: Daily reconciliation

**Setup:** Backend running.  
**Action:** `GET /api/v1/hourly-demand?station_id=AMD001&date=2025-12-15`  
**Expected:** Sum of `hourly_demand_kg` values matches corresponding `synthetic_sales_kg` from `/stations/AMD001/history` for `2025-12-15` within 0.011 kg.  
**Pass criterion:** Absolute difference ≤ 0.011 kg.

---

## Category 6 — Map Eligibility

### AT-M01: Map unavailable state displayed

**Setup:** Frontend running; navigate to Map page.  
**Action:** Page loads.  
**Expected:** Overlay or notice displayed explaining that no verified coordinates are available. No station pins on the map.  
**Pass criterion:** Unavailable state visible; zero station markers.

### AT-M02: OSM attribution present

**Setup:** Frontend running; Map page loaded.  
**Action:** Inspect map viewport.  
**Expected:** "© OpenStreetMap contributors" attribution text visible.  
**Pass criterion:** Attribution present.

### AT-M03: Proposed location selectable

**Setup:** Frontend running; Map page loaded.  
**Action:** Click on the map.  
**Expected:** A marker appears at the clicked location showing lat/lon coordinates.  
**Pass criterion:** Marker appears; coordinates displayed.

---

## Category 7 — Impact Simulator Formula Correctness

### AT-I01: Proposed demand formula

**Setup:** Backend running.  
**Action:** `POST /api/v1/impact-simulator` with `catchment_demand_kg_per_day=5000, capture_proportion=0.35, accessibility_demand_kg_per_day=0`  
**Expected:** `results.proposed_station_demand_kg_per_day` = 1750.00 (± 0.01)  
**Pass criterion:** Value within tolerance.

### AT-I02: Diverted demand formula

**Setup:** Same as AT-I01 with `diversion_proportion=0.60`.  
**Expected:** `results.estimated_diverted_demand_kg_per_day` = 1050.00 (± 0.01)  
**Pass criterion:** Value within tolerance.

### AT-I03: Net additional demand formula

**Setup:** Same as AT-I01 and AT-I02.  
**Expected:** `results.net_additional_network_demand_kg_per_day` = 700.00 (± 0.01)  
**Pass criterion:** Value within tolerance.

### AT-I04: Invalid inputs rejected

**Setup:** Backend running.  
**Action:** `POST /api/v1/impact-simulator` with `capture_proportion=1.5` (out of range)  
**Expected:** HTTP 422; `error.code = "VALIDATION_ERROR"`  
**Pass criterion:** Request rejected with correct status and error code.

### AT-I05: Geographic analysis unavailable

**Setup:** Backend running.  
**Action:** `POST /api/v1/impact-simulator` with any valid inputs.  
**Expected:** `geographic_analysis.available = false`; `geographic_analysis.nearby_stations = null`  
**Pass criterion:** Both fields match expected values.

### AT-I06: Formulas displayed in UI

**Setup:** Frontend running; Simulator page loaded; valid inputs submitted.  
**Action:** View results panel.  
**Expected:** All three formulas displayed in plain language alongside their results.  
**Pass criterion:** Formula text visible for all three calculations.

---

## Category 8 — Reliability and Unavailable Data States

### AT-R01: Synthetic data badge on dashboard

**Setup:** Frontend running; Dashboard page loaded.  
**Action:** View any metric card showing demand or forecast data.  
**Expected:** A `DataOriginBadge` with label "⚠ Synthetic Demo" is visible in every such section.  
**Pass criterion:** Badge visible; not obscured or below the fold.

### AT-R02: Evaluation note on forecast page

**Setup:** Frontend running; Forecast page; forecast generated.  
**Action:** View reliability panel.  
**Expected:** Text explicitly stating that evaluation metrics come from synthetic data only and do not imply real-world accuracy.  
**Pass criterion:** Disclaimer text present.

### AT-R03: Data quality page gaps count

**Setup:** Frontend running; Data Quality page loaded.  
**Action:** View data gaps table.  
**Expected:** Table shows at least 8 distinct gaps with impact descriptions.  
**Pass criterion:** Table row count ≥ 8.

### AT-R04: Missing holiday data noted

**Setup:** Frontend running; Forecast page; any station selected.  
**Action:** View reliability panel.  
**Expected:** Notice that `is_public_holiday` and `event_name` are blank in all historical records.  
**Pass criterion:** Notice present.

---

## Category 9 — Responsive Behaviour

### AT-UX01: Mobile layout (375px)

**Setup:** Frontend running; Chrome DevTools set to 375px viewport.  
**Action:** Navigate to Dashboard, Forecast, Alerts, Map, Simulator pages.  
**Expected:** No horizontal scroll; all content accessible; no text overflow; buttons tappable.  
**Pass criterion:** All pages pass.

### AT-UX02: Tablet layout (768px)

**Setup:** Frontend running; Chrome DevTools set to 768px viewport.  
**Action:** Navigate all pages.  
**Expected:** 2-column layout where specified; navigation accessible.  
**Pass criterion:** Layout renders as designed.

### AT-UX03: Desktop layout (1280px)

**Setup:** Frontend running; browser at 1280px width.  
**Action:** Navigate all pages.  
**Expected:** Full layout with sidebar navigation; charts at full height.  
**Pass criterion:** Layout renders as designed.

---

## Category 10 — Accessibility

### AT-AC01: Keyboard navigation

**Setup:** Frontend running; Dashboard page loaded.  
**Action:** Press Tab repeatedly through all interactive elements.  
**Expected:** All buttons, links, dropdowns, and form inputs reachable; focus indicator visible.  
**Pass criterion:** No interactive element skipped; focus ring visible.

### AT-AC02: Reduced motion

**Setup:** Frontend running; set `prefers-reduced-motion: reduce` in browser or OS settings.  
**Action:** Navigate pages; hover over cards; observe animations.  
**Expected:** All animations suppressed or minimal.  
**Pass criterion:** No full animations triggered.

### AT-AC03: Form labels

**Setup:** Frontend running; Simulator page loaded.  
**Action:** Inspect all form inputs.  
**Expected:** Every input has an associated `<label>` element with `htmlFor` matching input `id`.  
**Pass criterion:** All inputs labelled.

---

## Category 11 — Full Demo Completion

### AT-DEMO01: End-to-end demo flow

**Setup:** Both servers running; real API data flowing.  
**Action:** Demonstrate the following sequence:
1. Dashboard — show network overview with synthetic-demo badge
2. Forecast — select AMD001; show history chart; generate 7-day forecast; show baseline vs. Holt-Winters
3. Alerts — show supply shortfall chart for AMD001; explain the formula
4. Map — show Ahmedabad map; show unavailable state; click to propose a new location
5. Simulator — enter inputs for the proposed location; show results and formulas
6. Data Quality — show data gaps; explain what real data would be needed
**Expected:** All 6 steps complete without error; all data-origin badges visible; no hardcoded demo values.  
**Pass criterion:** All 6 steps complete successfully.

### AT-DEMO02: Synthetic data disclaimer not omitted

**Setup:** Full demo running.  
**Action:** Review every page for presence of synthetic data disclaimer.  
**Expected:** No page presents synthetic data as real without a prominent label.  
**Pass criterion:** Zero instances of unlabelled synthetic data.
