import { ForecastResponse } from '../types/api';

/**
 * Creates contract-compliant forecast fixture matching POST /api/v1/forecast.
 * Dates are strictly ascending, units are in kg/day.
 * Confidence intervals provided when model is holt_winters.
 */
export function createForecastFixture(
  stationId: string = 'AMD001',
  stationName: string = 'Visat Automobile',
  horizonDays: number = 7,
  model: 'holt_winters' | 'rolling_mean_baseline' = 'holt_winters'
): ForecastResponse {
  const forecast = [];
  const baselineForecast = [];

  // Anchor to 2026-01-01 as per contract example
  const startDate = new Date(2026, 0, 1);

  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    // Day of week pattern: weekdays higher, weekend lower
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseDemand = isWeekend ? 1180 : 1490;
    const noise = Math.sin(i * 0.8) * 45;
    const forecastVal = Math.round((baseDemand + noise) * 10) / 10;

    forecast.push({
      date: dateStr,
      forecast_demand_kg: forecastVal,
      lower_bound_kg: model === 'holt_winters' ? Math.round((forecastVal * 0.86) * 10) / 10 : null,
      upper_bound_kg: model === 'holt_winters' ? Math.round((forecastVal * 1.14) * 10) / 10 : null,
      model,
    });

    baselineForecast.push({
      date: dateStr,
      forecast_demand_kg: Math.round((baseDemand + 15) * 10) / 10,
      lower_bound_kg: null,
      upper_bound_kg: null,
      model: 'rolling_mean_28d',
    });
  }

  return {
    station_id: stationId,
    station_name: stationName,
    model_used: model,
    data_origin: 'synthetic_demo',
    horizon_days: horizonDays,
    train_period: {
      start: '2024-01-01',
      end: '2025-10-02',
      n_records: 641,
    },
    test_period: {
      start: '2025-10-03',
      end: '2025-12-31',
      n_records: 90,
    },
    evaluation: {
      baseline_model: 'rolling_mean_28d',
      baseline_mae_kg: 150.55,
      baseline_rmse_kg: 189.69,
      baseline_smape_pct: 11.41,
      model_mae_kg: model === 'holt_winters' ? 138.42 : null,
      model_rmse_kg: model === 'holt_winters' ? 172.10 : null,
      model_smape_pct: model === 'holt_winters' ? 10.25 : null,
      note: 'Metrics computed from synthetic data only. Do not claim real-world accuracy.',
    },
    forecast,
    baseline_forecast: baselineForecast,
    reliability: {
      data_source: 'synthetic_demo',
      history_days: 731,
      missing_values: 0,
      missing_holiday_data: true,
      confidence_interval_available: model === 'holt_winters',
      evaluation_note: 'Synthetic-only evaluation. Cannot claim real-world accuracy.',
    },
    limitations: [
      'All training data is synthetic (Python-generated simulation).',
      'Holiday and event effects are not encoded (is_public_holiday is blank).',
      'No real station sales used to train or validate this model.',
    ],
  };
}

export const FORECAST_FIXTURE_AMD001_7D = createForecastFixture('AMD001', 'Visat Automobile', 7, 'holt_winters');
