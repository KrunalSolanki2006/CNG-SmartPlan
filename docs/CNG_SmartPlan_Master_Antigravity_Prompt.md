# CNG SmartPlan — Master End-to-End Audit, Repair, Integration and Validation Prompt

> **Paste this entire prompt into Google Antigravity with the CNG SmartPlan project repository/workspace open.**
>
> This is the integrated full-stack prompt. Unlike the earlier Member 1 / Member 2 prompts, this prompt authorizes the assigned Antigravity agent to coordinate and modify both frontend and backend so that the complete system, API contract, documentation and tests remain consistent. Do not use this prompt in two isolated workspaces unless both members can see the same repository and shared contract.

---

## 0. Your role and mission

Act as a senior full-stack product engineer, Python forecasting engineer, geospatial-data engineer, data-quality auditor, API architect, UI engineer and QA lead working on **CNG SmartPlan**, a hackathon prototype for:

**PS000002 — Station-Level Demand Forecasting for CNG Sales to Optimize Network Expansion.**

Your job is to inspect the existing repository and the supplied reference material, identify defects and inconsistencies, then implement and test the safest complete working solution. Do not stop after producing a plan or audit report. Carry out the changes in the repository, run the application and tests where possible, and document any genuine blockers.

The product must help CNG planners:

1. Explore the available station directory and understand its verification status.
2. View historical station-level demand and generate short-term forecasts.
3. Compare forecast demand with planned supply when supply is actually available.
4. Identify potential planning shortfalls without falsely claiming an actual stockout.
5. Explore geographic information without plotting unverified station coordinates.
6. Evaluate a proposed new station using visible, editable scenario assumptions, including possible diversion/cannibalization from existing stations.
7. Understand forecast reliability, source provenance, missing information and limitations.

The signature feature is the **New-Station Impact Simulator**. It must demonstrate the difference between demand served by a new station and genuinely incremental network demand, while making its assumptions and evidence limitations obvious.

### Non-negotiable operating principles

- Work autonomously through the audit, implementation and validation. Do not ask for approval for each ordinary code change.
- Do not fabricate facts, station records, coordinates, sales, deliveries, supply, vehicle counts, holidays, traffic, boundaries, sources, model accuracy or validation results.
- Do not conceal missing data by converting null/unavailable values to zero.
- Do not make an unavailable capability look complete using fake records or decorative map markers.
- Do not delete or replace the whole project just to create a cleaner scaffold. Preserve working code and the repository's existing conventions where possible.
- Do not overwrite the original source data package. Treat it as immutable input.
- Do not claim success for commands/tests you did not run. Record exact failures and blockers.
- No paid API, paid geocoder, paid map service, external LLM or secret key is required for the core prototype. Do not introduce one.

---

## 1. Mandatory reference material and repository inspection

Before editing code:

1. Inspect the actual repository root, directory tree, package manifests, requirements files, Python entry points, frontend routes, current pages/components, API routes, tests, configuration, environment variables, and current run instructions.
2. Inspect `git status` and existing diffs before editing. Do not discard, reset, overwrite or reformat unrelated user changes. Preserve current local work. If Git is present, use a focused working branch or another safe checkpoint consistent with the repository.
3. Read every existing shared project document, especially these files if present:
   - `docs/PROJECT_SPEC.md`
   - `docs/IMPLEMENTATION_PLAN.md`
   - `docs/FRONTEND_IMPLEMENTATION_PLAN.md`
   - `docs/BACKEND_IMPLEMENTATION_PLAN.md`
   - `docs/API_CONTRACT.md`
   - `docs/DATA_PROVENANCE.md`
   - `docs/ACCEPTANCE_TESTS.md`
4. Inspect the full source data package and its documentation. Expected names include:
   - `CNG_SmartPlan_Data.zip`
   - `cng_stations.csv`
   - `station_coordinate_candidates.csv`
   - `synthetic_daily_sales.csv`
   - `synthetic_supply.csv`
   - `synthetic_hourly_demand.csv`
   - `data_sources.csv`
   - `data_dictionary.csv`
   - `data_gaps.csv`
   - `optional/cng_infrastructure.csv`
   - `README.md`
   - `validation_report.md`
   - `generate_synthetic_data.py`
   - `validate_package.py`
5. Read the project-context document `PS000002_CNG_SmartPlan_Simple_Context_261028_194125.pdf`, the `CNG_SmartPlan_Data_Guide.pdf`, and the two earlier role prompt references if accessible:
   - `CNG_SmartPlan_Member_1_Frontend_Antigravity_Prompts.pdf`
   - `CNG_SmartPlan_Member_2_Backend_Data_Antigravity_Prompts.pdf`
6. Inspect the complete new website-reference PDF supplied by the user. It contains 18 pages of screenshots covering:
   - Pages 1–3: Dashboard
   - Pages 4–7: Demand Forecast
   - Pages 8–10: Supply Alerts
   - Pages 11–12: Network Map
   - Pages 13–15: Impact Simulator
   - Pages 16–18: Data Quality & Provenance
7. Treat the screenshots as **UI and intended-workflow references**, not proof that every displayed result is accurate. Check every displayed metric, status, date, formula and label against the CSVs and backend implementation.

If one of these references is not available in the Antigravity workspace, do not pretend to have inspected it. Locate the repository's existing copy if possible. Continue using available local files and explicitly list missing references in the final report.

### Source-of-truth order

Use this order when sources conflict:

