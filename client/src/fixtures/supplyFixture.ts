import { SupplyCheckResponse, UserSupplyOverride } from '../types/api';

/**
 * Creates contract-compliant supply shortfall fixture matching POST /api/v1/supply-check.
 * Canonical shortfall formula: max(0, forecast_demand_kg - planned_supply_kg)
 * Handles post-2025 supply gaps and planner manual overrides.
 */
export function createSupplyCheckFixture(
  stationId: string = 'AMD001',
  stationName: string = 'Visat Automobile',
  horizonDays: number = 7,
  userOverrides?: UserSupplyOverride[] | null
): SupplyCheckResponse {
  const comparison = [];
  let daysWithShortfall = 0;
  let maxShortfall = 0;
  let totalShortfall = 0;

  const startDate = new Date(2026, 0, 1);
  const overrideMap = new Map<string, number>();
  if (userOverrides) {
    userOverrides.forEach((o) => overrideMap.set(o.date, o.supply_kg));
  }

  const warnings = [
    'Synthetic supply covers only 2024-01-01 to 2025-12-31. Forecast dates beyond this require user-entered supply values.',
    'These are potential planning shortfalls, not confirmed stockouts.',
  ];

  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    // Day of week pattern
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseDemand = isWeekend ? 1180 : 1490;
    const noise = Math.sin(i * 0.8) * 45;
    const forecastDemand = Math.round((baseDemand + noise) * 10) / 10;

    const hasOverride = overrideMap.has(dateStr);
    let plannedSupply: number | null = null;
    let shortfall: number | null = null;
    let hasShortfall: boolean | null = null;
    let origin: 'synthetic_demo' | 'user_entered_scenario' = 'synthetic_demo';

    if (hasOverride) {
      plannedSupply = overrideMap.get(dateStr)!;
      origin = 'user_entered_scenario';
      shortfall = Math.max(0, Math.round((forecastDemand - plannedSupply) * 10) / 10);
      hasShortfall = shortfall > 0;
    } else if (i === 0) {
      // Contract example: 2026-01-01 shortfall = 70.5 kg
      shortfall = 70.5;
      plannedSupply = Math.round((forecastDemand - shortfall) * 10) / 10;
      hasShortfall = true;
    } else if (i === 1) {
      // Shortfall = 169.3 kg
      shortfall = 169.3;
      plannedSupply = Math.round((forecastDemand - shortfall) * 10) / 10;
      hasShortfall = true;
    } else if (i === 2) {
      // Shortfall = 210.4 kg (Peak Day Shortfall)
      shortfall = 210.4;
      plannedSupply = Math.round((forecastDemand - shortfall) * 10) / 10;
      hasShortfall = true;
    } else if (i === 3) {
      // Balanced day (supply meets demand)
      plannedSupply = Math.round((forecastDemand + 120.0) * 10) / 10;
      shortfall = 0.0;
      hasShortfall = false;
    } else {
      // Post-2025 date without override
      plannedSupply = null;
      shortfall = null;
      hasShortfall = null;
    }

    if (hasShortfall && shortfall !== null) {
      daysWithShortfall++;
      if (shortfall > maxShortfall) maxShortfall = shortfall;
      totalShortfall += shortfall;
    }

    comparison.push({
      date: dateStr,
      forecast_demand_kg: forecastDemand,
      planned_supply_kg: plannedSupply,
      supply_data_origin: origin,
      potential_shortfall_kg: shortfall,
      has_shortfall: hasShortfall,
    });
  }

  return {
    station_id: stationId,
    station_name: stationName,
    data_origin: 'synthetic_demo',
    supply_source: userOverrides && userOverrides.length > 0 ? 'user_entered' : 'synthetic',
    comparison,
    summary: {
      days_with_shortfall: daysWithShortfall,
      max_shortfall_kg: Math.round(maxShortfall * 10) / 10,
      total_shortfall_kg: Math.round(totalShortfall * 10) / 10,
    },
    warnings,
  };
}

export const SUPPLY_CHECK_FIXTURE_AMD001_7D = createSupplyCheckFixture(
  'AMD001',
  'Visat Automobile',
  7
);
