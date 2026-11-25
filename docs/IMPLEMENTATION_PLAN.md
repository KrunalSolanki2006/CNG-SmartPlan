# CNG SmartPlan — Master Implementation Plan

**Version:** 1.0  
**Date:** 2026-10-30  
**Status:** Ready for team review and approval.

> This plan must be reviewed and explicitly approved by both team members before coding begins.
> References: `docs/API_CONTRACT.md` (canonical endpoint schemas), `docs/DATA_PROVENANCE.md` (data classification).

---

## 1. Recommended Architecture

```
e:\CNG_SmartPlan\
├── CNG_SmartPlan_Data/        # Original data package — READ ONLY during development
├── docs/                      # Planning documents (this folder)
├── client/                    # Member 1 owns entirely (React/TypeScript/Vite)
│   ├── src/
│   │   ├── api/               # Typed API clients
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level components
│   │   ├── types/             # TypeScript interfaces matching API_CONTRACT.md
│   │   ├── hooks/             # Data-fetching hooks
│   │   └── utils/             # Formatting helpers
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
└── server/                    # Member 2 owns entirely (Python/FastAPI)
    ├── data/                  # Symlink or copy of CNG_SmartPlan_Data/ (READ ONLY)
    ├── services/
    │   ├── data_loader.py     # CSV loading; caches on startup
    │   ├── station_service.py
    │   ├── forecast_service.py
    │   ├── supply_service.py
    │   ├── impact_service.py
    │   ├── hourly_service.py
    │   └── quality_service.py
    ├── routers/
    │   ├── health.py
    │   ├── overview.py
    │   ├── stations.py
    │   ├── forecast.py
    │   ├── supply.py
    │   ├── hourly.py
    │   ├── impact.py
    │   └── quality.py
    ├── schemas/               # Pydantic request/response models
    ├── tests/
    ├── main.py
    └── requirements.txt
```

---

## 2. Development Milestones

### Milestone 0 — Baseline Setup (Both members, Day 1 morning)

- [ ] Git repository initialised with `main` branch.
- [ ] `feature/frontend` branch created from `main`.
- [ ] `feature/backend-data` branch created from `main`.
- [ ] `docs/` folder with all 7 planning documents committed to `main`.
- [ ] Both members have read and signed off on `API_CONTRACT.md` and `DATA_PROVENANCE.md`.
- [ ] `client/` scaffolded with Vite + React + TypeScript + Tailwind + Recharts + React Leaflet.
- [ ] `server/` scaffolded with FastAPI + uvicorn + requirements.txt.
- [ ] Health endpoint working: `GET /api/v1/health` returns 200.
- [ ] Frontend dev server proxying to backend confirmed.

**Go/No-go gate:** Both members can run `npm run dev` and `uvicorn main:app --reload` simultaneously, see health check response in browser.

### Milestone 1 — Data Foundation (Member 2, Day 1)

- [ ] `data_loader.py` loads all CSV files at startup; validates shapes against DATA_PROVENANCE.md counts.
- [ ] `station_service.py` serves stations with correct `eligible_for_map_pin=false` for all rows.
- [ ] `GET /api/v1/stations` passing tests.
- [ ] `GET /api/v1/stations/{id}/history` returning daily synthetic data, daily and weekly.
- [ ] `GET /api/v1/overview` returning correct network summary.

**Go/No-go gate:** Member 1 can fetch stations list and history from the running API.

### Milestone 2 — Forecasting Service (Member 2, Day 1–2)

- [ ] `forecast_service.py` implements 28-day rolling mean baseline.
- [ ] `forecast_service.py` implements Holt-Winters (or SARIMA) model via scikit-learn / statsmodels.
- [ ] Chronological train/test split enforced (train ≤ 2025-10-02, test 2025-10-03–2025-12-31).
- [ ] MAE, RMSE, sMAPE calculated correctly on test set.
- [ ] `POST /api/v1/forecast` endpoint complete.
- [ ] Unit tests for evaluation metrics (verify baseline: MAE ≈ 150.55).

**Go/No-go gate:** Forecast endpoint returns valid response matching API_CONTRACT.md schema exactly.

### Milestone 3 — Supply and Hourly Services (Member 2, Day 2)

