# CNG SmartPlan — Frontend Implementation Plan

**Version:** 1.0  
**Date:** 2026-10-30  
**Owner:** Member 1 — Frontend  
**References:** `docs/API_CONTRACT.md` (authoritative schemas), `docs/DATA_PROVENANCE.md` (data labels)

> Member 1 owns everything in `client/`. Do not define endpoint schemas or field names here.
> All API field names and response shapes are defined in `API_CONTRACT.md` and must be followed exactly.

---

## 1. Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite 5 | Build tool and dev server |
| Tailwind CSS 3 | Utility-first styling |
| Motion (Framer Motion) | Restrained professional animations |
| Recharts 2 | All charts and forecasting visualisations |
| React Leaflet 4 | Interactive station map |
| React Router v6 | Client-side routing |

---

## 2. Project Structure

```
client/
├── src/
│   ├── api/
│   │   ├── client.ts          # Base fetch wrapper with error handling
│   │   ├── health.ts
│   │   ├── overview.ts
│   │   ├── stations.ts
│   │   ├── forecast.ts
│   │   ├── supply.ts
│   │   ├── hourly.ts
│   │   ├── impact.ts
│   │   └── quality.ts
│   ├── types/
│   │   └── api.ts             # All TypeScript interfaces from API_CONTRACT.md
│   ├── hooks/
│   │   ├── useOverview.ts
│   │   ├── useStations.ts
│   │   ├── useHistory.ts
│   │   ├── useForecast.ts
│   │   ├── useSupplyCheck.ts
│   │   ├── useHourly.ts
│   │   ├── useImpact.ts
│   │   └── useDataQuality.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx   # Top nav + sidebar + main content area
│   │   │   ├── NavBar.tsx
│   │   │   └── SideBar.tsx
│   │   ├── ui/
│   │   │   ├── DataOriginBadge.tsx   # CRITICAL: synthetic_demo / real_public etc.
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── AlertBanner.tsx
│   │   │   └── Tooltip.tsx
│   │   ├── charts/
│   │   │   ├── DemandHistoryChart.tsx
│   │   │   ├── ForecastChart.tsx
│   │   │   ├── BaselineComparisonChart.tsx
│   │   │   ├── SupplyAlertChart.tsx
│   │   │   └── HourlyProfileChart.tsx
│   │   ├── map/
│   │   │   ├── StationMap.tsx
│   │   │   ├── MapUnavailableOverlay.tsx
│   │   │   └── ProposedLocationMarker.tsx
│   │   ├── forecast/
│   │   │   ├── StationSelector.tsx
│   │   │   ├── ReliabilityPanel.tsx
│   │   │   └── ForecastLimitationsNotice.tsx
│   │   ├── simulator/
│   │   │   ├── SimulatorForm.tsx
│   │   │   ├── SimulatorResults.tsx
│   │   │   ├── FormulasPanel.tsx
│   │   │   └── AssumptionsPanel.tsx
│   │   └── quality/
│   │       ├── DataGapsTable.tsx
│   │       └── BaselineMetricsCard.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx       # Feature A
│   │   ├── ForecastPage.tsx        # Feature B
│   │   ├── AlertsPage.tsx          # Feature C
│   │   ├── MapPage.tsx             # Feature D
│   │   ├── SimulatorPage.tsx       # Feature E
│   │   ├── DataQualityPage.tsx     # Feature F
│   │   └── NotFoundPage.tsx
│   ├── utils/
│   │   ├── formatters.ts   # Date, kg, % formatters
│   │   └── dataOrigin.ts   # label/colour lookup for data_origin values
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. TypeScript Types (`client/src/types/api.ts`)

All interfaces must match `API_CONTRACT.md` exactly. Examples:

```typescript
export type DataOrigin =
  | 'synthetic_demo'
  | 'real_public'
  | 'user_entered_scenario'
  | 'illustrative_scenario';

export interface Station {
  station_id: string;
  station_name: string;
  locality: string;
  address: string;
  pincode: string;
  operator: string;
  brand: string;
  in_study_area: 'yes' | 'no' | 'uncertain';
  coordinates_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  data_origin: DataOrigin;
  simulation_profile: 'central_urban' | 'commuter_corridor' | 'mixed_urban';
  eligible_for_simulation: boolean;
  eligible_for_map_pin: boolean;
}

export interface ForecastPoint {
  date: string;           // YYYY-MM-DD
  forecast_demand_kg: number;
  lower_bound_kg: number | null;
  upper_bound_kg: number | null;
  model: string;
}

export interface ImpactSimulatorRequest {
  proposed_latitude: number;
  proposed_longitude: number;
  catchment_radius_km: number;
  catchment_demand_kg_per_day: number;
  capture_proportion: number;
  diversion_proportion: number;
  accessibility_demand_kg_per_day?: number;
}