1. The official PS000002 problem statement and the project-context document for the intended problem and product scope.
2. The actual CSVs, their source URLs, `README.md`, `data_dictionary.csv`, `data_sources.csv`, `data_gaps.csv`, and `validation_report.md` for data facts and limitations.
3. The existing approved project documents in `docs/`, especially `API_CONTRACT.md` and `DATA_PROVENANCE.md`, after reconciling them with the source data.
4. The 18-page website-reference PDF for intended UI, interaction patterns and visual hierarchy.
5. Existing code, which must be audited rather than blindly trusted.

If the existing docs conflict with the actual data package or screenshots, document the precise conflict and correct the docs and code together. Do not preserve an incorrect statement merely because it already appears in the UI.

---

## 2. Established project and data facts — preserve these

The data package is a **prototype data package**, not an operational CNG dataset and not a complete Ahmedabad station census.

### 2.1 Station directory

- `cng_stations.csv` contains **12** source-attributed public directory records.
- **11** locality-screened records are eligible for the synthetic demonstration.
- **AMD010** (Ognaj / Sardar Patel Ring Road) has uncertain study-area inclusion and is excluded from the synthetic time series.
- The source directory records were collected from Gujarat Energy Limited (formerly Gujarat Gas Limited) and HPCL public directory pages.
- The dataset is a partial subset, not an exhaustive cross-operator inventory of Ahmedabad.
- The directory listing does not prove current physical operation, live CNG dispensing, or every field's correctness.
- The operator field is not established for 10 HPCL-listed records. Do not fill in guessed operators or brands.
- All 12 station master rows have blank latitude/longitude. There are **zero independently verified station coordinates**.
- AMD001 and AMD002 have a source discrepancy: the primary directory records are Gujarat Energy, while secondary coordinate-candidate pages use an Adani CNG label. Keep this discrepancy unresolved and visible until independently verified.

### 2.2 Secondary coordinate candidates

- `station_coordinate_candidates.csv` contains **8** secondary-source research leads.
- Every candidate is unapproved for production map-pin rendering.
- Some secondary pages explicitly indicate CNG dispensing is uncertain.
- Never copy candidate coordinates into the primary station master automatically.
- Never render a candidate coordinate as an existing/verified station marker.
- Never calculate nearest-station distance, station overlap or station-specific diversion from these candidate coordinates.

### 2.3 Synthetic demand and supply data

- `synthetic_daily_sales.csv`: **8,041 rows**, covering **11 stations** from **2024-01-01 through 2025-12-31** (731 dates per station).
- `synthetic_supply.csv`: **8,041 rows**, with the same station/date keys as the synthetic daily series. Values are simulated planned available supply, not actual deliveries, inventory or operator supply plans.
- `synthetic_hourly_demand.csv`: **2,160 rows**, for **3 stations** (AMD001, AMD004 and AMD008) from **2025-12-02 through 2025-12-31** (30 days × 24 hours × 3 stations). Hourly values reconcile to the matching synthetic daily total. These are not measured hourly sales, queues or waiting times.
- The sales, supply and hourly series were generated by a deterministic Python simulation with fixed seed `20241029`. They are synthetic data, not AI-generated observations and not real operating records.
- Holiday/event fields are blank because no complete, source-backed 2024–2025 official holiday calendar was obtained. Do not fill them with guessed holidays or festival multipliers.
- The generator is expected to modify only the three synthetic time-series files. It must never rewrite `cng_stations.csv` or the research lead file.

### 2.4 Provenance and completeness

- `data_sources.csv` documents **18** source/method records.
- `data_gaps.csv` documents **8** research/data gaps.
- `data_dictionary.csv` documents **103** field definitions across the package.
- `optional/cng_infrastructure.csv` contains 4 historical/context indicators with different geographic scopes and dates. Some Ahmedabad-related metrics are from 2021 and different authorized-area definitions; one is India-wide as of 2026. Do not add these together or label them as a current AMC-only CNG station count.
- The data package does not include usable Ahmedabad-specific Vahan vehicle-registration series, actual station-level sales, actual deliveries/supply/inventory/stockout records, an authoritative verified coordinate set, a dated machine-validated Ahmedabad municipal boundary, a complete cross-operator inventory, a full holiday calendar, or road/traffic/accessibility/land-use indicators.

### 2.5 Existing package validation facts

The supplied `validation_report.md` reports PASS for 10 integrity-check groups:

- 12 distinct station directory records; 11 locality-screened; no approved coordinates.
- 8 coordinate candidates; all unapproved.
- 8,041 synthetic daily rows with complete 2024–2025 date coverage and no duplicate station/date keys or negative demand.
- 8,041 synthetic supply rows with one-to-one station/date matches and nonnegative quantities.
- 2,160 hourly rows with 24 rows per station-day and daily reconciliation.
- 4 optional infrastructure indicators.
- 18 provenance records; 8 data gaps; 103 dictionary entries.
- A chronological 28-day rolling-mean baseline test over 2025-10-03 to 2025-12-31, with 990 station-days, MAE 150.55 kg/day, RMSE 189.69 kg/day and sMAPE 11.41%.

These tests establish file/schema consistency only. The baseline metrics are **synthetic-only** and do not prove real-world Ahmedabad forecast accuracy. Re-run the validator on the actual repository data package rather than trusting a copied report.

### 2.6 Dashboard values that are supported by the data

The reference dashboard displays:

