# CNG SmartPlan — API Contract

**Version:** 1.0  
**Date:** 2026-10-30  
**Status:** Authoritative — both frontend and backend must implement exactly this contract.  
**URL prefix:** `/api/v1`

> This is the single canonical API contract. Neither developer may define different endpoint paths,
> field names, date formats, units, enums, or response shapes. Any change requires explicit update here
> followed by acknowledgement from both developers before implementation continues.

---

## 1. Conventions

### Base URLs

| Environment | Frontend origin | Backend origin |
|-------------|-----------------|----------------|
| Local dev | `http://localhost:5173` | `http://localhost:8000` |

The frontend Vite dev server proxies `/api/v1/*` to `http://localhost:8000/api/v1/*` via `vite.config.ts`.  
The backend enables CORS for `http://localhost:5173` only in development.

### Date and time format

- All dates: `YYYY-MM-DD` (ISO 8601), e.g. `"2025-12-31"`.
- All datetimes: `YYYY-MM-DD HH:MM:SS` local Ahmedabad time, no timezone suffix, e.g. `"2025-12-31 23:00:00"`.
- All response timestamps: ISO 8601 UTC with `Z` suffix, e.g. `"2026-10-30T12:45:00Z"`.

### Units

| Quantity | Unit |
|----------|------|
| CNG quantities | kilograms (kg) |
| Geographic distances | kilometres (km) |
| Proportions / fractions | decimal 0.0–1.0 |
| Error metrics | kg/day (MAE, RMSE), percent (sMAPE) |

### Field naming

- All field names: `snake_case`.
- Station IDs: `AMD###` pattern, e.g. `AMD001`.
- Enums: lowercase `snake_case` strings.

### data_origin enum (mandatory for every modelled/simulated value)

| Value | Meaning |
|-------|---------|
| `synthetic_demo` | Python-generated simulation data |
| `real_public` | Extracted from a verified public source |
| `user_entered_scenario` | Value supplied by the user at runtime |
| `illustrative_scenario` | Assumption-based calculation, no real data backing |

### Absent / unavailable values

| Situation | Response |
|-----------|----------|
| Value computable but zero | Return `0` or `0.0` |
| Value genuinely unavailable | Return `null` with explanatory `note` field |
| Collection is empty | Return `[]` |
| Feature unavailable (e.g., no verified coords) | Return `{ "available": false, "reason": "..." }` |

---

## 2. Error Format

All errors return JSON:

```json
{
  "error": {
    "code": "STATION_NOT_FOUND",
    "message": "No station with ID AMD999 exists in the inventory.",
    "fields": null
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | SCREAMING_SNAKE_CASE machine-readable code |
| `message` | string | Human-readable explanation |
| `fields` | object or null | Per-field validation errors (422 only) |

### Standard error codes

| HTTP | code | When used |
|------|------|-----------|
| 400 | `INVALID_REQUEST` | Missing/malformed request body |
| 404 | `STATION_NOT_FOUND` | station_id does not exist |
| 422 | `VALIDATION_ERROR` | Input out of allowed range |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

---

## 3. Endpoint Definitions

### GET `/api/v1/health`

Service liveness check.

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-30T12:45:00Z",
  "data_loaded": {
    "stations": 12,
    "eligible_stations": 11,
    "daily_sales_rows": 8041,
    "supply_rows": 8041,
    "hourly_rows": 2160
  }
}
```

---

### GET `/api/v1/overview`

Computed dashboard summary (Feature A).

**Query parameters:** none.

**Response 200:**
```json
{
  "station_counts": {
    "total_in_inventory": 12,
    "eligible_for_simulation": 11,
    "eligible_for_map_display": 0,
    "note": "No verified coordinates exist; all map-eligible counts are zero."
  },
  "network_summary": {
    "data_origin": "synthetic_demo",
    "date_range_start": "2024-01-01",
    "date_range_end": "2025-12-31",
    "total_stations_in_series": 11,
    "mean_daily_network_demand_kg": 14081.2,
    "note": "Synthetic demonstration data only. Not actual recorded sales."
  },
  "forecast_summary": {
    "data_origin": "synthetic_demo",
    "horizon_days": 7,
    "stations_forecasted": 11,
    "note": "Forecast generated from synthetic historical data."
  },
  "shortfall_alerts": {
    "data_origin": "synthetic_demo",
    "total_station_days_with_shortfall": 1628,
    "stations_with_current_alert": [],
    "note": "Based on synthetic supply and synthetic historical sales. Not actual stockout data."
  },
  "hourly_summary": {
    "data_origin": "synthetic_demo",
    "stations_with_hourly_data": ["AMD001", "AMD004", "AMD008"],
    "hourly_period_start": "2025-12-02",
    "hourly_period_end": "2025-12-31"
  },
  "data_quality_flags": {
    "verified_coordinates": false,
    "real_sales_data": false,
    "real_supply_data": false,
    "holiday_data": false
  },
  "generated_at": "2026-10-30T12:45:00Z"
}
```