// Continue for all endpoints in API_CONTRACT.md...
```

> **Rule:** If a field exists in API_CONTRACT.md, it must exist in this file. If a field is not in API_CONTRACT.md, it must not be invented here.

---

## 4. Pages and Responsibilities

### DashboardPage.tsx (Feature A)

**Route:** `/`

**API calls:**
- `GET /api/v1/overview`
- `GET /api/v1/hourly-demand` (summary)

**Components to render:**
- `StatCard` × 4: total stations, eligible-for-simulation, map-eligible (always 0), shortfall alerts
- `AlertBanner`: `synthetic_demo` notice — prominent, cannot be missed
- `DataOriginBadge` on every metric
- `HourlyProfileChart`: simplified peak-hour display
- Navigation cards to Forecast, Alerts, Map, Simulator, Data Quality pages

**Acceptance criteria:**
- All numbers match API response (no hardcoded values)
- `synthetic_demo` badge visible at the top
- Loading skeleton shown during fetch
- Error state shown if API fails

---

### ForecastPage.tsx (Feature B)

**Route:** `/forecast`

**API calls:**
- `GET /api/v1/stations?eligible_for_simulation=true`
- `GET /api/v1/stations/{id}/history`
- `POST /api/v1/forecast`

**Components to render:**
- `StationSelector`: dropdown of 11 eligible stations
- `DemandHistoryChart`: synthetic daily history (AreaChart or LineChart)
- `ForecastChart`: forecast + confidence bands + baseline comparison
- `BaselineComparisonChart`: model vs. 28-day rolling mean
- Weekly/daily aggregation toggle
- 7/14/30-day horizon selector
- `ReliabilityPanel`: data origin, MAE, RMSE, sMAPE, missing holiday data note
- `ForecastLimitationsNotice`: mandatory synthetic-data disclaimer

**Acceptance criteria:**
- Chronological train/test split dates displayed
- MAE, RMSE, sMAPE shown with "synthetic-demo only" qualifier
- Confidence bands shown when `lower_bound_kg != null`
- All chart data sourced from API responses

---

### AlertsPage.tsx (Feature C)

**Route:** `/alerts`

**API calls:**
- `GET /api/v1/stations?eligible_for_simulation=true`
- `POST /api/v1/supply-check`

**Components to render:**
- `StationSelector`
- Horizon selector (1–30 days)
- `SupplyAlertChart`: 3-line chart (forecast demand, planned supply, shortfall)
- User-entered supply override form (date + kg input)
- Summary table: days with shortfall, max shortfall, total shortfall
- Warning banner: "These are potential planning shortfalls — not confirmed stockouts"
- Supply value labels: `synthetic_demo` or `user_entered_scenario`

**Acceptance criteria:**
- Shortfall formula displayed: `max(0, forecast_demand_kg - planned_supply_kg)`
- Dates beyond 2025-12-31 warn user to enter supply manually
- Supply data origin label visible per data point

---

### MapPage.tsx (Feature D)

**Route:** `/map`

**API calls:**
- `GET /api/v1/stations`

**Components to render:**
- `StationMap`: React Leaflet, centred on Ahmedabad
- `MapUnavailableOverlay`: because `map_availability.available=false` from API
- `ProposedLocationMarker`: when user clicks/types coordinates
- Attribution footer: "© OpenStreetMap contributors"
- Explanation panel: why no station pins can be displayed

**State management:**
- `proposedLocation: {lat: number, lng: number} | null`
- Click handler on map sets proposedLocation

**Acceptance criteria:**
- No station pins displayed (API confirms 0 eligible for map pin)
- Unavailable overlay displayed by default
- User can click map to set proposed location (feeds into SimulatorPage via router state or URL params)
- OSM attribution always visible

---

### SimulatorPage.tsx (Feature E)

**Route:** `/simulator`

**API calls:**
- `POST /api/v1/impact-simulator`

**Components to render:**
- `SimulatorForm`: 6 adjustable inputs with validation
- `SimulatorResults`: proposed demand, diverted demand, net additional demand
- `FormulasPanel`: shows all three formulas in plain English
- `AssumptionsPanel`: lists all input values used
- `DataOriginBadge`: `illustrative_scenario`
- Geographic analysis unavailable notice

**Form validation (client-side before API call):**
- `catchment_demand_kg_per_day > 0`
- `capture_proportion ∈ [0, 1]`
- `diversion_proportion ∈ [0, 1]`
- `catchment_radius_km ∈ [0.1, 50.0]`
- `accessibility_demand_kg_per_day ≥ 0`

**Acceptance criteria:**
- All three result values displayed
- All formulas shown alongside results
- All input assumptions listed in AssumptionsPanel
- Invalid inputs blocked before API call with user-friendly message
- `illustrative_scenario` badge prominent

---

### DataQualityPage.tsx (Feature F)

**Route:** `/data-quality`

**API calls:**
- `GET /api/v1/data-quality`

**Components to render:**
- `BaselineMetricsCard`: MAE 150.55, RMSE 189.69, sMAPE 11.41% with synthetic qualifier
- `DataGapsTable`: all 8 documented gaps from data_gaps.csv
- Station inventory summary card
- Contextual indicators table (PPAC 2021 counts with date and scope labels)
- Sources reviewed section

**Acceptance criteria:**
- Baseline metrics shown with "Synthetic-demo metrics only" label
- All 8 data gaps displayed with impact and next-step
- Historical PPAC counts labelled with their 2021 date and geographic scope

---

## 5. DataOriginBadge Component

This is the most critical UI primitive for data integrity.

```typescript
// client/src/components/ui/DataOriginBadge.tsx
const BADGE_CONFIG = {
  synthetic_demo: { label: '⚠ Synthetic Demo', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  real_public:    { label: '✓ Real Public Data', className: 'bg-green-100 text-green-800 border-green-300' },
  illustrative_scenario: { label: '~ Illustrative Scenario', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  user_entered_scenario: { label: '✎ User Entry', className: 'bg-purple-100 text-purple-800 border-purple-300' },
};
```

Rules:
- Every chart, stat card, and result that contains modelled data must include this badge.
- The badge must be visible without scrolling on each section.
- Never omit the badge to "clean up" the UI.

---

## 6. Chart Responsibilities

| Chart component | Library | Data source | Recharts type |
|----------------|---------|-------------|--------------|
| `DemandHistoryChart` | Recharts | `/stations/{id}/history` | AreaChart or LineChart |
| `ForecastChart` | Recharts | `/forecast` | ComposedChart with Area (confidence) + Line (forecast) |
| `BaselineComparisonChart` | Recharts | `/forecast` | LineChart (baseline vs. model) |
| `SupplyAlertChart` | Recharts | `/supply-check` | ComposedChart (demand line, supply line, shortfall bar) |
| `HourlyProfileChart` | Recharts | `/hourly-demand` | BarChart or AreaChart by hour |

All charts must:
- Use consistent colour tokens (defined in `tailwind.config.ts`).
- Show a tooltip with exact kg values on hover.
- Show axis labels with units (kg/day or kg/hour).
- Gracefully handle empty data arrays with an `EmptyState` component.

---

## 7. Animation Rules (Motion / Framer Motion)

- Use `layout` animations for list reordering only.
- Use `AnimatePresence` for page transitions (fade + slight upward slide, duration ≤ 300ms).
- Use `whileHover` for interactive cards (scale 1.01, shadow).
- Respect `prefers-reduced-motion` media query — wrap all animations in a `useReducedMotion()` check.
- No bounce or spring animations — professional enterprise aesthetic only.

---

## 8. Responsive Design Rules

| Breakpoint | Layout | Chart height |
|-----------|--------|-------------|
| Mobile ≤767px | Single column; stacked cards | 250px |
| Tablet 768–1279px | 2-column grid; side nav collapses to hamburger | 300px |
| Desktop ≥1280px | 3–4 column grid; persistent side nav | 400px |

Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) exclusively. No custom CSS breakpoints.

---

## 9. Loading, Error, and Empty States

Every async data section must implement all three states:

| State | Component | Behaviour |
|-------|-----------|-----------|
| Loading | `LoadingSkeleton` | Animated shimmer placeholder matching layout |
| Error | `ErrorState` | Shows API error code + message; retry button |
| Empty | `EmptyState` | Explains why data is unavailable; no generic "No data" |

Example `EmptyState` messages:
- Map page: "No verified station coordinates available. Map pins cannot be displayed."
- Hourly demand (non-qualifying station): "Hourly data is available only for AMD001, AMD004, and AMD008."

---

## 10. Accessibility Requirements

- All interactive elements must have `id` attributes (unique per page).
- All form inputs must have `<label>` elements with `htmlFor`.
- All chart containers must have `role="img"` and `aria-label` describing the chart.
- Keyboard navigation: Tab order must be logical; all interactive elements reachable by keyboard.
- DataOriginBadge must have `role="status"` for screen reader announcements.
- Colour is never the only indicator of information (badges must also have text).

---

## 11. File Ownership Rules

Member 1 owns **all files** under `client/`.  
Member 1 must **not** modify:
- Any file under `server/`
- Any file under `CNG_SmartPlan_Data/`
- Any file under `docs/` (except minor formatting; schema changes require both members)

Member 1 may **read** `docs/API_CONTRACT.md` and `docs/DATA_PROVENANCE.md` as reference.

---

## 12. Frontend Acceptance Criteria Checklist

- [ ] All 9 API endpoints consumed; responses displayed correctly.
- [ ] Zero hardcoded numerical values presented as actual data.
- [ ] `DataOriginBadge` visible on every section showing modelled data.
- [ ] Loading skeleton displayed for every async call.
- [ ] Error state displayed when API returns an error.
- [ ] Empty state displayed when API returns empty data.
- [ ] Map shows unavailable overlay (no station pins).
- [ ] Simulator form blocks invalid inputs client-side.
- [ ] All three simulator formulas displayed in results.
- [ ] Shortfall formula displayed on Alerts page.
- [ ] Evaluation metrics labelled as "synthetic-demo only."
- [ ] OpenStreetMap attribution on map page.
- [ ] Responsive at 375px, 768px, 1280px (verified in browser DevTools).
- [ ] No WCAG 2.1 AA violations (tested with axe or equivalent).
- [ ] `prefers-reduced-motion` respected.
- [ ] All acceptance tests in ACCEPTANCE_TESTS.md passing for frontend items.