- Station Inventory: 12 directory records; 11 eligible; AMD010 excluded.
- Map pins approved: 0.
- Network mean daily demand: 14,081.2 kg/day across 11 stations (synthetic series).
- Synthetic constrained-supply station-days: 1,628 (synthetic scenario result).
- 8,041 daily rows.
- Hourly profiles available for AMD001, AMD004 and AMD008: 2,160 rows.
- Historical profile for a single station: 731 dates from 2024-01-01 to 2025-12-31.

These aggregate numbers are consistent with the provided package. Preserve them only when they are computed from the live loaded data and clearly labeled synthetic. Do not hard-code them into the frontend.

---

## 3. Critical defects and required corrections

Audit every relevant page and fix the following issues. The first four are release-blocking data-trust defects.

### 3.1 Critical: stale forecast dates are presented as if they were current

The reference screenshot's Data Quality section has a generated timestamp on 2026-11-01, but the Forecast page shows seven target dates beginning 2026-01-01. The source history ends 2025-12-31. Those January forecasts are a historical replay, not an upcoming forecast as of November 2026.

**Required correction:**

- Make the forecast origin explicit in the API and UI (`forecast_origin_date` / `data_through_date`).
- For the current source package, label the forecast as a historical demonstration generated from data through 2025-12-31, with targets beginning 2026-01-01. Do not call it the next seven days, a current forecast, live demand or real-time telemetry.
- Show a visible notice such as: `Historical synthetic demo — source data ends 31 Dec 2025; forecast shown from 1 Jan 2026. Not a current operational forecast.`
- If a user can choose a different forecast origin, validate that the origin has adequate prior history and never imply that the old 2025 dataset contains current observations.
- Do not automatically fabricate a synthetic extension to 2026. Only add an optional, separate, deterministic synthetic demo extension if it is genuinely useful and implemented in a separate derived/generated folder with its own provenance, date range and conspicuous synthetic label. Never overwrite the original package or disguise generated future values as observations.

### 3.2 Critical: future supply is missing; missing is not zero

The synthetic supply source ends on 2025-12-31, while the displayed seven-day forecast starts 2026-01-01. The Supply Alerts screenshot correctly has a notice that future planned supply is unavailable and an `Override Needed` state. Preserve and strengthen that behaviour.

**Required correction:**

- Join forecast and supply by exact `(station_id, date)` keys.
- For target dates with no supply record, return `supply_status = unavailable` (or an equivalent explicit enum), `planned_supply_kg = null`, and `shortfall_kg = null`.
- Do not treat missing supply as `0 kg`; do not show a zero deficit; do not count it as a covered day.
- Calculate `potential_shortfall_kg = max(0, forecast_demand_kg - planned_supply_kg)` only when a valid supply value exists.
- Show coverage: how many forecast station-days have supply, how many are missing, how many user overrides are active, and which dates require an override.
- A manual supply override must be stored separately as `user_entry` / scenario data, keyed by station and date, with created/updated metadata. It must never mutate the source synthetic supply CSV.
- Distinguish `synthetic_source`, `user_override`, `real_authorized_source` and `unavailable` supply origins in API and UI.
- Label alerts `Potential Planning Shortfall`, not stockout, shortage event or confirmed outage.

### 3.3 Critical: an unverified bounding box is called a validated Ahmedabad boundary

The Network Map screenshot says coordinates are inside a “validated Ahmedabad study boundary” and presents a numeric range. The source package explicitly says the Ahmedabad municipal boundary has not been loaded and machine-validated. A simple latitude/longitude bounding box is not an authoritative AMC boundary polygon.

**Required correction:**

- Remove the words `validated Ahmedabad study boundary` and any claim of AMC/municipal point-in-polygon validation until a real, dated, licensed boundary geometry has been sourced and validated.
- If the current numeric range is retained for map viewport/input convenience, call it a `provisional coordinate envelope` or `approximate view range`, state it is not a verified municipal boundary, and do not use it to claim official city inclusion.
- Prefer a neutral Ahmedabad map viewport around the city center. A map center is not a station location.
- Implement authoritative point-in-polygon only if a traceable boundary source is actually present: preserve source URL, publisher, release/date, licence, CRS, geometry validation, and reproducible test. Never infer a boundary from a map screenshot.
- Do not claim a user-entered proposed point is inside AMC unless that official geometry test is available. Otherwise show `boundary verification unavailable`.

### 3.4 Critical: fixed ±15% bands are not necessarily confidence intervals

The Forecast screenshot shows a band labeled 85%–115%. If the implementation simply multiplies the forecast by 0.85 and 1.15, that is not a statistically calibrated confidence/prediction interval.

**Required correction:**

- Inspect the current backend implementation and tests. Do not assume the band is statistically valid.
- If it is only a fixed ±15% illustration, remove the `confidence band` / `85% confidence` terminology. Either hide it, or explicitly relabel it `Illustrative ±15% scenario range — not a calibrated prediction interval`.
- Prefer a genuinely calibrated prediction interval computed from chronological holdout/calibration residuals, with a documented method, target coverage, empirical coverage test and sufficient test observations. Return lower/upper bounds from the backend, not hard-coded frontend calculations.
- Do not invent uncertainty bounds or confidence percentages. If no defensible interval is available, show `Uncertainty interval unavailable` and explain why.

### 3.5 Remove inaccurate “live” language

The Dashboard says `Live overview telemetry` and `Live Data Provenance` even though the shown source consists of static local CSV files and Python-simulated series.

**Required correction:**

