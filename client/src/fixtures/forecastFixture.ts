import {
  ForecastResponse,
  ForecastStationsListResponse,
  HistoricalContextPoint,
  NetworkForecastSummaryResponse,
} from '../types/api';

/**
 * Contract-compliant development fixtures matching Prompt 1 & Prompt 2 backend.
 * Historical cutoff: 2026-11-24; forecast start: 2026-11-25.
 */
export function createForecastFixture(
  stationId: string = 'AMD001',
  stationName: string = 'Visat Automobile',
  horizonDays: number = 7,
  model: 'holt_winters' | 'rolling_mean_baseline' = 'holt_winters',
  includeBaseline: boolean = true
): ForecastResponse {
  const cutoffDateStr = '2026-11-24';
  const cutoffUtc = new Date(`${cutoffDateStr}T00:00:00Z`);

  // Build 30-day trailing historical context ending 2026-11-24
  const historicalContext: HistoricalContextPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(cutoffUtc);
    d.setUTCDate(cutoffUtc.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const base = isWeekend ? 1390 : 1680;
    const demand = Math.round((base + Math.sin(i * 0.6) * 45) * 10) / 10;
    historicalContext.push({
      date: dateStr,
      demand_kg: demand,
      day_of_week: d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      is_weekend: isWeekend,
      data_type: 'synthetic',
    });
  }

  const now = new Date();
  const currentDateStr = '2026-11-25';
  const dataAgeDays = 1;
  const isStale = false;

  const recentAvg =
    Math.round(
      (historicalContext.reduce((sum, p) => sum + p.demand_kg, 0) / historicalContext.length) * 10
    ) / 10;

  const forecast = [];
  const baselineForecast = [];

  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(cutoffUtc);
    d.setUTCDate(cutoffUtc.getUTCDate() + i + 1);
    const dateStr = d.toISOString().split('T')[0];

    const dayOfWeek = d.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseDemand = isWeekend ? 1410 : 1715;
    const wave = Math.sin(i * 0.7) * 35;
    const forecastVal =
      model === 'holt_winters' ? Math.round((baseDemand + wave) * 10) / 10 : recentAvg;

    const se = 128 * Math.sqrt(1 + 0.04 * i);
    forecast.push({
      date: dateStr,
      forecast_demand_kg: forecastVal,
      lower_bound_kg:
        model === 'holt_winters' ? Math.round(Math.max(0, forecastVal - 1.96 * se) * 10) / 10 : null,
      upper_bound_kg:
        model === 'holt_winters' ? Math.round((forecastVal + 1.96 * se) * 10) / 10 : null,
      model,
    });

    baselineForecast.push({
      date: dateStr,
      forecast_demand_kg: recentAvg,
      lower_bound_kg: null,
      upper_bound_kg: null,
      model: 'rolling_mean_28d',
    });
  }

  const forecastAvg =
    Math.round((forecast.reduce((s, p) => s + p.forecast_demand_kg, 0) / forecast.length) * 10) / 10;
  const pctChange = Math.round(((forecastAvg - recentAvg) / recentAvg) * 1000) / 10;
  const demandTrend =
    pctChange >= 2.0 ? 'increasing' : pctChange <= -2.0 ? 'decreasing' : 'stable';

  const targetStart = forecast[0].date;
  const targetEnd = forecast[forecast.length - 1].date;
  const signedPct = `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`;

  return {
    station_id: stationId,
    station_name: stationName,
    model_used: model,
    model_version: '2.0.0',
    data_origin: 'synthetic_demo',
    horizon_days: horizonDays,
    forecast_generated_at: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    current_date: currentDateStr,
    data_age_days: dataAgeDays,
    forecast_status: 'simulated',
    data_freshness: isStale ? 'stale' : 'current',
    forecast_origin_date: cutoffDateStr,
    data_through_date: cutoffDateStr,
    target_start_date: targetStart,
    target_end_date: targetEnd,
    is_historical_replay: false,
    historical_demo_notice: `Synthetic demonstration forecast — source data ends 24 Nov 2026; ${horizonDays}-day forecast begins 25 Nov 2026. Simulated data only.`,
    historical_avg_demand_kg: 1585.4,
    historical_recent_avg_kg: recentAvg,
    forecast_avg_demand_kg: forecastAvg,
    demand_trend: demandTrend,
    trend_change_pct: pctChange,
    key_insight: `Simulated demand is projected to ${demandTrend === 'stable' ? 'remain stable' : demandTrend} (${signedPct}) over the ${horizonDays}-day forecast period (${targetStart} to ${targetEnd}), averaging ${forecastAvg.toLocaleString()} kg/day compared to ${recentAvg.toLocaleString()} kg/day in the trailing 30 days (synthetic data through ${cutoffDateStr}).`,
    train_period: {
      start: '2024-01-01',
      end: '2025-12-31',
      n_records: 731,
    },
    validation_period: {
      start: '2026-01-01',
      end: '2026-03-31',
      n_records: 90,
    },
    test_period: {
      start: '2026-04-01',
      end: '2026-11-24',
      n_records: 238,
    },
    validation_evaluation: {
      baseline_model: 'rolling_mean_28d',
      baseline_mae_kg: 162.1,
      baseline_rmse_kg: 201.4,
      baseline_smape_pct: 10.2,
      model_mae_kg: model === 'holt_winters' ? 131.5 : 162.1,
      model_rmse_kg: model === 'holt_winters' ? 164.2 : 201.4,
      model_smape_pct: model === 'holt_winters' ? 8.3 : 10.2,
      note: 'Synthetic validation window (2026-01-01 to 2026-03-31, 90 days).',
    },
    evaluation: {
      baseline_model: 'rolling_mean_28d',
      baseline_mae_kg: 166.4,
      baseline_rmse_kg: 208.35,
      baseline_smape_pct: 9.3,
      model_mae_kg: model === 'holt_winters' ? 138.42 : 166.4,
      model_rmse_kg: model === 'holt_winters' ? 172.1 : 208.35,
      model_smape_pct: model === 'holt_winters' ? 8.15 : 9.3,
      note: 'Station-specific synthetic final evaluation (2026-04-01 to 2026-11-24, 238 days). Do not claim real-world accuracy.',
    },
    model_info: {
      model_id: model,
      model_name:
        model === 'holt_winters'
          ? 'Holt-Winters Additive Exponential Smoothing (7-Day Seasonality)'
          : '28-Day Rolling Mean Baseline',
      model_version: '2.0.0',
      seasonal_period_days: model === 'holt_winters' ? 7 : null,
      confidence_interval_method:
        model === 'holt_winters'
          ? 'Simulated 95% residual prediction interval (±1.96 * SE_h, clamped >= 0; not proof of real-world accuracy)'
          : null,
      parameters_note:
        model === 'holt_winters'
          ? 'Additive trend and 7-day weekly seasonality fitted on valid historical demand.'
          : 'Trailing 28-day arithmetic mean of valid historical daily demand.',
    },
    freshness_policy: {
      max_age_days_for_current: 14,
      data_age_days: dataAgeDays,
      is_stale: isStale,
      is_simulated: true,
      policy_note: `Historical data ends ${cutoffDateStr} (${dataAgeDays} day(s) before ${currentDateStr}; within 14-day freshness policy).`,
    },
    data_audit: {
      earliest_date: '2024-01-01',
      latest_date: cutoffDateStr,
      total_raw_records: 1059,
      valid_records: 1059,
      excluded_records: 0,
      duplicate_records: 0,
      invalid_or_negative_records: 0,
      missing_dates_in_range: 0,
      provenance_counts: { synthetic: 1059 },
      exclusion_reasons: [],
    },
    historical_context: historicalContext,
    forecast,
    baseline_forecast: includeBaseline ? baselineForecast : null,
    reliability: {
      data_source: 'synthetic_demo',
      history_days: 1059,
      missing_values: 0,
      missing_holiday_data: false,
      confidence_interval_available: model === 'holt_winters',
      evaluation_note: 'Synthetic-only validation. Cannot claim real-world accuracy.',
    },
    limitations: [
      'All historical demand/sales records are synthetic (Python-generated simulation; no real station meter data).',
      'Simulated demand incorporates Gujarat public holiday and festival calendar flags.',
      'Simulated prediction intervals reflect historical residual variance under stationarity, not real-world accuracy.',
    ],
  };
}

