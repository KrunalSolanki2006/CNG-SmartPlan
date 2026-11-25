import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeightsTuningPanel, DEFAULT_WEIGHTS } from '../components/candidates/WeightsTuningPanel';
import { CandidateLeaderboardTable } from '../components/candidates/CandidateLeaderboardTable';
import { CandidateDossierModal } from '../components/candidates/CandidateDossierModal';
import { CandidateRankingItem, CandidateDossierResponse } from '../types/candidates';

const mockCandidates: CandidateRankingItem[] = [
  {
    candidate_id: 'GUJ_CAN_001',
    name: 'GIDC Sanand II Automotive & Heavy Engineering Hub',
    city: 'Sanand',
    district: 'Ahmedabad',
    category: 'industrial_hub',
    latitude: 22.9845,
    longitude: 72.3312,
    highway_corridor: 'SH-17 Sanand - Viramgam Highway',
    final_score: 84.1,
    rank: 1,
    is_rankable: true,
    unrankable_reason: null,
    data_completeness_pct: 100.0,
    confidence_tier: 'High',
    demand_score: 82.5,
    service_gap_score: 95.0,
    road_accessibility_score: 85.0,
    distance_score: 72.0,
    nearest_station: {
      station_id: 'AMD004',
      station_name: 'Grand Millennium Ahmedabad Satellite',
      city: 'Ahmedabad',
      district: 'Ahmedabad',
      straight_line_distance_km: 21.4,
      driving_road_distance_km: 29.6,
      detour_ratio: 1.38,
      is_network_cannibalization_risk: false,
      nearest_lat: 23.0321,
      nearest_lng: 72.5187,
    },
    summary_verdict: 'Excellent high-yield industrial site',
  },
  {
    candidate_id: 'GUJ_CAN_016',
    name: 'Kutch Border Outpost Transit Screening (Data Incomplete)',
    city: 'Khavda',
    district: 'Kutch',
    category: 'highway_corridor',
    latitude: 23.8421,
    longitude: 69.7214,
    highway_corridor: 'Khavda - India Bridge Border Highway',
    final_score: null,
    rank: null,
    is_rankable: false,
    unrankable_reason: 'Missing essential commercial demand metrics',
    data_completeness_pct: 50.0,
    confidence_tier: 'Indeterminate',
    demand_score: null,
    service_gap_score: 100.0,
    road_accessibility_score: 40.0,
    distance_score: 100.0,
    nearest_station: null,
    summary_verdict: 'Under review',
  },
];

