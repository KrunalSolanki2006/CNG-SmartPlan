import { OverviewResponse } from '../types/api';

/**
 * Contract-compliant development fixture for GET /api/v1/overview
 * Strictly adheres to docs/API_CONTRACT.md and docs/DATA_PROVENANCE.md.
 * Only used when DEV FIXTURES MODE is explicitly toggled by developer.
 */
export const OVERVIEW_FIXTURE: OverviewResponse = {
  station_counts: {
    total_in_inventory: 151,
    eligible_for_simulation: 151,
    eligible_for_map_display: 151,
    note: '151 verified Gujarat CNG stations have coordinates approved for map display.',
  },
  network_summary: {
    data_origin: 'synthetic_demo',
    date_range_start: '2024-01-01',
    date_range_end: '2026-11-24',
    total_stations_in_series: 151,
    mean_daily_network_demand_kg: 198450.0,
    note: 'Synthetic demonstration data across 151 verified Gujarat stations. Not actual recorded sales.',
  },
  forecast_summary: {
    data_origin: 'synthetic_demo',
    horizon_days: 7,
    stations_forecasted: 151,
    note: 'Historical synthetic demo ending 2026-11-24; forecasts start 2026-11-25.',
  },
  shortfall_alerts: {
    data_origin: 'synthetic_demo',
    total_station_days_with_shortfall: 18244,
    stations_with_current_alert: [],
    note: 'Based on synthetic supply/outages and synthetic historical demand. Not actual stockout data.',
  },
  hourly_summary: {
    data_origin: 'synthetic_demo',
    stations_with_hourly_data: ['AMD001', 'AMD004', 'AMD008'],
    hourly_period_start: '2026-10-26',
    hourly_period_end: '2026-11-24',
  },
  data_quality_flags: {
    verified_coordinates: true,
    real_sales_data: false,
    real_supply_data: false,
    holiday_data: true,
  },
  generated_at: '2026-11-25T12:45:00Z',
};
