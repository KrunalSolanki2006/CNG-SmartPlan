import React, { useState, useEffect } from 'react';
import { GujaratStationModel } from '../types/candidates';
import { fetchGujaratNetworkStations } from '../api/candidates';
import { ExistingStationMapSection } from '../components/map/ExistingStationMapSection';
import { CandidateEvaluationSection } from '../components/evaluation/CandidateEvaluationSection';
import { MotionSection } from '../components/ui/MotionContainer';
import { Fuel, Target } from 'lucide-react';

export const MapPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'stations' | 'candidates'>(() =>
    new URLSearchParams(window.location.search).get('section') === 'candidates'
      ? 'candidates'
      : 'stations'
  );

  const [networkStations, setNetworkStations] = useState<GujaratStationModel[]>([]);
  const [selectedStation, setSelectedStation] = useState<GujaratStationModel | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadStations = async () => {
      try {
        const stationsResp = await fetchGujaratNetworkStations();
        if (!isMounted) return;
        setNetworkStations(stationsResp.stations);
        if (stationsResp.available_cities) {
          setAvailableCities(stationsResp.available_cities);
        }
        if (stationsResp.available_districts) {
          setAvailableDistricts(stationsResp.available_districts);
        }
      } catch (err: unknown) {
        console.error('Failed to load Gujarat verified station network:', err);
      }
    };

    loadStations();
    return () => {
      isMounted = false;
    };
  }, []);

  const verifiedStationsCount =
    networkStations.filter((s) => s.cng_classification === 'VERIFIED_OPERATING_CNG').length || 151;

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionSection delay={0.05}>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold tracking-wide uppercase text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A9396]" />
              Gujarat Geospatial Network
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Gujarat Gas Company Ltd. • Statewide CNG Planning
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Gujarat CNG Network Map
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed mt-1">
            Explore verified operating CNG stations across Gujarat or evaluate a proposed new station location with nearby station distances and network impact simulation.
          </p>
        </div>
      </MotionSection>

      {/* Primary Section Switcher */}
      <MotionSection delay={0.08}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSection('stations')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'stations'
                ? 'bg-[#0B1320] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Fuel className="w-4 h-4 text-[#5EEAD4] shrink-0" />
            <span>1. Existing CNG Station Map</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeSection === 'stations'
                  ? 'bg-[#0A9396]/30 text-[#5EEAD4]'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {verifiedStationsCount} Verified
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('candidates')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'candidates'
                ? 'bg-[#0B1320] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Target className="w-4 h-4 text-[#5EEAD4] shrink-0" />
            <span>2. Candidate Location Evaluation</span>
          </button>
        </div>
      </MotionSection>

      {/* 1. Gujarat-Wide Network Map with Integrated New Station Evaluation */}
      {activeSection === 'stations' && (
        <MotionSection delay={0.12}>
          <ExistingStationMapSection
            stations={networkStations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            availableCities={availableCities}
            availableDistricts={availableDistricts}
          />
        </MotionSection>
      )}

      {/* 2. Candidate Location Evaluation (4-Step Workflow) */}
      {activeSection === 'candidates' && (
        <MotionSection delay={0.12}>
          <CandidateEvaluationSection stations={networkStations} />
        </MotionSection>
      )}
    </div>
  );
};
