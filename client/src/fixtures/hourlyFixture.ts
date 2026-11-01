import { HourlyResponse, HourlyRecord } from '../types/api';

/**
 * Contract-compliant development fixture for GET /api/v1/hourly-demand.
 * Profile: AMD001 commuter corridor profile with morning (08:00-11:00) and evening (17:00-20:00) peaks.
 * 24 hourly records for 2025-12-15.
 */
export function createHourlyFixture(
  stationId: string = 'AMD001',
  date: string = '2025-12-15'
): HourlyResponse {
  const profile = stationId === 'AMD004' ? 'central_urban' : stationId === 'AMD008' ? 'mixed_urban' : 'commuter_corridor';
  const records: HourlyRecord[] = [];

  // Typical diurnal distribution factors summing to ~1.0
  const factors = [
    0.012, 0.008, 0.006, 0.006, 0.010, 0.025, // 00 - 05
    0.045, 0.075, 0.095, 0.085, 0.065, 0.055, // 06 - 11 (Morning rush)
    0.050, 0.045, 0.040, 0.045, 0.055, 0.080, // 12 - 17 (Midday & early evening)
    0.095, 0.085, 0.055, 0.035, 0.020, 0.015, // 18 - 23 (Evening rush & taper)
  ];

  const targetDailyTotal = 1472.0; // matches 2025-12-15 in HISTORY_FIXTURE_AMD001

  factors.forEach((factor, hour) => {
    const hh = String(hour).padStart(2, '0');
    const demand = Math.round(targetDailyTotal * factor * 100) / 100;
    records.push({
      station_id: stationId,
      datetime: `${date} ${hh}:00:00`,
      date,
      hour,
      hourly_demand_kg: demand,
      day_of_week: 'Monday',
      is_weekend: false,
      simulation_profile: profile,
    });
  });

  return {
    data_origin: 'synthetic_demo',
    available_stations: ['AMD001', 'AMD004', 'AMD008'],
    period_start: '2025-12-02',
    period_end: '2025-12-31',
    records,
    total_records: records.length,
    note: 'Synthetic hourly profiles for 3 stations. Values reconcile to daily totals within 0.011 kg.',
  };
}

export const HOURLY_FIXTURE_AMD001 = createHourlyFixture('AMD001', '2025-12-15');
