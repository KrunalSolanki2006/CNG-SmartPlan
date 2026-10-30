# CNG SmartPlan — Backend & Data Implementation Plan

**Version:** 1.0  
**Date:** 2026-10-30  
**Owner:** Member 2 — Data and Backend  
**References:** `docs/API_CONTRACT.md` (authoritative schemas), `docs/DATA_PROVENANCE.md` (data classification)

> Member 2 owns everything in `server/`. Do not independently define endpoint field names or response shapes.
> All schemas are defined in `API_CONTRACT.md` and must be implemented exactly.

---

## 1. Technology Stack

| Technology | Purpose |
|------------|---------|
| Python ≥3.11 | Runtime |
| FastAPI ≥0.110 | API framework with automatic OpenAPI docs |
| Pydantic v2 | Request/response schema validation |
| pandas ≥2.0 | CSV loading, data manipulation |
| NumPy ≥1.26 | Numeric computation |
| scikit-learn ≥1.4 | Baseline model / metrics |
| statsmodels | Holt-Winters exponential smoothing |
| uvicorn | ASGI server |

---

## 2. Project Structure

```
server/
├── data/                    # Symlink or env-var path to CNG_SmartPlan_Data/ (READ ONLY)
├── services/
│   ├── data_loader.py       # Loads all CSVs at startup; validates shapes
│   ├── station_service.py   # Station inventory queries
│   ├── forecast_service.py  # Forecasting and evaluation
│   ├── supply_service.py    # Shortfall calculation
│   ├── impact_service.py    # Impact simulator formulas
│   ├── hourly_service.py    # Hourly demand queries
│   └── quality_service.py   # Provenance and data-gap summary
├── routers/
│   ├── health.py
│   ├── overview.py
│   ├── stations.py
│   ├── forecast.py
│   ├── supply.py
│   ├── hourly.py
│   ├── impact.py
│   └── quality.py
├── schemas/
│   ├── stations.py          # StationResponse, StationsListResponse
│   ├── forecast.py          # ForecastRequest, ForecastResponse
│   ├── supply.py            # SupplyCheckRequest, SupplyCheckResponse
│   ├── impact.py            # ImpactRequest, ImpactResponse
│   ├── hourly.py            # HourlyResponse
│   ├── overview.py          # OverviewResponse
│   └── quality.py           # DataQualityResponse
├── tests/
│   ├── test_data_loader.py
│   ├── test_station_service.py
│   ├── test_forecast_service.py
│   ├── test_supply_service.py
│   ├── test_impact_service.py
│   ├── test_hourly_service.py
│   └── test_endpoints.py
├── main.py
└── requirements.txt
```

---

## 3. `data_loader.py` — Data Foundation

This module loads all CSV files once at startup and exposes them as module-level DataFrames.
All services import from this module; they do not read CSVs independently.

```python
# services/data_loader.py (structure only — no implementation here)
class DataStore:
    stations: pd.DataFrame       # 12 rows, 22 cols; all data_type=real_public
    daily_sales: pd.DataFrame    # 8,041 rows, 12 cols; all data_type=synthetic
    supply: pd.DataFrame         # 8,041 rows, 5 cols; all data_type=synthetic
    hourly: pd.DataFrame         # 2,160 rows, 10 cols; all data_type=synthetic
    coordinate_candidates: pd.DataFrame  # 8 rows, 12 cols; all approved_for_map_pin=no
    infrastructure: pd.DataFrame # 4 rows, 12 cols; real_public historical context
    data_sources: pd.DataFrame   # 18 rows, 13 cols
    data_gaps: pd.DataFrame      # 8 rows, 8 cols
```

**Validation on load (must check and raise on failure):**
- `stations`: exactly 22 columns; `station_id` unique; all `data_type=real_public`; all `coordinates_verified=False`
- `daily_sales`: 8,041 rows; 11 unique stations; date range 2024-01-01 to 2025-12-31; no duplicates; no negatives
- `supply`: 8,041 rows; same (station_id, date) keys as daily_sales; no negatives
- `hourly`: 2,160 rows; 3 stations (AMD001, AMD004, AMD008); 24 rows per station-day; period 2025-12-02 to 2025-12-31
- `coordinate_candidates`: all `approved_for_map_pin=no`

If any validation fails, the server must refuse to start and log an informative error.

**AMD010 exclusion:** Filter AMD010 from eligible-for-simulation queries. It exists in `stations` but must never appear in synthetic analysis results.

---

## 4. `station_service.py`

Provides station queries:
- `get_all_stations(in_study_area=None, eligible_for_simulation=False)` → list of station dicts
- `get_station_by_id(station_id: str)` → station dict or `None`
- `get_eligible_stations()` → stations where `in_study_area=yes` (11 stations)

**Rules:**
- `eligible_for_map_pin` is always `False` for all 12 stations.
- `latitude` and `longitude` are always `None`.
- `map_availability` is always `{"available": False, "reason": "..."}`.
- `simulation_profile` is derived from address/locality using the same logic as `generate_synthetic_data.py`.