---

### GET `/api/v1/stations`

Station inventory with verification status (Feature D, station-selector UI).

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `in_study_area` | string | No | `yes`, `no`, `uncertain`, or omit for all |
| `eligible_for_simulation` | boolean | No | `true` returns only `in_study_area=yes` stations |

**Response 200:**
```json
{
  "stations": [
    {
      "station_id": "AMD001",
      "station_name": "Visat Automobile",
      "locality": "Chandkheda / Visat Cross Roads",
      "address": "Near Visat Cross Roads, Chandkheda, Ahmedabad - 380005",
      "pincode": "380005",
      "operator": "Gujarat Energy Limited (formerly Gujarat Gas Limited)",
      "brand": "Gujarat Gas",
      "cng_status": "listed_online_in_official_operator_directory",
      "in_study_area": "yes",
      "coordinates_verified": false,
      "latitude": null,
      "longitude": null,
      "verification_status": "partially_verified",
      "data_origin": "real_public",
      "simulation_profile": "commuter_corridor",
      "eligible_for_simulation": true,
      "eligible_for_map_pin": false
    }
  ],
  "total": 12,
  "eligible_for_simulation": 11,
  "eligible_for_map_pin": 0,
  "map_availability": {
    "available": false,
    "reason": "No stations have independently verified coordinates. All 8 coordinate candidates are unapproved (approved_for_map_pin=no)."
  }
}
```

---

### GET `/api/v1/stations/{station_id}/history`

Historical synthetic daily sales (Feature B).

**Path parameters:** `station_id` (string, required).

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | string | `2024-01-01` | ISO date |
| `end_date` | string | `2025-12-31` | ISO date |
| `aggregation` | string | `daily` | `daily` or `weekly` |

**Response 200:**
```json
{
  "station_id": "AMD001",
  "station_name": "Visat Automobile",
  "data_origin": "synthetic_demo",
  "aggregation": "daily",
  "date_range_start": "2024-01-01",
  "date_range_end": "2025-12-31",
  "total_records": 731,
  "missing_records": 0,
  "missing_holiday_data": true,
  "series": [
    {
      "date": "2024-01-01",
      "demand_kg": 1493.55,
      "day_of_week": "Monday",
      "is_weekend": false,
      "simulation_profile": "commuter_corridor"
    }
  ],
  "note": "Synthetic demonstration data only. Not actual station sales records."
}
```

**Errors:** 404 `STATION_NOT_FOUND`.

---

### POST `/api/v1/forecast`

Generate a station-level demand forecast (Feature B).

