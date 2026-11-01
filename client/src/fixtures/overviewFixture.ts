import { OverviewResponse } from '../types/api';

/**
 * Contract-compliant development fixture for GET /api/v1/overview
 * Strictly adheres to docs/API_CONTRACT.md and docs/DATA_PROVENANCE.md.
 * Only used when DEV FIXTURES MODE is explicitly toggled by developer.
 */
export const OVERVIEW_FIXTURE: OverviewResponse = {
  station_counts: {
    total_in_inventory: 12,
    eligible_for_simulation: 11,
    eligible_for_map_display: 0,
    note: 'No verified coordinates exist; all map-eligible counts are zero.',
  },
  network_summary: {
    data_origin: 'synthetic_demo',
    date_range_start: '2024-01-01',
    date_range_end: '2025-12-31',
    total_stations_in_series: 11,
    mean_daily_network_demand_kg: 14081.2,
    note: 'Synthetic demonstration data only. Not actual recorded sales.',
  },
  forecast_summary: {
    data_origin: 'synthetic_demo',
    horizon_days: 7,
    stations_forecasted: 11,
    note: 'Forecast generated from synthetic historical data.',
  },
  shortfall_alerts: {
    data_origin: 'synthetic_demo',
    total_station_days_with_shortfall: 1628,
    stations_with_current_alert: [],
    note: 'Based on synthetic supply and synthetic historical sales. Not actual stockout data.',
  },
  hourly_summary: {
    data_origin: 'synthetic_demo',
    stations_with_hourly_data: ['AMD001', 'AMD004', 'AMD008'],
    hourly_period_start: '2025-12-02',
    hourly_period_end: '2025-12-31',
  },
  data_quality_flags: {
    verified_coordinates: false,
    real_sales_data: false,
    real_supply_data: false,
    holiday_data: false,
  },
  generated_at: '2026-10-30T12:45:00Z',
};
