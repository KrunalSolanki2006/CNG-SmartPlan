# CNG SmartPlan — Project Specification

**Version:** 1.0  
**Date:** 2026-10-30  
**Status:** Approved for implementation  
**Problem statement ID:** PS000002  
**Official title:** Station-Level Demand Forecasting for CNG Sales to Optimize Network Expansion  
**Organisation:** Gujarat Gas Company Limited

> Both developers must treat this document as the single shared definition of what the system does,
> who it serves, and what constraints it must respect. Any deviation requires an explicit decision recorded here.

---

## 1. Official Problem Statement

**PS000002 — Station-Level Demand Forecasting for CNG Sales to Optimize Network Expansion**

Gujarat Gas Company Limited faces five interconnected problems:

| Problem | Description |
|---------|-------------|
| A | Future CNG sales at individual stations are uncertain, making supply planning difficult. |
| B | Planned supply can be mismatched against actual demand, risking potential shortfalls or over-commitment. |
| C | The network may have geographic gaps where customers cannot conveniently reach a CNG station. |
| D | Proposed new stations may duplicate coverage, merely diverting customers rather than generating new demand. |
| E | Demand varies by hour, day of week, season, and year; daily averages obscure peak-period risk. |

The solution must help a planning team answer:
1. How much CNG might each existing station need in the coming days or weeks?
2. Which stations might have insufficient planned supply relative to forecast demand?
3. Where could a proposed new CNG station improve access to CNG?
4. How much demand might a proposed station attract, and how much is genuinely new vs. diverted?
5. How reliable are the estimates, and what evidence supports them?

---

## 2. Intended Users

| User group | Primary need |
|------------|-------------|
| CNG demand-planning team | Forecast station demand; identify supply mismatches |
| Network operations / supply-planning team | Prioritise supply allocation; avoid shortfalls |
| Station franchisees / dealers | Understand local demand; evaluate investment |
| Network expansion planners | Identify coverage gaps; assess new-station impact |

---

## 3. System Purpose

CNG SmartPlan is a **decision-support platform** only. It provides evidence-based estimates to help planners
make better decisions. It does not make decisions autonomously, does not guarantee business results, and
does not deliver gas.

The system must:
- Connect demand forecasting, supply planning, geographic analysis, and investment decisions in one interface.
- Distinguish **demand diversion** (customers switching from nearby stations) from **demand generation**
  (genuinely new network demand).
- Be truthful about data provenance: synthetic demonstration data must never be presented as real observations.

---

## 4. Complete Feature Requirements

### Feature A — Operations Dashboard (Required)

The central landing page must display:
- Count of source-backed stations in the inventory (12 total; 11 eligible for synthetic simulation).
- Count of stations eligible for verified map display (currently **0** — no coordinates are verified).
- Summary of historical (synthetic) demand across the network.
- Upcoming 7-day forecast demand summary.
- Count and list of stations with potential supply-shortfall alerts.
- Busy-period indicators from synthetic hourly data (3 stations: AMD001, AMD004, AMD008).
- Data-quality badges: synthetic_demo, 
eal_public, or illustrative_scenario.
- Navigation links to all other features.

**Constraints:**
- All figures come from API responses, not hardcoded constants.
- synthetic_demo label must be displayed prominently wherever synthetic data appears.

### Feature B — Station-Level Demand Forecasting (Required)

- Allow selection of any of the 11 eligible stations (AMD001–AMD009, AMD011, AMD012).
- Display historical synthetic daily sales as a time-series chart.
- Generate a 7-day forecast by default; allow 14 or 30 days.
- Support weekly aggregated view.
- Compare a **28-day rolling-mean baseline** against at least one model (e.g., Holt-Winters or SARIMA).
- **Chronological train/test split only** — never random shuffle.
  - Train: 2024-01-01 to 2025-10-02.
  - Test: 2025-10-03 to 2025-12-31 (990 station-days).
- Report MAE, RMSE, sMAPE from the actual chronological test only.
  - Existing baseline (synthetic): MAE=150.55 kg/day, RMSE=189.69 kg/day, sMAPE=11.41%.
- Show forecast uncertainty bands where the model supports them.
- Display a warning that all metrics are from synthetic data only.
- Note that is_public_holiday and event_name are intentionally blank in all 8,041 rows.

**Do not:**
- Shuffle dates for evaluation.
- Claim a forecasting model already exists before implementation.
- Present synthetic metrics as evidence of real-world accuracy.

### Feature C — Potential Supply-Shortfall Alerts (Required)

Formula:
`
potential_shortfall_kg = max(0, forecast_demand_kg - planned_available_supply_kg)
`