**Request body:**
```json
{
  "station_id": "AMD001",
  "horizon_days": 7,
  "model": "holt_winters",
  "include_baseline": true
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `station_id` | string | Yes | Must be eligible (`in_study_area=yes`) |
| `horizon_days` | integer | No | 1–30; default 7 |
| `model` | string | No | `holt_winters` (default) or `rolling_mean_baseline` |
| `include_baseline` | boolean | No | default `true` |

**Response 200:**
```json
{
  "station_id": "AMD001",
  "station_name": "Visat Automobile",
  "model_used": "holt_winters",
  "data_origin": "synthetic_demo",
  "horizon_days": 7,
  "train_period": {
    "start": "2024-01-01",
    "end": "2025-10-02",
    "n_records": 641
  },
  "test_period": {
    "start": "2025-10-03",
    "end": "2025-12-31",
    "n_records": 90
  },
  "evaluation": {
    "baseline_model": "rolling_mean_28d",
    "baseline_mae_kg": 150.55,
    "baseline_rmse_kg": 189.69,
    "baseline_smape_pct": 11.41,
    "model_mae_kg": null,
    "model_rmse_kg": null,
    "model_smape_pct": null,
    "note": "Metrics computed from synthetic data only. Do not claim real-world accuracy."
  },
  "forecast": [
    {
      "date": "2026-01-01",
      "forecast_demand_kg": 1420.5,
      "lower_bound_kg": 1210.3,
      "upper_bound_kg": 1630.7,
      "model": "holt_winters"
    }
  ],
  "baseline_forecast": [
    {
      "date": "2026-01-01",
      "forecast_demand_kg": 1398.2,
      "lower_bound_kg": null,
      "upper_bound_kg": null,
      "model": "rolling_mean_28d"
    }
  ],
  "reliability": {
    "data_source": "synthetic_demo",
    "history_days": 731,
    "missing_values": 0,
    "missing_holiday_data": true,
    "confidence_interval_available": true,
    "evaluation_note": "Synthetic-only evaluation. Cannot claim real-world accuracy."
  },
  "limitations": [
    "All training data is synthetic (Python-generated simulation).",
    "Holiday and event effects are not encoded.",
    "No real station sales used to train or validate this model."
  ]
}
```

**Errors:** 404 `STATION_NOT_FOUND`; 422 `VALIDATION_ERROR` (horizon out of range, unknown model).

---

### POST `/api/v1/supply-check`

Compare forecast demand against planned supply (Feature C).

**Request body:**
```json
{
  "station_id": "AMD001",
  "horizon_days": 7,
  "supply_source": "synthetic",
  "user_supply_overrides": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `station_id` | string | Yes | Eligible station |
| `horizon_days` | integer | No | 1–30; default 7 |
| `supply_source` | string | No | `synthetic` (default) or `user_entered` |
| `user_supply_overrides` | array or null | No | Per-date user values: `[{"date":"YYYY-MM-DD","supply_kg":1500.0}]` |

**Response 200:**
```json
{
  "station_id": "AMD001",
  "station_name": "Visat Automobile",
  "data_origin": "synthetic_demo",
  "supply_source": "synthetic",
  "comparison": [
    {
      "date": "2026-01-01",
      "forecast_demand_kg": 1420.5,
      "planned_supply_kg": 1350.0,
      "supply_data_origin": "synthetic_demo",
      "potential_shortfall_kg": 70.5,
      "has_shortfall": true
    }
  ],
  "summary": {
    "days_with_shortfall": 3,
    "max_shortfall_kg": 210.4,
    "total_shortfall_kg": 450.2
  },
  "warnings": [
    "Synthetic supply covers only 2024-01-01 to 2025-12-31. Forecast dates beyond this require user-entered supply values.",
    "These are potential planning shortfalls, not confirmed stockouts."
  ]
}
```

**Errors:** 404 `STATION_NOT_FOUND`; 422 `VALIDATION_ERROR`.

---

### GET `/api/v1/hourly-demand`

Hourly synthetic demand records (Features A and F).

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | string | No | Filter to one station; omit for all 3 |
| `date` | string | No | Single date in 2025-12-02 to 2025-12-31 |

**Response 200:**
```json
{
  "data_origin": "synthetic_demo",
  "available_stations": ["AMD001", "AMD004", "AMD008"],
  "period_start": "2025-12-02",
  "period_end": "2025-12-31",
  "records": [
    {
      "station_id": "AMD001",
      "datetime": "2025-12-02 00:00:00",
      "date": "2025-12-02",
      "hour": 0,
      "hourly_demand_kg": 18.38,
      "day_of_week": "Tuesday",
      "is_weekend": false,
      "simulation_profile": "commuter_corridor"
    }
  ],
  "total_records": 2160,
  "note": "Synthetic hourly profiles for 3 stations. Values reconcile to daily totals within 0.011 kg."
}
```

---

### POST `/api/v1/impact-simulator`

Illustrative new-station impact simulation (Feature E — Signature Feature).

**Request body:**
```json
{
  "proposed_latitude": 23.05,
  "proposed_longitude": 72.60,
  "catchment_radius_km": 3.0,
  "catchment_demand_kg_per_day": 5000.0,
  "capture_proportion": 0.35,
  "diversion_proportion": 0.60,
  "accessibility_demand_kg_per_day": 0.0
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `proposed_latitude` | float | Yes | −90 to 90 |
| `proposed_longitude` | float | Yes | −180 to 180 |
| `catchment_radius_km` | float | Yes | 0.1 to 50.0 |
| `catchment_demand_kg_per_day` | float | Yes | > 0 |
| `capture_proportion` | float | Yes | 0.0 to 1.0 |
| `diversion_proportion` | float | Yes | 0.0 to 1.0 |
| `accessibility_demand_kg_per_day` | float | No | ≥ 0; default 0.0 |

**Response 200:**
```json
{
  "data_origin": "illustrative_scenario",
  "assumptions": {
    "proposed_latitude": 23.05,
    "proposed_longitude": 72.60,
    "catchment_radius_km": 3.0,
    "catchment_demand_kg_per_day": 5000.0,
    "capture_proportion": 0.35,
    "diversion_proportion": 0.60,
    "accessibility_demand_kg_per_day": 0.0
  },
  "results": {
    "proposed_station_demand_kg_per_day": 1750.0,
    "estimated_diverted_demand_kg_per_day": 1050.0,
    "net_additional_network_demand_kg_per_day": 700.0
  },
  "formulas_applied": {
    "proposed_station_demand": "(catchment_demand_kg_per_day * capture_proportion) + accessibility_demand_kg_per_day",
    "estimated_diverted_demand": "proposed_station_demand_kg_per_day * diversion_proportion",
    "net_additional_network_demand": "proposed_station_demand_kg_per_day - estimated_diverted_demand_kg_per_day"
  },
  "geographic_analysis": {
    "available": false,
    "reason": "No stations have independently verified coordinates. Nearby-station analysis cannot be performed.",
    "nearby_stations": null
  },
  "warnings": [
    "Illustrative scenario calculation only. All inputs are user-supplied assumptions.",
    "Results are not evidence-backed predictions.",
    "Nearby-station effects cannot be calculated without verified station coordinates."
  ]
}
```

**Errors:** 422 `VALIDATION_ERROR` for out-of-range inputs.

---

### GET `/api/v1/data-quality`

Provenance, coverage, and data-gap summary (Feature F).

**Response 200:**
```json
{
  "generated_at": "2026-10-30T12:45:00Z",
  "station_inventory": {
    "total_stations": 12,
    "eligible_for_simulation": 11,
    "eligible_for_map_pin": 0,
    "data_origin": "real_public",
    "sources": ["Gujarat Energy Limited directory", "HPCL CNG outlet directory"],
    "access_date": "2026-10-29",
    "coordinate_status": "No verified coordinates; 8 secondary-source candidates remain unapproved"
  },
  "synthetic_data": {
    "daily_sales": {
      "rows": 8041, "columns": 12, "stations": 11,
      "date_range_start": "2024-01-01", "date_range_end": "2025-12-31",
      "missing_holiday_rows": 8041, "data_origin": "synthetic_demo"
    },
    "supply": { "rows": 8041, "columns": 5, "data_origin": "synthetic_demo" },
    "hourly_demand": {
      "rows": 2160, "columns": 10, "stations": 3,
      "period_start": "2025-12-02", "period_end": "2025-12-31",
      "data_origin": "synthetic_demo"
    }
  },
  "baseline_evaluation": {
    "model": "28-day rolling mean",
    "evaluation_type": "chronological",
    "train_end": "2025-10-02",
    "test_start": "2025-10-03",
    "test_end": "2025-12-31",
    "test_station_days": 990,
    "mae_kg": 150.55,
    "rmse_kg": 189.69,
    "smape_pct": 11.41,
    "data_origin": "synthetic_demo",
    "note": "Synthetic simulation metrics only. Not real-world forecast accuracy."
  },
  "data_gaps": [
    { "gap": "Verified station coordinates", "impact": "No map pins; no distance-based analysis" },
    { "gap": "Actual station-level daily/hourly sales", "impact": "All forecasting uses synthetic data" },
    { "gap": "Actual planned supply and delivery records", "impact": "Supply alerts are synthetic-demo only" },
    { "gap": "Ahmedabad-specific vehicle registrations", "impact": "No real demand covariate" },
    { "gap": "Official holiday calendar 2024-2025", "impact": "is_public_holiday blank in all 8041 rows" },
    { "gap": "Complete cross-operator station inventory", "impact": "12-station master is partial subset" },
    { "gap": "Verified Ahmedabad municipal boundary", "impact": "Study-area inclusion is locality-screened only" },
    { "gap": "Road/traffic/land-use indicators", "impact": "Impact simulator is assumption-based only" }
  ]
}
```

---

## 4. CORS Configuration

**Backend `server/main.py`:**
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
```

**Frontend `client/vite.config.ts`:**
```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true }
  }
}
```

---

## 5. Endpoint Ownership Summary

| Endpoint | Owner | Feature |
|----------|-------|---------|
| `GET /api/v1/health` | Member 2 | Health check |
| `GET /api/v1/overview` | Member 2 | A |
| `GET /api/v1/stations` | Member 2 | D |
| `GET /api/v1/stations/{id}/history` | Member 2 | B |
| `POST /api/v1/forecast` | Member 2 | B |
| `POST /api/v1/supply-check` | Member 2 | C |
| `GET /api/v1/hourly-demand` | Member 2 | A, F |
| `POST /api/v1/impact-simulator` | Member 2 | E |
| `GET /api/v1/data-quality` | Member 2 | F |

Member 1 (Frontend) consumes all endpoints via typed API clients defined in `client/src/api/`.  
Member 1 does not define endpoint schemas independently.

---

## 6. Contract Change Process

1. Identify need for schema change.
2. Propose change via PR on `docs/API_CONTRACT.md` targeting `main`.
3. Both developers must explicitly acknowledge before either implements.
4. Update this file first; implementation follows.
5. No field, endpoint, or response shape may be implemented before appearing here.
