# CNG SmartPlan — Known Limitations & Integrity Disclosures
**Project:** CNG SmartPlan (PS000002)  
**Governing Standard:** `docs/DATA_PROVENANCE.md` & `docs/API_CONTRACT.md`  
**Last Updated:** November 1, 2026

---

## 1. Geospatial & Coordinate Verification Limitations

### 1.1 Zero Verified Station Map Pins
- **Current State:** Exactly 0 out of 12 stations in `cng_stations.csv` have independently verified latitude and longitude coordinates.
- **Data Policy:** In accordance with `docs/DATA_PROVENANCE.md`, coordinates must never be hallucinated, inferred from geocoding APIs without physical ground-truth, or silently backfilled.
- **Quarantine of Candidate Coordinates:** 8 secondary coordinate leads exist in `station_coordinate_candidates.csv`. These records are quarantined in review status and are explicitly marked `eligible_for_map_pin = false`. They are never plotted on the interactive map.
- **Impact on Features:**
  - The Interactive Map visualizes the provisional study envelope and candidate location exploration without plotting unverified existing stations.
  - Station-specific spatial cannibalization and nearest-neighbor distance metrics in Feature E (Impact Simulator) are withheld (`geographic_analysis.available = false`) until ground-truth coordinates are verified.

### 1.2 Provisional Study Area Envelope vs. Municipal Boundary
- **Current State:** The bounding box $[22.85^\circ\text{N}–23.25^\circ\text{N}, 72.40^\circ\text{E}–72.75^\circ\text{E}]$ is a provisional coordinate envelope based on urban density screening.
- **Missing Data:** The official AMC (Ahmedabad Municipal Corporation) administrative polygon boundary is not part of the dataset.
- **Integrity Rule:** The UI and API must never describe this envelope as a "validated municipal boundary."

---

## 2. Demand Forecasting & Historical Series Limitations

### 2.1 Synthetic Simulation Series
- **Current State:** Daily sales records (8,041 rows spanning 2024-01-01 to 2025-12-31 across 11 eligible stations) are Python-simulated synthetic time series.
- **Model Evaluation:** The chronological holdout evaluation (Train $\le$ 2025-10-02, Test $\ge$ 2025-10-03) produces baseline MAE = 150.55 kg/day, RMSE = 189.69 kg/day, sMAPE = 11.41%.
- **Limitation:** These metrics evaluate fit against the synthetic data generating process only. They cannot be used to make claims of real-world forecasting accuracy for live CNG filling stations.

### 2.2 Excluded External Regressors
- **Unassigned Features:** Regional holiday calendars, festival peak travel (e.g. Uttarayan, Navratri), local traffic congestion indices, and CNG wholesale price adjustments are not included in the dataset.
- **Historical Demo Origin:** The source time series terminates on `2025-12-31`. All forecasts project into `2026-01-01+`. This is a chronological historical demonstration replay, not a live streaming operations feed.

---

## 3. Supply Chain & Inventory Planning Limitations

### 3.1 Potential Planning Shortfall vs. Physical Stockout
- **Definition:** A planning shortfall is calculated as $\max(0, \text{forecast\_demand} - \text{planned\_supply})$.
- **Operational Reality:** A positive planning shortfall represents a scheduled supply deficit. It does not prove an actual station stockout or queue dry-out. Real-world CNG stations benefit from high-pressure pipeline line-pack buffering and cascading storage banks.

### 3.2 Post-2025 Supply Data Gaps
- **Current State:** Synthetic planned supply covers only 2024-01-01 through 2025-12-31.
- **Rule (Missing Is Not Zero):** For forecast horizons starting 2026-01-01, supply data is marked `unavailable` (with `planned_supply_kg: null`), requiring planner-entered overrides. Missing values are never converted to 0 kg.

---

## 4. Master Directory Coverage Limitations

### 4.1 Incomplete Ahmedabad Station Census
- **Current State:** `cng_stations.csv` contains 12 directory records compiled from public open-data web portals of Gujarat Gas Limited (GEL) and Hindustan Petroleum Corporation Limited (HPCL).
- **Census Gap:** Ahmedabad features dozens of additional CNG stations operated by Adani Total Gas, BPCL, and Indian Oil that are not present in this dataset.
- **Study Area Filtering:** 11 stations are confirmed inside the Ahmedabad study area. AMD010 (Dholka) is classified as `uncertain` and is excluded from demand simulation.

---

## 5. New-Station Impact Simulator Limitations

### 5.1 Illustrative Decision-Support Model
- **Nature of Model:** The New-Station Impact Simulator is a transparent decision-support tool driven by user-supplied scenario inputs (catchment radius, market demand, capture rate, diversion rate, and accessibility demand).
- **Not an Econometric Prediction:** Simulation outputs represent mathematical projections under the assumed inputs, not guaranteed future commercial volumes or proven capital expenditure justifications.