- [ ] `supply_service.py` implements shortfall formula: `max(0, forecast - supply)`.
- [ ] Handles dates beyond synthetic supply range with explicit warning.
- [ ] `POST /api/v1/supply-check` complete.
- [ ] `GET /api/v1/hourly-demand` complete (AMD001, AMD004, AMD008; 2025-12-02 to 2025-12-31).
- [ ] Unit tests for shortfall calculation.

### Milestone 4 — Impact Simulator (Member 2, Day 2)

- [ ] `impact_service.py` implements three formulas from PROJECT_SPEC.md Feature E.
- [ ] Input validation: all proportions 0–1; catchment_demand > 0; radius 0.1–50.
- [ ] `POST /api/v1/impact-simulator` returns `geographic_analysis_available: false` (no verified coords).
- [ ] Unit tests for formula correctness including edge cases (zero accessibility demand, full diversion).

### Milestone 5 — Data Quality Endpoint (Member 2, Day 2)

- [ ] `quality_service.py` reads data_gaps.csv, data_sources.csv, infrastructure CSV.
- [ ] `GET /api/v1/data-quality` returns complete provenance summary.

### Milestone 6 — Dashboard and Core Pages (Member 1, Day 1–2)

- [ ] TypeScript API client types match API_CONTRACT.md exactly.
- [ ] Dashboard page (Feature A): station counts, demand summary, shortfall badge, hourly summary.
- [ ] Data origin badges displayed for all synthetic data.
- [ ] Loading skeletons for all async calls.
- [ ] Error states for all API failures.
- [ ] Navigation between all pages.

### Milestone 7 — Forecasting and Alert Pages (Member 1, Day 2)

- [ ] Station selector dropdown with all 11 eligible stations.
- [ ] Historical demand chart (Recharts AreaChart or LineChart).
- [ ] Forecast chart with confidence bands (when available).
- [ ] Baseline vs. model comparison chart.
- [ ] Weekly aggregation toggle.
- [ ] Reliability panel (Feature F) on forecast page.
- [ ] Supply-shortfall alert chart (demand + supply + shortfall).
- [ ] User-entered supply override form.

### Milestone 8 — Map Page (Member 1, Day 2–3)

- [ ] React Leaflet map centred on Ahmedabad (23.0225°N, 72.5714°E).
- [ ] Unavailable state displayed (no verified coordinates).
- [ ] OpenStreetMap / Leaflet attribution visible.
- [ ] User click to propose a new station location.
- [ ] Proposed location marker displayed on map.
- [ ] Clear label: "Illustrative scenario mode — no verified station coordinates available."

### Milestone 9 — Impact Simulator Page (Member 1, Day 3)

- [ ] Form with all 6 adjustable inputs from Feature E.
- [ ] Client-side input validation before API call.
- [ ] Results panel: proposed demand, diverted demand, net additional demand.
- [ ] Formulas displayed in plain language.
- [ ] Assumptions panel showing all user inputs.
- [ ] `illustrative_scenario` data-origin badge.
- [ ] Geographic analysis unavailable notice.

### Milestone 10 — Integration and Polish (Both members, Day 3)

- [ ] End-to-end test of all features on both machines.
- [ ] All acceptance tests in ACCEPTANCE_TESTS.md passing.
- [ ] Responsive layout verified at 1280px, 768px, 375px.
- [ ] Accessibility: keyboard navigation, ARIA labels, reduced-motion.
- [ ] All data-origin badges visible throughout.
- [ ] Demo script practised.

---

## 3. Dependencies Between Components

```
DATA_PROVENANCE.md ←── validates ──── generate_synthetic_data.py
       │
       ▼
API_CONTRACT.md ──── defines schemas for ───► server/schemas/
                                                    │
                                                    ▼
                                             server/services/
                                                    │
                                                    ▼
                                             server/routers/
                                                    │
                                             FastAPI endpoints
                                                    │
                                             client/src/api/    ◄── typed by API_CONTRACT.md
                                                    │
                                             client/src/pages/
```

### Blocking dependencies

| Frontend blocker | Backend deliverable needed |
|-----------------|---------------------------|
| Station selector can be built | `GET /api/v1/stations` working |
| Historical chart | `GET /api/v1/stations/{id}/history` working |
| Forecast chart | `POST /api/v1/forecast` working |
| Supply alert chart | `POST /api/v1/supply-check` working |
| Hourly chart | `GET /api/v1/hourly-demand` working |
| Simulator results | `POST /api/v1/impact-simulator` working |
| Data quality page | `GET /api/v1/data-quality` working |