- Replace unsupported `Live`, `real-time`, `telemetry`, or live-operation wording with accurate descriptions such as `Current prototype data snapshot`, `Data Provenance & Verification Audit`, or `Synthetic demonstration data`.
- Use live/real-time terminology only if an actual authenticated operational source is connected and the code proves it.

### 3.6 Impact Simulator is a scenario calculator, not a validated geographic demand model

The screenshot uses:

- Proposed demand = `(catchment demand × capture proportion) + accessibility-generated demand`
- Estimated diverted demand = `proposed demand × diversion proportion`
- Net additional network demand = `proposed demand − diverted demand`

Example arithmetic: `5,000 × 0.81 + 0 = 4,050 kg/day`; `4,050 × 0.60 = 2,430 kg/day`; net additional = `1,620 kg/day`. The arithmetic is valid for the inputs, but the inputs are assumptions, not observed Ahmedabad market demand.

**Required correction:**

- Preserve the formulas and make the assumptions editable and visible.
- Call the output `Illustrative Scenario` / `Assumption-based estimate`, never a measured demand prediction or guaranteed impact.
- Clearly state whether `catchment demand` is manually entered, derived from a dataset, or unavailable. With the current data package, it is a user-entered assumption.
- A catchment radius slider is not itself evidence of catchment demand. Do not claim radius-derived demand unless there is a documented spatial demand dataset and method.
- Without independently verified existing station points and valid allocation data, station-specific diversion, nearest-station impact and geographic cannibalization are unavailable. Show a clear unavailable state, but allow the overall formula scenario to work using user inputs.
- Do not assign diversion to named existing stations or draw station-level impact lines using unverified coordinates.
- Add clear `Before` and `Scenario After` network totals only when the arithmetic and definitions are explicit. Explain that net additional demand is a scenario output, not incremental demand proven by observations.
- Validate assumptions: demand values >= 0, capture and diversion rates within 0–100%, radius within configured limits, and no NaN/infinite values. Prevent nonsensical or double-counted totals.
- Display a sensitivity view/table so a user can compare how the result changes under different capture and diversion assumptions. Label all rows as scenario assumptions.

### 3.7 Station identity and verification must not be collapsed into one boolean

The current public directory is partially verified, not fully verified. A station listing, CNG availability, current physical operation, operator attribution, coordinate accuracy and study-area inclusion are different claims.

**Required correction:**

- Preserve separate status fields for at least: directory source status, operator/brand status, CNG listing/availability status, current operating status (if known), locality/study-area status, coordinate verification, map-pin eligibility and simulation eligibility.
- Do not display `Real Public Data` in a way that implies every field has been verified. Use labels such as `Public directory record — partially verified`.
- Preserve internal IDs AMD001–AMD012; do not describe them as operator-issued station numbers.
- Retain source URLs and verification notes with each record.
- Keep AMD010 excluded/uncertain unless a verified boundary source resolves its inclusion.
- Keep the AMD001/AMD002 operator discrepancy visible in provenance and never silently overwrite one source with another.

### 3.8 Metric scope, hourly coverage and infrastructure scope must be explicit

- The 14,081.2 kg/day dashboard KPI is the average **network total per day** across 11 simulated stations, not the average per station. Label it accordingly.
- The 1,628 result is simulated station-day rows with simulated supply below simulated historical sales in the source package. It is not a count of actual outages, customers affected or 1,628 different stations. Label as `Synthetic constrained-supply station-days` or the exact computed equivalent.
- Baseline metrics in the validation report are aggregate across 990 station-days. If showing per-station metrics, calculate and label them separately; never mix aggregate and selected-station metrics.
- Hourly demand is available only for AMD001, AMD004 and AMD008, for the 30-day period 2025-12-02 to 2025-12-31. Do not show hourly coverage for all 11 stations or all 2 years.
- Keep the four optional infrastructure indicators' source scopes and dates separate. Do not sum different authorized areas or compare historical 2021 scope with 2026 national scope as if they were a single Ahmedabad count.
- If a screen uses “8 research gaps”, list the actual 8 documented gaps or link to the exact ledger. Do not invent descriptions.

---

## 4. Required product behaviour and page-by-page implementation

Use the reference screenshots to retain the existing professional enterprise style: dark navy sidebar, light content canvas, white cards, restrained teal/green accents, calm warning colours, readable typography and clear information hierarchy. Do not redesign it into a generic neon/gradient AI dashboard. Keep animations restrained and purposeful.

### 4.1 Shared application shell

- Persistent responsive navigation for Dashboard, Demand Forecast, Supply Alerts, Network Map, Impact Simulator and Data Quality & Provenance.
- Header should show the study-area context, data status and map-pin approval count only when those values come from the backend.
- Show a compact global synthetic-data banner/status when any current page uses synthetic data.
- Use consistent loading, empty, error, unavailable and partial-data states. Do not display placeholder KPIs while a request is loading.
- All links, filters, dropdowns, sliders, date controls, refresh buttons, simulator inputs and navigation actions must work. No decorative/inert controls.
- Ensure keyboard accessibility, visible focus, labels, sensible tab order, readable contrast and usable mobile layouts.

### 4.2 Dashboard

Implement data-backed dashboard cards and sections:

