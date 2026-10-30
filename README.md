# CNG SmartPlan — AI-Powered CNG Demand Forecasting & Smart Station Planning System

**Problem Statement ID:** PS000002  
**Problem Statement Title:** Station-Level Demand Forecasting for CNG Sales to Optimize Network Expansion  
**Target Organization:** Gujarat Gas Company Limited  
**Status:** Planning Phase Completed — Ready for Implementation

---

## ?? Project Overview

CNG SmartPlan is an AI-powered demand forecasting and geospatial planning system designed for Gujarat Gas Company Limited to solve five core challenges:
1. Station-level CNG demand forecasting across varied operational contexts (Highway, Industrial, Urban, Commercial).
2. Proactive stockout prevention through supply-vs-demand early warning alerts.
3. Queue delay and waiting time estimation across peak operational windows.
4. Data-driven network expansion site selection with transparent scoring (0–100 scorecards).
5. Explainable AI decision transparency (SHAP feature attributions and factor breakdowns) with strict provenance labeling.

---

## ?? Architecture & Engineering Documentation

All architectural decisions, contracts, and implementation blueprints are documented in [docs/](docs/):

| Document | Description |
| :--- | :--- |
| **[docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)** | Master specification covering core features (A through G), user personas, UX standards, and constraints. |
| **[docs/API_CONTRACT.md](docs/API_CONTRACT.md)** | Canonical 9-endpoint REST API contract (schemas, request/response models, mock payloads). |
| **[docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md)** | Complete provenance tracking, dataset metrics, schema definitions, and labeling rules. |
| **[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)** | 10-milestone master delivery plan, Git branching strategy, and risk mitigation register. |
| **[docs/FRONTEND_IMPLEMENTATION_PLAN.md](docs/FRONTEND_IMPLEMENTATION_PLAN.md)** | Member 1 delivery roadmap: design system, UI components, Leaflet map, and analytics dashboards. |
| **[docs/BACKEND_IMPLEMENTATION_PLAN.md](docs/BACKEND_IMPLEMENTATION_PLAN.md)** | Member 2 delivery roadmap: FastAPI server, LightGBM/XGBoost models, expansion scoring, and pipeline. |
| **[docs/ACCEPTANCE_TESTS.md](docs/ACCEPTANCE_TESTS.md)** | 48 verification tests across 11 test suites covering functional, edge-case, and UI behavior. |

---

## ?? Data Assets

The CNG_SmartPlan_Data/ directory contains the baseline data package:
- cng_stations.csv (12 stations with operational parameters, research queue coordinates)
- synthetic_daily_sales.csv (8,041 daily station sales records with weather, footfall, industrial index)
- synthetic_supply.csv (8,041 scheduled delivery vs received records, cascade pressure, stockout flags)
- synthetic_hourly_demand.csv (2,160 hourly records capturing diurnal commuter/fleet cycles)
- station_coordinate_candidates.csv (Candidates queue for manual spatial validation)
- Comprehensive data dictionary, validation reports, and synthesis scripts.

> **Provenance Rule:** Real and synthetic records are tracked and visually badged throughout the platform. Coordinate candidates are quarantined until field verification.

---

## ?? Team & Development Workflow

- **Branching Model:** main (production / docs), eature/frontend (UI / Dashboard), eature/backend-data (FastAPI / ML / GIS).
- Developed for Gujarat Gas Company Limited Network Expansion Hackathon.