Requirements:
- Allow station selection; show forecast vs. supply for overlapping dates.
- Accept user-entered supply assumptions for future dates beyond the 2024–2025 synthetic range.
- Label all supply values as synthetic, historical, or user_entered_scenario.
- Distinguish a **potential planning shortfall** from an **actual stockout**.
- Never silently reuse historical supply values for forecast dates.
- Display demand, supply, and shortfall on a single aligned chart.

### Feature D — Interactive Station Map (Required)

Technology: **React Leaflet** with OpenStreetMap tiles.

Requirements:
- Centre on Ahmedabad, Gujarat (≈23.0225°N, 72.5714°E).
- **Zero stations have verified coordinates** — latitude/longitude are blank in all 12 rows of cng_stations.csv.
- Implement an honest **unavailable state** or **clearly labelled illustrative scenario mode**.
- Allow user to click or type coordinates for a proposed new station location.
- Never display the 8 coordinate candidates from station_coordinate_candidates.csv as confirmed pins (all pproved_for_map_pin=no).
- Do not calculate geographic distances — no verified coordinates exist.
- Display OpenStreetMap / Leaflet attribution on every map view.

### Feature E — New-Station Impact Simulator (Required — Signature Feature)

User-adjustable inputs:

| Input | Description | Default |
|-------|-------------|---------|
| Proposed coordinates | Lat/Lon of candidate | Map click |
| Catchment radius (km) | Draw area | 3.0 |
| Catchment demand (kg/day) | Total CNG demand available in catchment | User entered |
| Capture proportion | Fraction of catchment demand captured | 0.35 |
| Diversion proportion | Fraction of proposed demand from existing stations | 0.60 |
| Accessibility demand (kg/day) | New demand from improved access | 0.0 |

Formulas (displayed transparently in the UI):
`
proposed_station_demand_kg    = (catchment_demand_kg × capture_proportion) + accessibility_demand_kg
estimated_diverted_demand_kg  = proposed_station_demand_kg × diversion_proportion
net_additional_network_demand = proposed_station_demand_kg - estimated_diverted_demand_kg
`

Outputs:
- Proposed-station demand (kg/day).
- Estimated demand diverted from existing stations (kg/day).
- Estimated net additional network demand (kg/day).
- All input assumptions explicitly listed.
- All formulas shown in plain language.
- Data-quality note: illustrative_scenario.
- Nearby-station effects: **not available** (no verified coordinates); API returns geographic_analysis_available: false.

**Do not:**
- Invent station-specific sales reductions when verified locations are absent.
- Present simulator results as validated predictions.
- Allow negative values or proportions outside [0, 1].

### Feature F — Forecast Reliability and Data Quality (Required)

For every forecast or simulation output, display a reliability panel showing:
- Data origin (synthetic_demo / 
eal_public / illustrative_scenario).
- Historical data coverage: number of daily records, date range, completeness.
- Missing value counts (notably blank holiday/event fields).
- Evaluation metrics from the chronological test period.
- Forecast uncertainty (confidence interval if model supports it).
- Reasons an estimate is weak or unavailable.

**Do not:**
- Invent confidence percentages without a statistical basis.
- Use an arbitrary reliability score without a documented and tested rule.

### Feature G — Longer-Term Scenarios (Optional Extension)

If time allows, allow users to adjust:
- CNG vehicle growth rate (% per year).
- EV adoption trajectory.
- Fuel-price assumptions.
- Future station openings.

All assumptions labelled user_entered_scenario. No Ahmedabad-specific statistics may be invented.

---

## 5. Technical Architecture

`
┌─────────────────────────────────────────────────┐
│              Client (Browser)                     │
│  React + TypeScript + Vite + Tailwind CSS          │
│  Recharts · React Leaflet · Motion                 │
│  Pages: Dashboard · Forecast · Alerts ·            │
│         Map · Simulator · Quality · Scenarios      │
└─────────────────┤ HTTP/REST /api/v1/* ├───────────┐
                   │                           │
┌─────────────────▼─────────────────────────────┐
│           Server (FastAPI, Python)                  │
│  Services: data_loader · forecast_service           │
│            supply_service · impact_service           │
│            quality_service · hourly_service           │
│            station_service                           │
└─────────────────▼─────────────────────────────┐
│         CNG_SmartPlan_Data/ (CSV files)             │
│  cng_stations.csv (12 rows, 22 cols)                 │
│  synthetic_daily_sales.csv (8,041 rows, 12 cols)     │
│  synthetic_supply.csv (8,041 rows, 5 cols)           │
│  synthetic_hourly_demand.csv (2,160 rows, 10 cols)   │
│  station_coordinate_candidates.csv (8 rows, 12 cols) │
│  optional/cng_infrastructure.csv (4 rows, 12 cols)   │
│  data_sources.csv (18 rows, 13 cols)                 │
│  data_gaps.csv (8 rows, 8 cols)                      │
│  data_dictionary.csv (103 rows, 9 cols)              │
└─────────────────────────────────────────────────┘
`