1. Station Inventory: total records, locality-screened eligible records, uncertain/excluded records, and verification status.
2. Approved Map Pins: verified map-eligible coordinates only; current expected value is 0.
3. Mean Daily Demand: network total per day, clearly labeled synthetic and date-scoped.
4. Synthetic Planning Deficit: correct station-day count or demand deficit statistic, with clear definition and “not stockout” warning.
5. Provenance/verification audit: coordinate status, real-vs-synthetic sales, real-vs-synthetic supply, holiday coverage, hourly coverage.
6. Historical Demand Profile: station selector, daily/weekly aggregation, source data period, rows and synthetic disclaimer.
7. Forecast Pipeline preview: forecast origin, horizon, stations included, method and source-data status.
8. Station Master Directory: search by ID/name/locality/operator, study-area and eligibility filters, station inspection detail.

All displayed metrics must be returned by the API or computed by the backend. Avoid hard-coded values and duplicated calculations in React.

### 4.3 Demand Forecast page

Implement:

- Station selector restricted to records with time-series data.
- Forecast horizon choices consistent with the actual API (suggested 7, 14, 30 days and validated custom 1–30 days if already supported).
- Forecast method selector only for implemented methods (for example Holt-Winters and 28-day rolling baseline). Never show a model option that does not run.
- Daily and weekly views. Define weekly aggregation explicitly: weekly **sum** for total kg/week, or weekly average if the label states average. Do not silently switch semantics.
- Historical demand, forecast and baseline series with a clear legend, units and dates.
- Explicit forecast origin/data-through date and target date range.
- Chronological train/test evaluation; never randomly shuffle time-series rows for principal evaluation.
- Metrics (MAE, RMSE, sMAPE) returned with scope, station/network, period and sample count. Recompute rather than hard-code. Compare models only using the same holdout window and metric definition.
- Clearly explain that source sales are synthetic and metrics measure synthetic-series behaviour only.
- Forecast lower/upper bounds only when the backend supplies defensible calibrated intervals. No fake confidence bands.
- Hourly profile tab limited to the three supported stations and exact date range; show missing coverage state elsewhere.
- Forecast table with target date, predicted kg, baseline and interval only if supported.

Check the existing model implementation before replacing it. If Holt-Winters uses `statsmodels`, retain it if it is correct and installed; otherwise do not claim Holt-Winters while using a different algorithm. Choose a real, testable implementation that is suitable for this small synthetic dataset and document the choice.

### 4.4 Supply Alerts page

Implement:

- Select station and horizon, then evaluate forecast demand against planned supply for matching dates.
- Display potential shortfall only when supply is available.
- Use the canonical formula: `potential_shortfall_kg = max(0, forecast_demand_kg - planned_available_supply_kg)`.
- Distinguish `covered`, `shortfall`, `no shortfall`, `supply unavailable`, and `user override` statuses.
- Clearly show dates with missing future supply and request a user override rather than treating null as zero.
- Manual override form should validate date, kg quantity and station ID; save in a separate scenario/user-entry store (or an in-memory scenario store if no persistence exists, with clear session-lifetime notice). Do not mutate CSV source files.
- Table/ledger should expose date, station, forecast demand, planned supply, shortfall, supply origin, coverage status and data label.
- Charts must visually distinguish forecast demand from planned supply and must show missing supply as a gap, not a zero-height line.
- Make it explicit: the alert is for planning review; it does not prove a historical stockout or actual shortage.

### 4.5 Network Map page

Implement a useful and honest geographic workspace:

- Use React Leaflet only if already selected in the project stack, with proper tile attribution shown visibly.
- Default to an Ahmedabad-area viewport, not a fake CNG station marker.
- Current expected state: **zero approved station pins**. Render zero station pins until the backend says a record is verified and map eligible.
- Never load `station_coordinate_candidates.csv` in the browser as map markers. Candidate leads may be listed in a separate review queue with status `unapproved — not mapped`.
- Never geocode station names, invent approximate positions, or infer coordinates from locality text.
- Proposed location selection by map click or manual coordinate input must create a separate `user_entry` proposal, not an existing station.
- Validate numeric latitude/longitude ranges. Only use authoritative study-boundary inclusion when a validated boundary polygon and point-in-polygon service are available. Otherwise show `boundary verification unavailable`.
- Do not calculate nearest-station distances or display geographic service gaps while verified point geometry is missing.
- Do not rank candidate locations on distance/accessibility without actual inputs and a documented scoring method.
- Provide a polished no-verified-pins empty state: explain why there are zero markers and what evidence is needed to enable them.
- Keep proposed points separate from station pins and show a different legend/style.

### 4.6 New-Station Impact Simulator

This is the signature feature and must be fully functional as an **assumption-based scenario calculator**.

Implement the documented equations:

```text
proposed_station_demand_kg =
    (catchment_demand_kg * capture_proportion)
    + accessibility_generated_demand_kg

estimated_diverted_demand_kg =
    proposed_station_demand_kg * diversion_proportion

net_additional_network_demand_kg =
    proposed_station_demand_kg - estimated_diverted_demand_kg
```

Required UI inputs:

- Proposed location (optional user-entered lat/lon; never an existing station record).
- Catchment radius (scenario parameter only unless backed by real geography).
- Assumed catchment demand (kg/day).
- Capture proportion (0–100%).
- Diversion/cannibalization proportion (0–100%).
- Accessibility-generated demand (kg/day).

Required output:

- Gross proposed-station demand.
- Estimated diverted demand.
- Net additional network demand.
- Before/after scenario totals only if a baseline total is explicitly defined and the units/time period match.
- Clear formula breakdown showing exactly how each output was calculated.
- Sensitivity analysis for capture/diversion assumptions.
- Assumption table with each input, value, source (`user_entry`), and description.

