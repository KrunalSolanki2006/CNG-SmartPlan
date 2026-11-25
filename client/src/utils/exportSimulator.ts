/**
 * FUELCAST - Simulator Export Utilities
 * Provides CSV data download and executive printable report triggering.
 */

import { ImpactSimulatorRequest, ImpactSimulatorResponse } from '../types/api';

export function exportSimulatorCsv(
  inputs: ImpactSimulatorRequest,
  results: ImpactSimulatorResponse,
  scenarioName: string = 'Custom Scenario'
): void {
  const timestamp = new Date().toISOString();
  const dateFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [];

  // 1. Header & Provenance
  lines.push('================================================================================');
  lines.push('FUELCAST — NEW STATION IMPACT SIMULATOR SCENARIO REPORT');
  lines.push('Gujarat Gas Co. Ltd. • Network Planning Decision Support');
  lines.push(`Generated: ${timestamp} (${dateFormatted})`);
  lines.push(`Scenario Title: ${scenarioName}`);
  lines.push(`Data Origin: ${results.data_origin}`);
  lines.push('================================================================================');
  lines.push('');

  // 2. Scenario Inputs
  lines.push('--- SCENARIO ASSUMPTIONS & PLANNING INPUTS ---');
  lines.push('Parameter,Value,Unit,Description');
  lines.push(`Proposed Latitude,${inputs.proposed_latitude},degrees N,Proposed site latitude coordinate`);
  lines.push(`Proposed Longitude,${inputs.proposed_longitude},degrees E,Proposed site longitude coordinate`);
  lines.push(`Catchment Radius,${inputs.catchment_radius_km},km,Estimated customer trade radius`);
  lines.push(`Catchment Demand,${inputs.catchment_demand_kg_per_day},kg/day,Aggregate daily demand in trade zone`);
  lines.push(`Capture Proportion,${(inputs.capture_proportion * 100).toFixed(1)}%,%,Estimated share captured by proposed site`);
  lines.push(`Diversion Proportion,${(inputs.diversion_proportion * 100).toFixed(1)}%,%,Share diverted from existing retail network`);
  lines.push(`Accessibility Demand,${inputs.accessibility_demand_kg_per_day},kg/day,Highway / pass-by traffic demand`);
  lines.push('');

  // 3. Calculated Results
  lines.push('--- SIMULATION ARITHMETIC & IMPACT METRICS ---');
  lines.push('Metric,Value (kg/day),Description');
  lines.push(`Proposed Station Demand,${results.results.proposed_station_demand_kg_per_day},Total volume dispensed at proposed site`);
  lines.push(`Estimated Diverted Demand,${results.results.estimated_diverted_demand_kg_per_day},Cannibalized volume drawn from existing network`);
  lines.push(`Net Additional Network Demand,${results.results.net_additional_network_demand_kg_per_day},Genuinely incremental new demand captured`);
  lines.push(`Network Baseline Daily Demand,${results.results.network_baseline_daily_demand_kg},Network baseline sales across study area`);
  lines.push(`Projected Scenario Network Total,${results.results.scenario_network_daily_demand_kg},Baseline + Net incremental demand`);
  lines.push('');

  // 4. Sensitivity Analysis Matrix
  if (results.sensitivity_analysis && results.sensitivity_analysis.length > 0) {
    lines.push('--- SENSITIVITY ANALYSIS MATRIX ---');
    lines.push('Capture Rate (%),Diversion Rate (%),Proposed Demand (kg/day),Diverted Demand (kg/day),Net Additional (kg/day)');
    results.sensitivity_analysis.forEach((p) => {
      lines.push(
        `${(p.capture_proportion * 100).toFixed(0)}%,${(p.diversion_proportion * 100).toFixed(0)}%,${p.proposed_station_demand_kg},${p.diverted_demand_kg},${p.net_additional_demand_kg}`
      );
    });
    lines.push('');
  }

  // 5. Data Gaps and Limitations
  lines.push('--- MANDATORY DATA PROVENANCE & METHODOLOGY LIMITATIONS ---');
  lines.push('Gap ID,Classification,Impact Description');
  lines.push('GAP-001,Spatial Coordinates,0/12 official directory stations have verified coordinates; nearby diversion is unallocated.');
  lines.push('GAP-002,Sales Observations,Historical sales series are synthetic benchmarks calibrated to Ahmedabad aggregate volume.');
  lines.push('GAP-003,Hourly Observations,Diurnal profiles are synthetic archetypes for 3 representative stations.');
  lines.push('GAP-004,Fleet Composition,Vehicle type counts are unobserved estimates.');
  lines.push('GAP-005,Supply Capacity,No empirical compressor telemetry or pipeline pressure curves.');
  lines.push('GAP-006,Weather Data,Weather observations are synthetic approximations.');
  lines.push('GAP-007,Candidate Stations,SerpApi Google Maps discoveries are quarantined unverified candidates.');
  lines.push('GAP-008,Study Area,Ahmedabad boundary is a provisional 50km screening box [22.80..23.30N 72.30..72.80E].');
  lines.push('');

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = scenarioName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `fuelcast_${safeTitle}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrintableReport(): void {
  window.print();
}

