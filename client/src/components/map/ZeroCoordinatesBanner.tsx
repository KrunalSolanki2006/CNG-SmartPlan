import React from 'react';
import { ShieldAlert, ExternalLink, Info } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useNavigate } from 'react-router-dom';

interface ZeroCoordinatesBannerProps {
  mapAvailability?: {
    available: boolean;
    reason: string;
  };
  totalStations?: number;
  eligiblePins?: number;
}

export const ZeroCoordinatesBanner: React.FC<ZeroCoordinatesBannerProps> = ({
  mapAvailability = {
    available: false,
    reason:
      'No stations have independently verified coordinates. All 8 coordinate candidates are unapproved (approved_for_map_pin=no).',
  },
  totalStations = 12,
  eligiblePins = 0,
}) => {
  const navigate = useNavigate();

  return (
    <div
      role="region"
      aria-label="Map Coordinate Availability Notice"
      className="rounded-card bg-amber-50/80 border border-amber-200 p-4 shadow-sm space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-amber-950">
            Production Station Pins Unavailable
          </h3>
          <Badge variant="warning" size="sm">
            {eligiblePins} Verified Pins
          </Badge>
          <Badge variant="neutral" size="sm">
            {totalStations} Directory Records
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => navigate('/data-quality')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-950 underline self-start sm:self-auto cursor-pointer"
        >
          <span>View GAP-001 in Ledger</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <p className="text-xs text-amber-900/90 leading-relaxed">
        {mapAvailability.reason}
      </p>

      <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60 text-[11px] text-amber-800">
        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>
          <strong>Data Governance Rule:</strong> Unverified candidate coordinates from <code className="font-mono bg-amber-100/70 px-1 py-0.2 rounded">station_coordinate_candidates.csv</code> must never be rendered as confirmed station pins.
        </span>
      </div>
    </div>
  );
};
