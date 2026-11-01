import { ImpactSimulatorRequest, ImpactSimulatorResponse } from '../types/api';

/**
 * Creates contract-compliant impact simulation fixture matching POST /api/v1/impact-simulator.
 * Canonical simulation formulas:
 * 1. proposed_station_demand = (catchment_demand_kg_per_day * capture_proportion) + accessibility_demand_kg_per_day
 * 2. estimated_diverted_demand = proposed_station_demand * diversion_proportion
 * 3. net_additional_network_demand = proposed_station_demand - estimated_diverted_demand
 *
 * Validated against acceptance tests AT-I01 (1750.0), AT-I02 (1050.0), AT-I03 (700.0).
 */
export function createImpactFixture(
  request?: Partial<ImpactSimulatorRequest>
): ImpactSimulatorResponse {
  const req: ImpactSimulatorRequest = {
    proposed_latitude: request?.proposed_latitude ?? 23.05,
    proposed_longitude: request?.proposed_longitude ?? 72.60,
    catchment_radius_km: request?.catchment_radius_km ?? 3.0,
    catchment_demand_kg_per_day: request?.catchment_demand_kg_per_day ?? 5000.0,
    capture_proportion: request?.capture_proportion ?? 0.35,
    diversion_proportion: request?.diversion_proportion ?? 0.60,
    accessibility_demand_kg_per_day: request?.accessibility_demand_kg_per_day ?? 0.0,
  };

  const accessibility = req.accessibility_demand_kg_per_day ?? 0.0;
  const proposedDemand = Math.round(((req.catchment_demand_kg_per_day * req.capture_proportion) + accessibility) * 100) / 100;
  const divertedDemand = Math.round((proposedDemand * req.diversion_proportion) * 100) / 100;
  const netAdditionalDemand = Math.round((proposedDemand - divertedDemand) * 100) / 100;

  return {
    data_origin: 'illustrative_scenario',
    assumptions: {
      proposed_latitude: req.proposed_latitude,
      proposed_longitude: req.proposed_longitude,
      catchment_radius_km: req.catchment_radius_km,
      catchment_demand_kg_per_day: req.catchment_demand_kg_per_day,
      capture_proportion: req.capture_proportion,
      diversion_proportion: req.diversion_proportion,
      accessibility_demand_kg_per_day: accessibility,
    },
    results: {
      proposed_station_demand_kg_per_day: proposedDemand,
      estimated_diverted_demand_kg_per_day: divertedDemand,
      net_additional_network_demand_kg_per_day: netAdditionalDemand,
      network_baseline_daily_demand_kg: 14081.2,
      scenario_network_daily_demand_kg: Math.round((14081.2 + netAdditionalDemand) * 100) / 100,
    },
    formulas_applied: {
      proposed_station_demand: '(catchment_demand_kg_per_day * capture_proportion) + accessibility_demand_kg_per_day',
      estimated_diverted_demand: 'proposed_station_demand_kg_per_day * diversion_proportion',
      net_additional_network_demand: 'proposed_station_demand_kg_per_day - estimated_diverted_demand_kg_per_day',
    },
    geographic_analysis: {
      available: false,
      reason: 'No stations have independently verified coordinates. Nearby-station analysis cannot be performed.',
      nearby_stations: null,
    },
    warnings: [
      'Illustrative scenario calculation only. All inputs are user-supplied assumptions.',
      'Results are not evidence-backed predictions.',
      'Nearby-station effects cannot be calculated without verified station coordinates.',
    ],
  };
}

export const DEFAULT_IMPACT_FIXTURE: ImpactSimulatorResponse = createImpactFixture();