export const FORECAST_FIXTURE_AMD001_7D = createForecastFixture('AMD001', 'Visat Automobile', 7, 'holt_winters');

export const FORECAST_STATIONS_FIXTURE: ForecastStationsListResponse = {
  total_eligible_stations: 3,
  stations: [
    {
      station_id: 'AMD001',
      station_name: 'Visat Automobile',
      district: 'Ahmedabad',
      city: 'Ahmedabad',
      operator: 'Gujarat Gas Limited',
      simulation_profile: 'highway',
      eligible_for_simulation: true,
      history_records: 1059,
      earliest_date: '2024-01-01',
      latest_date: '2026-11-24',
      data_origin: 'synthetic_demo',
    },
    {
      station_id: 'AMD004',
      station_name: 'Mahalakshmi Motor Service',
      district: 'Ahmedabad',
      city: 'Ahmedabad',
      operator: 'HPCL-listed outlet',
      simulation_profile: 'urban',
      eligible_for_simulation: true,
      history_records: 1059,
      earliest_date: '2024-01-01',
      latest_date: '2026-11-24',
      data_origin: 'synthetic_demo',
    },
    {
      station_id: 'DISC_SUR_001',
      station_name: 'Surat Ring Road CNG Station',
      district: 'Surat',
      city: 'Surat',
      operator: 'not_established',
      simulation_profile: 'highway',
      eligible_for_simulation: true,
      history_records: 1059,
      earliest_date: '2024-01-01',
      latest_date: '2026-11-24',
      data_origin: 'synthetic_demo',
    },
  ],
  data_origin: 'synthetic_demo',
  generated_at: '2026-11-25T11:30:00Z',
};

