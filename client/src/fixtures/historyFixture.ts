import { StationHistoryResponse } from '../types/api';

/**
 * Contract-compliant development fixture for GET /api/v1/stations/{station_id}/history
 * Sample representative 30-day series for AMD001 (Visat Automobile).
 * Tagged strictly as synthetic_demo.
 */
export const HISTORY_FIXTURE_AMD001: StationHistoryResponse = {
  station_id: 'AMD001',
  station_name: 'Visat Automobile',
  data_origin: 'synthetic_demo',
  aggregation: 'daily',
  date_range_start: '2025-12-01',
  date_range_end: '2025-12-30',
  total_records: 30,
  missing_records: 0,
  missing_holiday_data: true,
  series: [
    { date: '2025-12-01', demand_kg: 1460.2, day_of_week: 'Monday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-02', demand_kg: 1478.5, day_of_week: 'Tuesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-03', demand_kg: 1492.1, day_of_week: 'Wednesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-04', demand_kg: 1455.0, day_of_week: 'Thursday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-05', demand_kg: 1530.8, day_of_week: 'Friday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-06', demand_kg: 1335.4, day_of_week: 'Saturday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-07', demand_kg: 1112.7, day_of_week: 'Sunday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-08', demand_kg: 1465.3, day_of_week: 'Monday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-09', demand_kg: 1480.9, day_of_week: 'Tuesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-10', demand_kg: 1495.2, day_of_week: 'Wednesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-11', demand_kg: 1468.1, day_of_week: 'Thursday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-12', demand_kg: 1545.6, day_of_week: 'Friday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-13', demand_kg: 1340.2, day_of_week: 'Saturday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-14', demand_kg: 1120.5, day_of_week: 'Sunday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-15', demand_kg: 1472.0, day_of_week: 'Monday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-16', demand_kg: 1485.4, day_of_week: 'Tuesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-17', demand_kg: 1502.8, day_of_week: 'Wednesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-18', demand_kg: 1474.3, day_of_week: 'Thursday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-19', demand_kg: 1558.1, day_of_week: 'Friday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-20', demand_kg: 1352.0, day_of_week: 'Saturday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-21', demand_kg: 1131.4, day_of_week: 'Sunday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-22', demand_kg: 1480.0, day_of_week: 'Monday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-23', demand_kg: 1496.2, day_of_week: 'Tuesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-24', demand_kg: 1510.5, day_of_week: 'Wednesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-25', demand_kg: 1482.0, day_of_week: 'Thursday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-26', demand_kg: 1565.3, day_of_week: 'Friday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-27', demand_kg: 1360.7, day_of_week: 'Saturday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-28', demand_kg: 1140.2, day_of_week: 'Sunday', is_weekend: true, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-29', demand_kg: 1488.9, day_of_week: 'Monday', is_weekend: false, simulation_profile: 'commuter_corridor' },
    { date: '2025-12-30', demand_kg: 1504.1, day_of_week: 'Tuesday', is_weekend: false, simulation_profile: 'commuter_corridor' },
  ],
  note: 'Synthetic demonstration data only. Not actual station sales records.',
};
