import React, { useState } from 'react';
import { useStations } from '../hooks/useStations';
import { useFixtureMode } from '../context/FixtureContext';
import { Station } from '../types/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { ErrorState } from '../components/ui/ErrorState';
import { StationMap } from '../components/map/StationMap';
import { ZeroCoordinatesBanner } from '../components/map/ZeroCoordinatesBanner';
import { ProposedLocationPanel } from '../components/map/ProposedLocationPanel';
import { NearbyStationsPanel } from '../components/map/NearbyStationsPanel';
import { MapStationSidebar } from '../components/map/MapStationSidebar';
import { MapLegend } from '../components/map/MapLegend';
import { RotateCcw } from 'lucide-react';

export const MapPage: React.FC = () => {
  const { useFixtures, toggleFixtures } = useFixtureMode();

  // 1. Fetch station inventory from exact contract endpoint
  const {
    data: stationsData,
    isLoading: isStationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useStations();

  const stations = stationsData?.stations || [];

  // 2. Map State: Proposed location candidate coordinates
  const [proposedCoords, setProposedCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 23.05,
    lng: 72.6,
  });

  // Selected station from sidebar for detail inspection
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const handleSelectProposedLocation = (coords: { lat: number; lng: number }) => {
    setProposedCoords(coords);
  };

  return (
    <div className="space-y-6">
      {/* Dev Fixture Persistent Notice */}
      {useFixtures && (
        <div
          role="status"
          className="rounded-lg bg-amber-500 text-slate-950 p-3 text-xs font-medium flex items-center justify-between shadow-sm border border-amber-600"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] bg-black text-amber-300 px-2 py-0.5 rounded">
              Dev Fixtures Active
            </span>
            <span>
              Offline development fixtures enabled. Real API calls are bypassed; never used as a silent production fallback.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFixtures}
            className="underline hover:text-white font-bold ml-2 cursor-pointer"
          >
            Switch to Live API
          </button>
        </div>
      )}

      {/* Header & Planning Context */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
              Ahmedabad CNG Network Map
            </h2>
            <Badge variant="teal">Feature D</Badge>
            <DataOriginBadge origin="real_public" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Geographic view of Ahmedabad study area (≈23.0225°N, 72.5714°E). Strict compliance with spatial data policy: zero unverified coordinates are rendered as confirmed operating stations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFixtures}
            className="text-xs text-[#64748B]"
          >
            {useFixtures ? 'Disable Fixtures' : 'Enable Dev Fixtures'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refetchStations}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Honest Zero-Coordinates & Governance Banner */}
      <ZeroCoordinatesBanner
        mapAvailability={stationsData?.map_availability}
        totalStations={stationsData?.total ?? 12}
        eligiblePins={stationsData?.eligible_for_map_pin ?? 0}
      />

      {/* API Error State */}
      {stationsError && !useFixtures && (
        <ErrorState
          title="Station Inventory Unavailable"
          code={stationsError.code}
          message={`${stationsError.message} Ensure Member 2's backend service is running on http://localhost:8000.`}
          onRetry={refetchStations}
        />
      )}

      {/* Map Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Viewport & Legend */}
        <div className="lg:col-span-2 space-y-4">
          <StationMap
            stations={stations}
            proposedCoords={proposedCoords}
            onSelectProposedLocation={handleSelectProposedLocation}
            selectedStation={selectedStation}
          />

          <MapLegend />

          {/* Nearby Station Distance Analysis Card */}
          <NearbyStationsPanel proposedCoords={proposedCoords} />
        </div>

        {/* Right Sidebar: Candidate Controls & Station Directory */}
        <div className="space-y-6">
          {/* Candidate Proposed Location Input & Presets */}
          <ProposedLocationPanel
            proposedCoords={proposedCoords}
            onSetCoords={setProposedCoords}
          />

          {/* Station Inventory Register */}
          <MapStationSidebar
            stations={stations}
            isLoading={isStationsLoading}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
          />
        </div>
      </div>
    </div>
  );
};
