import { DataQualityResponse } from '../types/api';

/**
 * Contract-compliant development fixture for GET /api/v1/data-quality
 * Mirrors docs/API_CONTRACT.md Section 3 and docs/DATA_PROVENANCE.md exactly.
 */
export const DATA_QUALITY_FIXTURE: DataQualityResponse = {
  generated_at: '2026-10-30T12:45:00Z',
  station_inventory: {
    total_stations: 12,
    eligible_for_simulation: 11,
    eligible_for_map_pin: 0,
    data_origin: 'real_public',
    sources: [
      'Gujarat Energy Limited official directory (2 Chandkheda stations)',
      'HPCL CNG retail outlet directory (10 Ahmedabad stations)',
    ],
    access_date: '2026-10-29',
    coordinate_status: 'No verified coordinates; 8 secondary-source candidates remain unapproved',
  },
  synthetic_data: {
    daily_sales: {
      rows: 8041,
      columns: 12,
      stations: 11,
      date_range_start: '2024-01-01',
      date_range_end: '2025-12-31',
      missing_holiday_rows: 8041,
      data_origin: 'synthetic_demo',
    },
    supply: {
      rows: 8041,
      columns: 5,
      data_origin: 'synthetic_demo',
    },
    hourly_demand: {
      rows: 2160,
      columns: 10,
      stations: 3,
      period_start: '2025-12-02',
      period_end: '2025-12-31',
      data_origin: 'synthetic_demo',
    },
  },
  baseline_evaluation: {
    model: '28-day rolling mean',
    evaluation_type: 'chronological',
    train_end: '2025-10-02',
    test_start: '2025-10-03',
    test_end: '2025-12-31',
    test_station_days: 990,
    mae_kg: 150.55,
    rmse_kg: 189.69,
    smape_pct: 11.41,
    data_origin: 'synthetic_demo',
    note: 'Synthetic simulation metrics only. Not real-world forecast accuracy.',
  },
  data_gaps: [
    { gap: 'Verified station coordinates', impact: 'No map pins; no distance-based analysis' },
    { gap: 'Actual station-level daily/hourly sales', impact: 'All forecasting uses synthetic data' },
    { gap: 'Actual planned supply and delivery records', impact: 'Supply alerts are synthetic-demo only' },
    { gap: 'Ahmedabad-specific vehicle registrations', impact: 'No real demand covariate' },
    { gap: 'Official holiday calendar 2024-2025', impact: 'is_public_holiday blank in all 8041 rows' },
    { gap: 'Complete cross-operator station inventory', impact: '12-station master is partial subset' },
    { gap: 'Verified Ahmedabad municipal boundary', impact: 'Study-area inclusion is locality-screened only' },
    { gap: 'Road/traffic/land-use indicators', impact: 'Impact simulator is assumption-based only' },
  ],
};
