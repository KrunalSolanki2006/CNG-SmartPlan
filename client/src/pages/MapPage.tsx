import React from 'react';
import { MapPin, ShieldAlert, Compass } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';
import { Button } from '../components/ui/Button';

export const MapPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-card bg-white p-5 border border-[#DCE4E8] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-[#0F172A]">
              Ahmedabad CNG Network Map
            </h2>
            <Badge variant="neutral">Feature D</Badge>
            <DataOriginBadge origin="real_public" size="sm" />
          </div>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Geographic view of Ahmedabad study area (≈23.0225°N, 72.5714°E). Strict compliance with spatial data policy: zero unverified coordinates are rendered as confirmed operating stations.
          </p>
        </div>
      </div>

      {/* Map Container with Honest Unavailable Overlay */}
      <div className="relative rounded-card-lg border border-[#DCE4E8] bg-slate-100 overflow-hidden shadow-card h-[460px] flex items-center justify-center">
        {/* Subtle Map Grid Background (Simulated Canvas) */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(#0F766E 1px, transparent 1px), radial-gradient(#142B3A 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
          }}
        />

        {/* Honest Map Unavailable Overlay */}
        <div className="relative z-10 max-w-lg p-6 mx-4 rounded-card bg-white/95 backdrop-blur-xs border border-amber-200 shadow-modal text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Production Station Pins Unavailable
            </h3>
            <Badge variant="warning" size="sm">
              0 Verified Pins
            </Badge>
          </div>

          <p className="text-xs text-[#64748B] mb-4 leading-relaxed">
            All 12 records in <code className="font-mono text-slate-700">cng_stations.csv</code> leave coordinates blank. The 8 secondary coordinate leads in <code className="font-mono text-slate-700">station_coordinate_candidates.csv</code> remain unapproved (<code className="font-mono text-slate-700">approved_for_map_pin=no</code>).
          </p>

          <div className="p-3 bg-slate-50 rounded-lg text-left text-xs text-[#64748B] space-y-1 mb-4 border border-slate-200">
            <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Milestone 4 Interactive Capabilities:</span>
            </div>
            <ul className="list-disc pl-4 text-[11px] space-y-0.5">
              <li>OpenStreetMap tiles centred on Ahmedabad (23.0225°N, 72.5714°E)</li>
              <li>Interactive click to propose candidate location coordinates</li>
              <li>Direct handoff of clicked coordinates into the Impact Simulator</li>
            </ul>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Map tile layer activates in Milestone 4 with React Leaflet.')}
              leftIcon={<MapPin className="w-3.5 h-3.5 text-[#0F766E]" />}
            >
              Test Centering (23.0225°N, 72.5714°E)
            </Button>
          </div>
        </div>

        {/* Required OpenStreetMap Attribution */}
        <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 bg-white/90 px-2 py-0.5 rounded shadow-xs border border-slate-200">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-800">OpenStreetMap</a> contributors
        </div>
      </div>
    </div>
  );
};