Important:

- With the current data package, there is no verified spatial catchment, no verified nearby existing station point, and no real station-level demand from which to estimate geographic capture or diversion. Therefore, the app may calculate the overall scenario using user-entered assumptions, but it must show station-specific or distance-based effects as unavailable.
- Never use unapproved coordinate candidates to estimate cannibalization.
- Do not imply catchment radius automatically creates a demand estimate.
- Add formula and boundary explanation adjacent to the results.
- Prevent negative, infinite, NaN and out-of-range inputs.

### 4.7 Data Quality & Provenance page

Build an audit ledger from the actual data package and API:

- Dataset inventory: filename, row count, date range, data type, source, key, verification status and limitations.
- Clear badges for `REAL PUBLIC — PARTIALLY VERIFIED`, `SECONDARY COORDINATE LEAD — UNAPPROVED`, `SYNTHETIC — PYTHON-SIMULATED`, `USER ENTRY`, and `ILLUSTRATIVE SCENARIO`.
- List the eight documented research gaps and their impact on the app.
- Show coordinate verification status and candidate lead count without implying approval.
- Show whether real sales/supply data exists (currently false), percentage synthetic, holiday-data coverage, hourly coverage and date ranges.
- Show the actual validation timestamp and validation status. Distinguish technical file integrity PASS from real-world data completeness INCOMPLETE.
- Show synthetic-only model metrics with their test period, sample size and evaluation method.
- Preserve context infrastructure indicators with their individual date/geographic scope and source; do not aggregate incompatible scopes.
- Explain what can currently be demonstrated and what is blocked pending real data.

Do not label this section as optional long-term scenario planning. Data governance/provenance is a cross-cutting supporting capability. Long-term demand scenarios are a separate optional feature and should only be claimed as implemented if they are actually available.

---

## 5. Architecture, technology and integration rules

### 5.1 Preferred stack

Follow the existing repository if it is already correctly configured. The intended stack is:

**Frontend**
- React + TypeScript + Vite
- Tailwind CSS
- Motion for restrained transitions and loading states
- React Bits components where compatible and actually installed
- Recharts for charts
- React Leaflet for maps

**Backend**
- Python + FastAPI
- Pandas + NumPy
- Scikit-learn where useful for evaluation/features
- Pydantic request/response models
- pytest for unit/API tests

Do not replace a working library or introduce unnecessary dependencies just to match a list. For a forecasting model requiring another library, inspect what's already installed and add only a justified dependency. No paid services or secret keys are required.

### 5.2 One canonical API contract

- Inspect `docs/API_CONTRACT.md` before changing any route or JSON schema.
- If it exists, it is the sole shared API source of truth. Update it and the frontend types/backend Pydantic models together whenever necessary.
- If it is missing, create it before implementing integration. Include HTTP method, path, request schema, response schema, field names, types, units, nullability, enums, date semantics, provenance fields, error shape and examples.
- Do not independently invent different frontend and backend endpoint names, response keys, base URLs or date formats.
- The frontend must call backend functionality through one typed API client/service layer. Do not scatter raw `fetch` calls across components.
- Backend computations and business rules belong in the backend, not duplicated in React.
- Keep frontend API types aligned with Pydantic models and contract tests.
- Use one configurable API base URL (for example Vite env configuration) and one documented local development port. Configure CORS explicitly.
- Handle loading, validation, network and server errors consistently. Never silently swap to mock data when the API fails.

If no API routes exist, design a small coherent REST API (health, dashboard summary, station directory/detail, historical demand, forecast, supply alerts/overrides, geography availability/proposed point validation, impact simulation, provenance/validation). Prefer the existing screenshot's `/api/v1/forecast` if it is already implemented and documented. Do not create duplicate endpoints for the same purpose.

### 5.3 Data access and persistence

- Load CSVs through a backend data service using configured paths relative to the backend/project, not fragile current-working-directory assumptions.
- Validate schemas, required columns, types, keys, date parsing and file presence at startup or through an explicit diagnostics endpoint.
- Preserve source rows and source URLs. Do not mutate the original data files from application endpoints.
- User-entered supply overrides and impact scenarios must remain separate from source observations. If persistence is available, store them in a separate SQLite or existing database structure with provenance metadata. If not, use a documented in-memory session store and show that the data is session-only. Do not add MongoDB/PostgreSQL/cloud infrastructure without a project requirement.
- Use Ahmedabad local date semantics (`Asia/Kolkata`) for user-facing dates. CSV dates are ISO date-only values; do not shift them through UTC and accidentally change calendar days.

### 5.4 Suggested response metadata

Where applicable, API responses should carry enough metadata to make the UI truthful, for example:

```json
{
  "data_type": "synthetic",
  "source_file": "synthetic_daily_sales.csv",
  "data_through_date": "2025-12-31",
  "forecast_origin_date": "2025-12-31",
  "date_range": {"start": "2024-01-01", "end": "2025-12-31"},
  "verification_status": "not_applicable_synthetic",
  "limitations": ["Synthetic demonstration data; not actual station sales."]
}
```

This is an illustration of the required semantics, not permission to change an existing canonical schema without updating `API_CONTRACT.md`, backend models and frontend types together.

---

## 6. Forecasting and evaluation requirements