---

## 4. Test Strategy

### Backend tests (`server/tests/`)

- Unit tests for each service function in isolation (no FastAPI layer).
- Integration tests for each endpoint (using FastAPI TestClient).
- Data integrity tests: verify CSV load produces correct counts.
- Formula tests: verify impact simulator formulas with known inputs.
- Evaluation test: verify baseline MAE ≈ 150.55 kg/day.

### Frontend tests (`client/src/__tests__/`)

- Component tests for data-origin badge display.
- Form validation tests for impact simulator inputs.
- API client type tests (TypeScript compilation).

### Integration tests (both members)

- Run through the ACCEPTANCE_TESTS.md checklist before demo.
- Verify every response schema matches API_CONTRACT.md field-by-field.

---

## 5. Git Workflow

| Branch | Owner | Purpose |
|--------|-------|---------|
| `main` | Both | Approved planning documents; integration baseline |
| `feature/frontend` | Member 1 | All `client/` development |
| `feature/backend-data` | Member 2 | All `server/` development |

**Rules:**
- PRs to `main` require acknowledgement from the other member.
- No force-push to `main`.
- `docs/` files on `main` are the canonical reference; changes require both members' agreement.
- Integration merges to `main` happen at each Milestone gate.
- `CNG_SmartPlan_Data/` is never modified by either branch.

---

## 6. Integration Checkpoints

| Checkpoint | When | Action |
|------------|------|--------|
| API health check | Milestone 0 complete | Both members confirm: frontend can reach backend |
| Stations list | Milestone 1 complete | Frontend renders station dropdown from API |
| Full forecast pipeline | Milestone 2 complete | Frontend shows forecast chart with real API data |
| Supply alert | Milestone 3 complete | Frontend shows shortfall alert with real API data |
| Simulator | Milestone 4 complete | Frontend shows simulator results with real API data |
| Full demo | Milestone 10 complete | All ACCEPTANCE_TESTS pass |

---

## 7. Definition of Done

A feature is done when:
1. Backend endpoint matches API_CONTRACT.md schema exactly (field names, types, nullability).
2. Frontend renders the feature using only API responses (no hardcoded demo values).
3. `data_origin` badge is displayed correctly.
4. Loading skeleton, error state, and empty state are implemented.
5. The relevant ACCEPTANCE_TESTS.md tests pass.
6. No console errors or warnings in the browser.

---

## 8. Remaining Blockers Before Production Use

| Blocker | Impact | Resolution |
|---------|--------|------------|
| **No verified station coordinates** | Feature D limited to unavailable/illustrative mode; Feature E cannot do geographic analysis | Obtain from operator or authoritative geocoder |
| **No real sales data** | Forecasts are synthetic demonstrations only | Request from Gujarat Gas / operators |
| **No real supply data** | Supply alerts are illustrative only | Request supply-plan export from operator |
| **Incomplete station inventory** | 12 stations only; Adani Total Gas stations missing | Retrieve from Adani locator; reconcile |
| **No AMC boundary** | Study-area inclusion is locality-screened only | Download DataMeet Wards.geojson; validate |

---

## 9. Local Development Setup

### Backend

```bash
cd server
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd client
npm install
npm run dev
# Opens at http://localhost:5173
```

Both must run simultaneously for integration. The frontend Vite dev server proxies `/api/*` to port 8000.

### Data

The `CNG_SmartPlan_Data/` folder is the single read-only data source.
Point `server/data/` to it (symlink or environment variable `DATA_PATH`).
The backend must not write to any CSV file.


---

## 10. Milestone 6: End-to-End SerpApi Google Maps Integration

### 10.1 Objective
Integrate real-world Google Maps geospatial intelligence into the CNG SmartPlan map and planning views using SerpApi:
1. **Google Maps Search API (`engine=google_maps`, `type=search`):** Search and discover real CNG pumps across Ahmedabad.
2. **Google Maps Autocomplete API (`engine=google_maps_autocomplete`):** Debounced location suggestions distinguishing selectable places with coordinates from text keywords.
3. **Google Maps Place Details (`engine=google_maps`):** Detailed operating hours, ratings, customer review snippets, photos, and contact info.
4. **Google Maps Directions API (`engine=google_maps_directions`):** Actual road routing, travel durations, turn-by-turn navigation steps, Leaflet road polylines, and road-to-straight-line detour ratios.