export const NETWORK_FORECAST_SUMMARY_FIXTURE: NetworkForecastSummaryResponse = {
  horizon_days: 7,
  model_used: 'holt_winters',
  model_version: '2.0.0',
  data_origin: 'synthetic_demo',
  forecast_status: 'simulated',
  data_freshness: 'current',
  data_through_date: '2026-11-24',
  target_start_date: '2026-11-25',
  target_end_date: '2026-12-01',
  forecast_generated_at: '2026-11-25T11:30:00Z',
  eligible_stations: 151,
  successfully_forecasted_stations: 151,
  insufficient_data_stations: 0,
  failed_stations: 0,
  failed_or_insufficient_station_ids: [],
  simulated_network_demand_kg_per_day: 282927.8,
  historical_network_recent_avg_kg_per_day: 291492.6,
  network_demand_trend: 'decreasing',
  network_trend_change_pct: -2.9,
  network_evaluation: {
    stations_evaluated: 151,
    mean_hw_mae_kg: 188.48,
    mean_hw_rmse_kg: 225.85,
    mean_hw_smape_pct: 10.29,
    mean_baseline_mae_kg: 166.4,
    mean_baseline_rmse_kg: 208.35,
    mean_baseline_smape_pct: 9.3,
    holt_winters_outperforms_baseline_count: 77,
    note: 'Network-wide out-of-sample evaluation metrics computed on synthetic data only.',
  },
  station_summaries: [],
  note: 'Aggregated across all eligible verified Gujarat stations; synthetic demonstration figures only.',
};