1. Validate the daily series for expected stations, dates, nonnegative quantities and unique `(station_id, date)` keys.
2. Use chronological train/validation/test splits only. Do not randomly shuffle time-series data for primary evaluation.
3. Compare the actual implemented model with a simple baseline (the package validator's 28-day rolling mean is an acceptable baseline).
4. Keep evaluation windows identical across models and station/network scopes.
5. Calculate MAE, RMSE and sMAPE in a tested backend utility. Define how zero actual values are handled in sMAPE.
6. Return `n_observations`, start/end dates, station scope and synthetic/real data origin with the metrics.
7. Never hard-code the screenshot's model scores into cards. Compute them. If metrics differ from the previous validation report, explain why (model, split, preprocessing, package version or scope).
8. Keep a clean distinction between:
   - historical observed values (currently none of the CNG sales are real),
   - synthetic historical values,
   - forecast values,
   - baseline estimates,
   - user-entered assumptions/overrides.
9. Any forecast interval must be calibrated from data and tested; otherwise omit it or label it as illustrative only.
10. A forecast is a decision-support estimate, not a guarantee of sales, supply, queues, availability or business outcomes.

---

## 7. Data validation, provenance and safety rules in code

Implement explicit validation utilities and tests:

- Unique station IDs in station directory.
- Daily unique `(station_id, date)` keys.
- Supply unique `(station_id, date)` keys.
- Validate supply-sales joins as one-to-one for overlapping historical source rows.
- Verify the 11 eligible station IDs and AMD010 exclusion are derived from source fields, not hard-coded in UI.
- Validate all coordinate candidates have `approved_for_map_pin = false` until a documented independent approval process changes them.
- Ensure no station master coordinate is auto-populated from secondary leads.
- Validate 24 hourly rows per available station-day and reconciliation with daily synthetic values within the package tolerance.
- Verify date ranges and null holiday fields. Null holidays must remain unknown, not false.
- Ensure missing supply does not become zero.
- Ensure the dashboard's aggregate metrics are computed on the intended date range and denominator.
- Keep original source files read-only from the application/generator; tests should compare file hashes or copies where practical.
- Validate all user numeric inputs and reject NaN, infinity, negative demand, rates outside 0–1, invalid dates and invalid coordinates.
- Validate API responses use explicit enums/statuses for verified, unverified, unavailable, synthetic, user-entry and scenario data.

Use the data dictionary and provenance file to show exact meaning for data fields. Keep unknown, unavailable, not collected, not applicable and zero as distinct states.

---

## 8. UI quality requirements

- Keep the reference dashboard visual identity: navy sidebar, light canvas, white cards, teal highlights, muted grey text and clear amber warning states.
- Use a consistent spacing/type system, sensible max-width, clean tables and chart legends.
- Make it responsive at desktop, tablet and mobile sizes. Sidebar should collapse appropriately on narrow screens.
- Use Motion for short and restrained transitions only; do not animate every number constantly or interfere with chart/map usability.
- Loading indicators should reflect real requests; do not fabricate fake progress percentages.
- Charts must have legible labels/units, accessible legends, tooltips and empty/error states.
- Tables must have responsive overflow or stacked behavior and working search/filter/pagination if shown.
- Make synthetic, user-input, unavailable and partially verified statuses understandable without requiring a judge to inspect documentation.
- Do not remove the dashboard's disclosure badges simply to make the interface look more impressive.

---

## 9. Documentation deliverables

Create or update these documents, keeping the existing approved filenames and structure wherever possible:

1. `docs/MASTER_AUDIT_REPORT.md` — defects found, severity, evidence, changes made, unresolved blockers.
2. `docs/PROJECT_SPEC.md` — one-page source-of-truth problem definition and feature scope, if missing or stale.
3. `docs/IMPLEMENTATION_PLAN.md` — integrated frontend/backend delivery roadmap and module ownership.
4. `docs/API_CONTRACT.md` — canonical API schemas and routes.
5. `docs/DATA_PROVENANCE.md` — file-level data classification, actual row/date facts, source URLs, synthetic generation, limitations, verification policy and gaps.
6. `docs/ACCEPTANCE_TESTS.md` — repeatable functional/data-integrity test checklist.
7. `docs/KNOWN_LIMITATIONS.md` — what cannot honestly be claimed yet and which real inputs would remove each limitation.
8. `docs/INTEGRATION_RUNBOOK.md` — exact commands, ports, environment variables, startup order and troubleshooting.

Do not create redundant competing contracts. If a document already exists, update it instead of creating a second version with conflicting information.

---

## 10. Required acceptance tests

Add or update automated tests covering at least the following. Run them; do not merely list them.

### Data and provenance

- Package validator runs and returns its actual result.
- Dashboard returns 12 directory records, 11 eligible records, AMD010 excluded/uncertain, 0 approved map pins, and source-derived counts.
- All 8 coordinate candidates remain unapproved and are excluded from map features.
- Synthetic daily/supply keys match over source period.
- Hourly data contains exactly the supported station/date coverage and reconciles with daily totals.
- Source files are unchanged after server startup, user actions and synthetic generation tests.

### Dashboard

- Mean daily network demand is computed from source rows and labeled as synthetic network total.
- The 1,628 station-day count is calculated using the exact documented historical synthetic rule; it is not described as actual outage count.
- Unavailable/partial data states do not show invented zeros.

### Forecast

- A 7-day forecast can be generated for an eligible station from a valid historical origin.
- Invalid station IDs and invalid horizons return a structured error.
- Chronological splits contain no train dates later than test dates.
- Metrics are generated by code and include date scope, sample count and data type.
- Forecast dates after 2025-12-31 are labelled as a historical synthetic replay for the current package, not current live dates.
- Lower/upper intervals are absent unless they are justified and tested.

### Supply Alerts

- Supply joins match exact station/date.
- A covered day calculates `max(0, forecast - supply)` correctly.
- A future day with no supply returns null/unavailable, not zero and not a false “no shortfall”.
- Manual override changes only the scenario result, never source CSV files.
- Missing supply is visible in the coverage summary and table.

### Map

- No candidate coordinate can appear as a confirmed station pin.
- Zero verified points produces the intended polished empty state.
- A user-proposed point is shown separately from station points.
- No official municipal boundary claim appears without a validated source polygon.
- Distance/nearest-station calculation is unavailable when verified geometry is absent.

### Impact Simulator

- Test the screenshot arithmetic: 5,000 × 0.81 + 0 = 4,050; 4,050 × 0.60 = 2,430; net = 1,620 kg/day.
- Validate zero demand, 100% capture, 0%/100% diversion and invalid percentages.
- Outputs disclose `Illustrative Scenario` and `User Entry` origins.
- Station-specific diversion is unavailable with current unverified station geometry.

### Frontend and integration

- Frontend type-check/lint/build pass using repository scripts.
- Backend import/startup and pytest pass.
- API contract tests verify the frontend's expected response keys match backend output.
- Test loading, empty, partial, unavailable, validation-error, server-error and network-error states.
- Test all navigation and visible controls; no nonfunctional buttons.
- Test desktop/tablet/mobile layouts at representative widths.
- Verify chart/map attribution, labels, dates, units and synthetic badges.

---

## 11. Execution sequence — perform in this order

### Phase A — Audit and baseline

- Inspect repo, docs, data package and screenshot references.
- Record current Git status, current app run commands and current test/build result.
- Run `validate_package.py` (or repository equivalent) on the actual package.
- Create `docs/MASTER_AUDIT_REPORT.md` with all inconsistencies, severity and evidence before changing code.

### Phase B — Data and domain integrity

- Build/repair shared data loading and validation services.
- Implement explicit provenance/status types and missing-value semantics.
- Fix forecast-origin/date handling, future supply coverage and geographic boundary claims first.
- Ensure the source package remains untouched.

### Phase C — Backend implementation

- Finalize the canonical API contract.
- Implement/repair station, dashboard, historical demand, forecast, supply, geography, impact and provenance services/routes.
- Add Pydantic schemas, deterministic calculations, structured errors and tests.

### Phase D — Frontend implementation

- Connect every module to the canonical API client.
- Implement all screenshot workflows with accurate empty/partial states.
- Remove hard-coded KPI values and unsupported live/confidence/boundary claims.
- Preserve the visual language and responsive behaviour.

### Phase E — Integration and QA

- Start backend and frontend using documented commands.
- Run all data tests, backend tests, frontend tests, type-check, lint and production build.
- Exercise every module end-to-end with the included synthetic data and user-entered scenario values.
- Fix integration issues instead of leaving mock/static fallbacks.
- Capture or inspect final screenshots at desktop and mobile sizes if browser tooling is available.

### Phase F — Handoff

- Update all documentation.
- Provide a precise changed-file summary and exact run commands.
- Report each test as PASS, FAIL or NOT RUN with actual output/context.
- List remaining real-world blockers without pretending they are solved.

---

## 12. Definition of Done

The task is complete only when:

- All six navigation modules load and their visible controls work.
- Frontend and backend use one consistent API contract and shared data definitions.
- Source files are not modified or contaminated by user-entry/synthetic extension data.
- Dashboard numbers are computed and correctly qualified.
- Forecast target dates are not misrepresented as current when the data ends in 2025.
- Missing future supply is unavailable/null, not zero.
- No unapproved candidate coordinate is displayed as a verified station pin.
- No unvalidated boundary is described as a verified AMC boundary.
- Uncalibrated ±15% is not called a confidence interval.
- Supply alerts say potential planning shortfall, not confirmed stockout.
- Impact simulation works from explicit assumptions, passes arithmetic tests and does not invent geographic/station-specific effects.
- Provenance and data-quality screens show the actual data package status and all documented gaps.
- Tests/builds have been run, and exact outcomes are documented.
- The application has clear local startup instructions and a usable responsive UI.

### Final response required from you (Antigravity)

At the end, report:

1. Repository structure you found and the framework/dependencies actually used.
2. Critical problems discovered and how each was fixed.
3. Features and pages implemented or repaired.
4. API routes and the location of the canonical contract.
5. Data files read and whether any source files were changed (expected: no).
6. Tests/build/type-check commands executed and exact PASS/FAIL results.
7. Exact commands to run frontend and backend locally, including ports and required environment variables.
8. Any unresolved limitations that require real operator data, authoritative coordinates, a validated boundary or other evidence.
9. A short manual demo flow for a hackathon judge.

**Do not finish by saying “everything is done” if any test was not run or any geographic/data capability remains blocked. Be precise and honest.**

---

## 13. Final instruction

Start by inspecting the current repository and the available project reference files. Then perform the audit, correct the critical data-trust defects, complete the end-to-end integration, run the required tests and update documentation. Use the current source package as-is and preserve all provenance. Do not ask the user to repeat information already in the project files. If a capability cannot be made evidence-backed because the needed data does not exist, implement the correct unavailable/assumption-based workflow rather than inventing the missing evidence.

**The goal is a credible, working CNG network planning prototype — not a visually convincing interface that overstates what its data can prove.**
