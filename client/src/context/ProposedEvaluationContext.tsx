import React, { createContext, useContext, useState, useCallback } from 'react';
import { NearbyVerifiedStation } from '../types/candidates';

export type LocationSelectionSource = 'google_autocomplete' | 'map_pin';
export type EvaluationSourceSection = 'network_map' | 'candidate_evaluation';

export interface ProposedStationEvaluationState {
  proposed_name: string;
  latitude: number;
  longitude: number;
  selected_location: string;
  expected_daily_capacity_kg: number | null;
  radius_km: number;
  nearby_station_ids: string[];
  nearby_stations: NearbyVerifiedStation[];
  location_source: LocationSelectionSource;
  candidate_id: string | null;
  source_section: EvaluationSourceSection;
  updated_at: number;
}

interface ProposedEvaluationContextType {
  proposedEvaluation: ProposedStationEvaluationState | null;
  setProposedEvaluation: (state: ProposedStationEvaluationState) => void;
  clearProposedEvaluation: () => void;
}

const STORAGE_KEY = 'fuelcast_proposed_station_evaluation';

const ProposedEvaluationContext = createContext<ProposedEvaluationContextType | undefined>(undefined);

function loadInitialState(): ProposedStationEvaluationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProposedStationEvaluationState;
    if (
      parsed &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      !isNaN(parsed.latitude) &&
      !isNaN(parsed.longitude)
    ) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export const ProposedEvaluationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [proposedEvaluation, setProposedEvaluationState] =
    useState<ProposedStationEvaluationState | null>(loadInitialState);

  const setProposedEvaluation = useCallback((next: ProposedStationEvaluationState) => {
    setProposedEvaluationState(next);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const clearProposedEvaluation = useCallback(() => {
    setProposedEvaluationState(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  return (
    <ProposedEvaluationContext.Provider
      value={{ proposedEvaluation, setProposedEvaluation, clearProposedEvaluation }}
    >
      {children}
    </ProposedEvaluationContext.Provider>
  );
};

export function useProposedEvaluation(): ProposedEvaluationContextType {
  const ctx = useContext(ProposedEvaluationContext);
  if (!ctx) {
    throw new Error('useProposedEvaluation must be used within a ProposedEvaluationProvider');
  }
  return ctx;
}
