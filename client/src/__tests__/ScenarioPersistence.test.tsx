import { describe, it, expect, vi } from 'vitest';
import { exportSimulatorCsv } from '../utils/exportSimulator';
import { ImpactSimulatorRequest, ImpactSimulatorResponse } from '../types/api';

describe('Scenario Export and Persistence Utilities', () => {
  const mockInputs: ImpactSimulatorRequest = {
    proposed_latitude: 23.05,
    proposed_longitude: 72.60,
    catchment_radius_km: 3.0,
    catchment_demand_kg_per_day: 5000.0,
    capture_proportion: 0.35,
    diversion_proportion: 0.60,
    accessibility_demand_kg_per_day: 0.0,
  };

  const mockResponse: ImpactSimulatorResponse = {
    data_origin: 'illustrative_scenario',
    assumptions: {
      proposed_latitude: 23.05,
      proposed_longitude: 72.60,
      catchment_radius_km: 3.0,
      catchment_demand_kg_per_day: 5000.0,
      capture_proportion: 0.35,
      diversion_proportion: 0.60,
      accessibility_demand_kg_per_day: 0.0,
    },
    results: {
      proposed_station_demand_kg_per_day: 1750.0,
      estimated_diverted_demand_kg_per_day: 1050.0,
      net_additional_network_demand_kg_per_day: 700.0,
      network_baseline_daily_demand_kg: 14081.2,
      scenario_network_daily_demand_kg: 14781.2,
    },
    formulas_applied: {
      proposed_station_demand: '(catchment_demand_kg_per_day * capture_proportion) + accessibility_demand_kg_per_day',
      estimated_diverted_demand: 'proposed_station_demand * diversion_proportion',
      net_additional_network_demand: 'proposed_station_demand - estimated_diverted_demand',
    },
    geographic_analysis: {
      available: false,
      reason: 'No stations have verified coordinates.',
      nearby_stations: null,
    },
    sensitivity_analysis: [
      {
        capture_proportion: 0.20,
        diversion_proportion: 0.40,
        proposed_station_demand_kg: 1000.0,
        diverted_demand_kg: 400.0,
        net_additional_demand_kg: 600.0,
      },
      {
        capture_proportion: 0.35,
        diversion_proportion: 0.60,
        proposed_station_demand_kg: 1750.0,
        diverted_demand_kg: 1050.0,
        net_additional_demand_kg: 700.0,
      },
    ],
    warnings: ['Illustrative scenario calculation only.'],
  };

  it('exportSimulatorCsv triggers blob creation and link download without crashing', () => {
    // Mock URL and DOM methods
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-id');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    exportSimulatorCsv(mockInputs, mockResponse, 'Test Evaluation Scenario');

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });
});