### 10.2 Architecture & Data Quarantine
- **Backend Service Layer:** `server/services/serpapi_client.py` (with disk caching) and `server/services/google_maps_service.py`.
- **API Endpoints:** `/api/v1/maps/search`, `/api/v1/maps/autocomplete`, `/api/v1/maps/place-details`, `/api/v1/maps/directions`, `/api/v1/maps/discoveries`.
- **Quarantine Guarantee:** External discoveries are written strictly to `server/data/serpapi_geographic_discoveries.json` and never contaminate original CSVs in `CNG_SmartPlan_Data/`.
- **Frontend Components:** `LocationAutocomplete.tsx`, `MapSearchBar.tsx`, `StationDetailsSheet.tsx`, `DirectionsPanel.tsx`, and upgraded `StationMap.tsx`.
- **Test Coverage:** Automated unit and integration tests in `server/tests/test_maps_service.py` and `client/src/__tests__/Milestone6MapsSerpApi.test.tsx`.


---

## Milestone 7: Final Prototype Completion, Evaluator Tour & Hardening (Completed)

1. **SerpApi Demonstration Reliability & Offline Fallback:**
   - 109KB genuine cached Ahmedabad SerpApi fixtures in `server/data/fixtures/serpapi_demo_fixtures.json`.
   - `SerpApiClient` with three operational modes: `auto`, `live`, `demo`. Automatic zero-latency fallback to demo fixtures on missing key, quota exhaustion, or network disconnects.
   - Distinct metadata flag (`is_fixture: true`) ensuring evaluator transparency without inventing synthetic stations.

2. **Candidate Station Quarantine Review Workflow:**
   - Formal candidate statuses: `unverified_candidate`, `pending_review`, `verified_project_record`, `rejected`, `proposed_simulation_location`.
   - Spatial duplicate detection (<250m proximity alert) against existing station registry.
   - Planner review queue modal (`CandidateReviewPanel.tsx`) with audit history, status transitions, review notes, and 1-click "Send to Simulator" export.
   - Backend routes: `GET /api/v1/maps/status`, `POST /api/v1/maps/mode`, `GET /api/v1/maps/candidates`, `GET /api/v1/maps/candidates/summary`, `PUT /api/v1/maps/candidates/{id}/status`.

3. **Map Reliability & Error Resilience:**
   - Handled Leaflet `tileerror` event to detect tile loading failures, rendering an informative offline connection banner while preserving cached candidate markers and route overlays.
   - Explicit disclaimer labeling the Ahmedabad study area bounds as provisional screening coordinates.

4. **1-Click Forecasting Planning Presets:**
   - `ForecastScenariosPanel.tsx` providing 3 preset demonstration configurations: Normal Supply (1,800 kg/d), Constrained Delivery (1,100 kg/d, -39%), and Peak Demand Surge (+25%).
   - Seamless parameter synchronization: updates horizon, models, and triggers live forecast re-computations without converting missing data to zero.

5. **Impact Simulator Persistence, Detour Analysis & Executive Export:**
   - Active scenario auto-persistence in `localStorage` (`cng_simulator_active_scenario`); auto-restores on page reload.
   - Named Scenario Library (`ScenarioPersistenceBar.tsx`): Save custom scenarios, load from dropdown, delete, or reset to benchmark.
   - CSV Export (`exportSimulatorCsv`): Generates structured `.csv` with metadata, inputs, outputs, sensitivity grid, and data gaps (GAP-001..GAP-008).
   - Executive Printable Report (`triggerPrintableReport`): Clean `@media print` styling hiding UI chrome.
   - Road Accessibility & Detour Analysis (`SimulatorRoadAccessibility.tsx`): Compares straight-line Euclidean distance with Google Maps road routing, travel duration, and detour ratio with diversion friction calibration.

6. **Evaluator Quick Tour & Startup Automation:**
   - Interactive 5-step floating evaluation tour (`EvaluationTour.tsx`) across Dashboard, Station Register, Forecast Engine, Network Map, and Impact Simulator. Auto-launches on first visit with option to minimize or dismiss.
   - One-click startup scripts (`start.bat` and `start.ps1`) verifying Python/Node, launching FastAPI (port 8000) and React (port 5173), and opening the browser.