---

## 5. `forecast_service.py` — Forecasting Pipeline

### Chronological split (mandatory)

```
Train: 2024-01-01 → 2025-10-02  (641 days per station)
Test:  2025-10-03 → 2025-12-31  (90 days per station; 990 station-days total)
```

Never randomise. Never use future dates in training.

### Baseline model: 28-day rolling mean

For date `d` in the test period:
```
prediction(d) = mean(sales[d-28:d-1])
```

Expected test metrics (from validated baseline):
- MAE ≈ 150.55 kg/day
- RMSE ≈ 189.69 kg/day
- sMAPE ≈ 11.41%

Verify these are reproduced in `test_forecast_service.py`.

### Primary model: Holt-Winters Exponential Smoothing

Use `statsmodels.tsa.holtwinters.ExponentialSmoothing` with:
- `trend='add'`
- `seasonal='add'` with `seasonal_periods=7`
- Damped trend as an option

Fit on train period; evaluate on test period; forecast for `horizon_days` beyond the last training date.

### Metric definitions

```python
MAE   = mean(abs(y_true - y_pred))
RMSE  = sqrt(mean((y_true - y_pred)**2))
sMAPE = 100 * mean(2 * abs(y_true - y_pred) / (abs(y_true) + abs(y_pred)))
```

### Confidence intervals

Holt-Winters via statsmodels returns `alpha`-level prediction intervals; expose as `lower_bound_kg` and `upper_bound_kg`.
Rolling mean baseline has no confidence interval: return `null`.

### Response

Follow `ForecastResponse` schema in `API_CONTRACT.md` exactly. All field names must match.

---

## 6. `supply_service.py` — Shortfall Calculation

Formula:
```python
potential_shortfall_kg = max(0, forecast_demand_kg - planned_available_supply_kg)
```

### Date matching rules

1. For dates within the synthetic supply range (2024-01-01 to 2025-12-31):  
   - Match `(station_id, date)` exactly from `synthetic_supply.csv`.
   - Tag `supply_data_origin = "synthetic_demo"`.
2. For forecast dates beyond 2025-12-31:  
   - **Do not silently reuse historical supply values.**
   - If `user_supply_overrides` is provided and contains the date, use that value and tag `supply_data_origin = "user_entered_scenario"`.
   - If no user override is provided, return `planned_supply_kg = null`, `potential_shortfall_kg = null`, `has_shortfall = null`, and include a warning.
3. `user_supply_overrides` override synthetic values for any date they contain.

### Warnings to always include

- "Synthetic supply covers only 2024-01-01 to 2025-12-31. Forecast dates beyond this range require user-entered supply values."
- "These are potential planning shortfalls, not confirmed stockouts."

---

## 7. `hourly_service.py` — Hourly Demand

Available data:
- Stations: AMD001, AMD004, AMD008 only.
- Period: 2025-12-02 to 2025-12-31.
- 24 rows per station-day.

Service methods:
- `get_hourly(station_id=None, date=None)` → filtered records.
- Validate that requested dates fall within the available period; return 422 otherwise.

---

## 8. `impact_service.py` — Impact Simulator

Implement the three formulas exactly as specified:

```python
def calculate_impact(
    catchment_demand_kg_per_day: float,
    capture_proportion: float,
    accessibility_demand_kg_per_day: float,
    diversion_proportion: float,
) -> dict:
    proposed_demand = (catchment_demand_kg_per_day * capture_proportion) + accessibility_demand_kg_per_day
    diverted_demand = proposed_demand * diversion_proportion
    net_additional  = proposed_demand - diverted_demand
    return {
        "proposed_station_demand_kg_per_day": round(proposed_demand, 2),
        "estimated_diverted_demand_kg_per_day": round(diverted_demand, 2),
        "net_additional_network_demand_kg_per_day": round(net_additional, 2),
    }
```

**Input validation (Pydantic):**
- `proposed_latitude`: -90 to 90
- `proposed_longitude`: -180 to 180
- `catchment_radius_km`: 0.1 to 50.0
- `catchment_demand_kg_per_day`: > 0
- `capture_proportion`: 0.0 to 1.0
- `diversion_proportion`: 0.0 to 1.0
- `accessibility_demand_kg_per_day`: ≥ 0.0 (default 0.0)

**Geographic analysis:**
- Always return `geographic_analysis_available: False` with the standard reason message.
- Never compute distances from the proposed location to station candidates.
- `nearby_stations: null`.

---

## 9. `quality_service.py` — Data Quality Summary

Reads from `data_store`:
- Station counts (total, eligible_for_simulation, eligible_for_map_pin).
- Synthetic data row counts and date ranges.
- Baseline evaluation metrics (hardcoded from validated results: MAE=150.55, RMSE=189.69, sMAPE=11.41%).
- Data gaps from `data_gaps.csv` (all 8 rows).
- Contextual indicators from `infrastructure.csv` (all 4 rows).