describe('Feature 3: Candidate Location Ranking Components', () => {
  it('WeightsTuningPanel: renders configurable weights and handles changes and reset', () => {
    const handleWeightsChange = vi.fn();
    const handleResetDefaults = vi.fn();

    render(
      <WeightsTuningPanel
        weights={DEFAULT_WEIGHTS}
        onWeightsChange={handleWeightsChange}
        onResetDefaults={handleResetDefaults}
        isUpdating={false}
      />
    );

    expect(screen.getByText('Multi-Criteria Weights')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Multi-Criteria Decision Analysis (MCDA)')).toBeInTheDocument();
    expect(screen.getByText('Demand Proxy (AADT & Industrial Hub)')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('Sum: 100%')).toBeInTheDocument();

    // Trigger reset button
    const resetBtn = screen.getByTitle('Reset default weights');
    fireEvent.click(resetBtn);
    expect(handleResetDefaults).toHaveBeenCalledTimes(1);
  });

  it('CandidateLeaderboardTable: filters candidates by search query and rankable only', () => {
    const handleSelect = vi.fn();
    const handleOpenDossier = vi.fn();
    const handleSearch = vi.fn();
    const handleCity = vi.fn();
    const handleCat = vi.fn();
    const handleRankable = vi.fn();

    const { rerender } = render(
      <CandidateLeaderboardTable
        candidates={mockCandidates}
        selectedCandidate={null}
        onSelectCandidate={handleSelect}
        onOpenDossier={handleOpenDossier}
        searchQuery=""
        onSearchChange={handleSearch}
        selectedCity=""
        onCityChange={handleCity}
        selectedCategory=""
        onCategoryChange={handleCat}
        rankableOnly={false}
        onRankableOnlyChange={handleRankable}
        availableCities={['Sanand', 'Khavda']}
        availableCategories={['industrial_hub', 'highway_corridor']}
      />
    );

    // Both candidates visible initially
    expect(screen.getByText('GIDC Sanand II Automotive & Heavy Engineering Hub')).toBeInTheDocument();
    expect(screen.getByText('Kutch Border Outpost Transit Screening (Data Incomplete)')).toBeInTheDocument();
    expect(screen.getByText('Not Rankable')).toBeInTheDocument();

    // Rerender with rankableOnly=true
    rerender(
      <CandidateLeaderboardTable
        candidates={mockCandidates}
        selectedCandidate={null}
        onSelectCandidate={handleSelect}
        onOpenDossier={handleOpenDossier}
        searchQuery=""
        onSearchChange={handleSearch}
        selectedCity=""
        onCityChange={handleCity}
        selectedCategory=""
        onCategoryChange={handleCat}
        rankableOnly={true}
        onRankableOnlyChange={handleRankable}
        availableCities={['Sanand', 'Khavda']}
        availableCategories={['industrial_hub', 'highway_corridor']}
      />
    );

    expect(screen.getByText('GIDC Sanand II Automotive & Heavy Engineering Hub')).toBeInTheDocument();
    expect(screen.queryByText('Kutch Border Outpost Transit Screening (Data Incomplete)')).not.toBeInTheDocument();
  });

  it('CandidateDossierModal: displays mathematical breakdown, nearest station evidence, and legal disclaimer', () => {
    const mockDossier: CandidateDossierResponse = {
      candidate: {
        candidate_id: 'GUJ_CAN_001',
        name: 'GIDC Sanand II Automotive & Heavy Engineering Hub',
        city: 'Sanand',
        district: 'Ahmedabad',
        category: 'industrial_hub',
        address: 'Sanand Industrial Estate Phase II, Bol GIDC',
        latitude: 22.9845,
        longitude: 72.3312,
        highway_corridor: 'SH-17 Sanand - Viramgam Highway',
        road_type: 'State Highway (4-Lane Divided)',
        aadt_commercial_traffic: 8500,
        industrial_density_index: 92.0,
        service_gap_radius_km: 21.4,
        pipeline_proximity_meters: 350,
        data_completeness_pct: 100.0,
        missing_criteria: [],
        verification_status: 'Candidate',
        source_reference: 'GIDC Sanand Master Plan',
        source_type: 'Government Spatial Portal',
        rationale: 'Major auto engineering cluster',
      },
      is_rankable: true,
      unrankable_reason: null,
      rank: 1,
      final_score: 84.1,
      confidence_tier: 'High',
      data_completeness_pct: 100.0,
      scoring_breakdown: [
        {
          criterion_key: 'demand',
          criterion_name: 'Estimated Demand Proxy',
          raw_value: 8500,
          unit: 'PCU/day',
          normalized_score: 82.5,
          base_weight: 0.35,
          effective_weight: 0.35,
          weighted_contribution: 28.9,
          is_missing: false,
          explanation: 'Commercial traffic 8,500 PCU/day on SH-17',
        },
      ],
      weights_applied: { demand: 0.35, service_gap: 0.30, road_accessibility: 0.20, distance: 0.15 },
      renormalization_applied: false,
      nearest_station: {
        station_id: 'AMD004',
        station_name: 'Grand Millennium Ahmedabad Satellite',
        city: 'Ahmedabad',
        district: 'Ahmedabad',
        straight_line_distance_km: 21.4,
        driving_road_distance_km: 29.6,
        detour_ratio: 1.38,
        is_network_cannibalization_risk: false,
        nearest_lat: 23.0321,
        nearest_lng: 72.5187,
      },
      full_audit_explanation: 'GIDC Sanand achieves 84.1/100 score.',
      feasibility_disclaimer: 'Suitability scoring reflects preliminary decision-support modeling. PESO statutory clearances required.',
    };

    const handleClose = vi.fn();

    render(
      <CandidateDossierModal
        isOpen={true}
        dossier={mockDossier}
        onClose={handleClose}
        isLoading={false}
      />
    );

    expect(screen.getByText('GUJ_CAN_001')).toBeInTheDocument();
    expect(screen.getByText('GIDC Sanand II Automotive & Heavy Engineering Hub')).toBeInTheDocument();
    expect(screen.getByText('84.1')).toBeInTheDocument();
    expect(screen.getByText('Grand Millennium Ahmedabad Satellite (Ahmedabad)')).toBeInTheDocument();
    expect(screen.getAllByText('~29.6 km').length).toBeGreaterThan(0);
    expect(screen.getByText(/GIDC Sanand achieves 84.1\/100 score/)).toBeInTheDocument();
    expect(screen.getByText(/PESO statutory clearances required/)).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