**No database, authentication, LLM API, or external commercial API** for the initial prototype.

---

## 6. Technology Stack (Mandatory)

### Frontend
| Technology | Purpose |
|------------|---------|
| React ≥18 | UI framework |
| TypeScript ≥5 | Type safety |
| Vite ≥5 | Build tool |
| Tailwind CSS ≥3 | Styling |
| Motion (Framer Motion) | Animations |
| Recharts ≥2 | Charts and forecast visualisations |
| React Leaflet ≥4 | Interactive map |

### Backend
| Technology | Purpose |
|------------|---------|
| Python ≥3.11 | Runtime |
| FastAPI ≥0.110 | API framework |
| pandas ≥2.0 | Data loading and manipulation |
| NumPy ≥1.26 | Numeric computation |
| scikit-learn ≥1.4 | Forecasting model candidates |
| Pydantic v2 | Schema validation (via FastAPI) |
| uvicorn | ASGI server |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Responsiveness | Desktop (≥1280px), tablet (768–1279px), mobile (≤767px) |
| Performance | API responses under 2 seconds for forecast and simulator calls |
| Accessibility | WCAG 2.1 AA: keyboard nav, ARIA labels, reduced-motion support |
| Data honesty | All synthetic data must carry data_type=synthetic label |
| Error handling | User-friendly message + machine-readable code for all errors |
| Loading states | All async calls show loading skeletons |
| Empty states | Unavailable data shows explicit explanation |
| Attribution | OpenStreetMap/Leaflet attribution on every map view |
| CORS | Backend permits frontend dev origin; consistently configured |

---

## 8. Data Integrity Rules (Non-Negotiable)

1. Never invent station names, addresses, coordinates, operators, vehicle counts, or sales quantities.
2. All 8 rows in station_coordinate_candidates.csv have pproved_for_map_pin=no — never display as confirmed pins.
3. All synthetic_* CSV values are Python-generated simulation, not real measurements.
4. Baseline evaluation metrics (MAE 150.55, RMSE 189.69, sMAPE 11.41%) are synthetic-demo only.
5. Never alter the content of any original CSV file during development or runtime.
6. optional/cng_infrastructure.csv indicators are historical (2021) — must not be presented as current.
7. Never calculate distances or perform spatial analysis using unverified coordinates.
8. AMD010 (Kanha Petroleum / Ognaj, in_study_area=uncertain) must not be included in synthetic analysis.

---

## 9. Assumptions and Limitations

| Area | Assumption / Limitation |
|------|------------------------|
| Station inventory | 12 stations from 2 operator directories; not a complete cross-operator census |
| Coordinates | 0 verified; 8 unverified candidates (all pproved_for_map_pin=no) |
| Sales data | 100% synthetic; actual sales volumes unknown |
| Supply data | 100% synthetic; actual supply/delivery records unknown |
| Forecast accuracy | Cannot be claimed on real data; synthetic baseline only |
| Geography | Study-area inclusion is locality-screened, not polygon-validated |
| Holidays | Not encoded; is_public_holiday and event_name blank in all 8,041 rows |
| Vehicle registrations | No Ahmedabad-specific Vahan export was retrieved |
| Hourly data | Only 3 stations (AMD001, AMD004, AMD008); final 30 days of 2025 only |
| Operator discrepancy | AMD001 and AMD002 have conflicting operator labels in secondary sources |

---

## 10. Scope Boundaries

### In scope (hackathon prototype)
- Features A through F (all required features).
- CSV-backed backend via FastAPI endpoints.
- Synthetic-data demonstration of the complete feature set.
- Honest uncertainty and provenance labelling throughout.

### Out of scope (future work / Feature G)
- Feature G (long-term scenarios) — optional extension only.
- Database persistence.
- User authentication.
- Real-time data ingestion from operator APIs.
- Verified station coordinates (requires operator collaboration).
- Actual historical sales validation.
- Full cross-operator station census (requires Adani Total Gas structured export).

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| Historical sales | Recorded quantity dispensed in a past period. Not present in this package as real data. |
| Synthetic sales | Simulated kg/day created by generate_synthetic_data.py. |
| Forecast demand | A model's estimate for a future date; generated by the application. |
| Planned available supply | Assumed kg available for the day in the synthetic planning scenario. |
| Potential planning shortfall | max(0, forecast_demand_kg - planned_available_supply_kg). Not proof of stockout. |
| Net additional network demand | proposed_station_demand - estimated_diverted_demand. Both need explicit assumptions. |
| data_origin values | synthetic_demo, 
eal_public, user_entered_scenario, illustrative_scenario |