Note: The baseline metrics are known constants from `validate_package.py`; the quality service may either
recompute them on startup (preferred) or return the pre-validated constants with a note.

---

## 10. Pydantic Schemas (`server/schemas/`)

All Pydantic models must implement the exact field names and types from `API_CONTRACT.md`.
Use `model_config = ConfigDict(extra='forbid')` to prevent extra fields from slipping through.

Example enforcement:
```python
class ImpactRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    proposed_latitude: Annotated[float, Field(ge=-90, le=90)]
    proposed_longitude: Annotated[float, Field(ge=-180, le=180)]
    catchment_radius_km: Annotated[float, Field(ge=0.1, le=50.0)]
    catchment_demand_kg_per_day: Annotated[float, Field(gt=0)]
    capture_proportion: Annotated[float, Field(ge=0.0, le=1.0)]
    diversion_proportion: Annotated[float, Field(ge=0.0, le=1.0)]
    accessibility_demand_kg_per_day: Annotated[float, Field(ge=0.0)] = 0.0
```

---

## 11. `main.py` — Application Entry Point

```python
# Structure only — no implementation code during planning
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.data_loader import load_all_data
from routers import health, overview, stations, forecast, supply, hourly, impact, quality

app = FastAPI(title="CNG SmartPlan API", version="1.0")

@app.on_event("startup")
async def startup():
    load_all_data()  # Validates and caches all CSVs

app.add_middleware(CORSMiddleware, ...)  # See API_CONTRACT.md Section 4

app.include_router(health.router,    prefix="/api/v1")
app.include_router(overview.router,  prefix="/api/v1")
app.include_router(stations.router,  prefix="/api/v1")
app.include_router(forecast.router,  prefix="/api/v1")
app.include_router(supply.router,    prefix="/api/v1")
app.include_router(hourly.router,    prefix="/api/v1")
app.include_router(impact.router,    prefix="/api/v1")
app.include_router(quality.router,   prefix="/api/v1")
```

---

## 12. Error Handling

All errors must return the standard error object from `API_CONTRACT.md Section 2`:

```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

def http_error(status: int, code: str, message: str, fields=None):
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "fields": fields}}
    )
```

Install a global exception handler for unexpected errors that returns `INTERNAL_ERROR`.

---

## 13. Testing Requirements (`server/tests/`)

### Unit tests

| File | What to test |
|------|-------------|
| `test_data_loader.py` | Correct row counts on load; AMD010 exclusion from eligible set |
| `test_station_service.py` | Filtering; `eligible_for_map_pin=False` always; `latitude=None` always |
| `test_forecast_service.py` | Chronological split dates; baseline MAE ≈ 150.55; no date shuffling |
| `test_supply_service.py` | Shortfall formula with known inputs; null supply for post-2025 dates without overrides |
| `test_impact_service.py` | Formula correctness with known inputs; edge cases (zero accessibility, full diversion) |
| `test_hourly_service.py` | Correct stations; correct date range; 24 rows per station-day |

### Integration tests

| File | What to test |
|------|-------------|
| `test_endpoints.py` | Each endpoint returns HTTP 200 with valid schema; 404 for unknown station_id; 422 for out-of-range inputs |

Run with: `pytest server/tests/ -v`

---

## 14. File Ownership Rules

Member 2 owns **all files** under `server/`.  
Member 2 must **not** modify:
- Any file under `client/`
- Any file under `CNG_SmartPlan_Data/`
- Any file under `docs/` (except minor formatting; schema changes require both members)

---

## 15. Backend Acceptance Criteria Checklist

- [ ] All 9 endpoints return HTTP 200 with schema matching `API_CONTRACT.md` field-by-field.
- [ ] `GET /api/v1/health` confirms: stations=12, eligible=11, daily_rows=8041, supply_rows=8041, hourly_rows=2160.
- [ ] `GET /api/v1/stations` returns `eligible_for_map_pin=false` for all 12 stations.
- [ ] `GET /api/v1/stations` returns `map_availability.available=false`.
- [ ] `POST /api/v1/forecast` returns baseline metrics ≈ MAE 150.55, RMSE 189.69, sMAPE 11.41%.
- [ ] `POST /api/v1/forecast` chronological split: train ends 2025-10-02; test starts 2025-10-03.
- [ ] `POST /api/v1/supply-check` correctly calculates `max(0, forecast - supply)`.
- [ ] `POST /api/v1/supply-check` returns `null` for supply outside synthetic range without user override.
- [ ] `POST /api/v1/impact-simulator` returns correct formula results for known inputs.
- [ ] `POST /api/v1/impact-simulator` returns `geographic_analysis_available=false`.
- [ ] All evaluation metrics include `data_origin=synthetic_demo`.
- [ ] AMD010 never appears in any forecast, supply, or hourly response.
- [ ] Server refuses to start if any CSV fails shape/integrity validation.
- [ ] All acceptance tests in `ACCEPTANCE_TESTS.md` passing for backend items.
