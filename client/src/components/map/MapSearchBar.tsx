import React, { useState } from 'react';
import { Search, Loader2, Sparkles, Filter, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LocationAutocomplete } from './LocationAutocomplete';

export type MapFilterType = 'all' | 'discovered' | 'verified';

export interface MapSearchBarProps {
  onSearch?: (query: string) => void;
  onSelectLocation?: (coords: { lat: number; lng: number; label?: string }) => void;
  isLoading?: boolean;
  activeFilter?: MapFilterType;
  onFilterChange?: (filter: MapFilterType) => void;
  discoveredCount?: number;
  verifiedCount: number;
  lastQuery?: string;
  isCached?: boolean;
  isFixture?: boolean;
  mode?: string;
  onToggleMode?: () => void;
  onOpenReviewQueue?: () => void;
  reviewQueueCount?: number;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  onSearch,
  onSelectLocation,
  isLoading = false,
  activeFilter = 'verified',
  onFilterChange,
  discoveredCount = 0,
  verifiedCount,
  lastQuery,
  isCached,
  isFixture,
  mode = 'auto',
  onToggleMode,
  onOpenReviewQueue,
  reviewQueueCount = 0,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchInput.trim());
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs ${onSelectLocation ? '' : 'space-y-3'}`}>
      {/* Top row: search form or location autocomplete */}
      {onSelectLocation ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <LocationAutocomplete onSelectLocation={onSelectLocation} />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search CNG filling stations in Ahmedabad (e.g. Adani CNG, Torrent Gas, SG Highway)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396] focus:border-[#0A9396] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-[#005F73] hover:bg-[#0A9396] disabled:bg-[#E3DDCE] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching Google Maps...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Discover CNG Stations</span>
              </>
            )}
          </button>

          {onOpenReviewQueue && reviewQueueCount > 0 && (
            <button
              type="button"
              onClick={onOpenReviewQueue}
              className="px-3 py-2 bg-slate-50 hover:bg-[#EAF6F2] border border-slate-200 text-[#005F73] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0A9396]" />
              <span>Review Queue ({reviewQueueCount})</span>
            </button>
          )}
        </form>
      )}

      {/* Bottom row: Filter chips or network status (shown in discovery search mode) */}
      {!onSelectLocation && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#EAF6F2] text-[#005F73] border border-[#94D2BD]/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0A9396]" />
              <span>Approved Network: {verifiedCount} Stations Active</span>
            </span>

            {discoveredCount > 0 && onFilterChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3 text-slate-500" />
                  Layer Filter:
                </span>

                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-[#001219] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All Stations ({discoveredCount + verifiedCount})
                </button>

                <button
                  type="button"
                  onClick={() => onFilterChange('discovered')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeFilter === 'discovered'
                      ? 'bg-[#CA6702] text-white shadow-xs'
                      : 'bg-[#FEF6E9] text-[#CA6702] border border-[#E9D8A6] hover:bg-[#FDF0D5]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EE9B00] animate-pulse" />
                  <span>Discovered Candidates ({discoveredCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterChange('verified')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeFilter === 'verified'
                      ? 'bg-[#005F73] text-white shadow-xs'
                      : 'bg-[#EAF6F2] text-[#005F73] border border-[#94D2BD]/60 hover:bg-[#D5EFE7]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A9396]" />
                  <span>Approved Network ({verifiedCount})</span>
                </button>
              </div>
            )}
          </div>

          {/* Live / Cached indicator and Mode toggle */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
            {lastQuery && (
              <span className="truncate max-w-[180px] text-slate-900 italic">
                "{lastQuery}"
              </span>
            )}
            {isCached && !isFixture && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 text-[#005F73] text-[10px] font-mono border border-slate-200">
                <CheckCircle2 className="w-3 h-3 text-[#0A9396]" /> Cached
              </span>
            )}
            {onToggleMode && (
              <button
                type="button"
                onClick={onToggleMode}
                className="ml-1 text-[10px] text-slate-500 hover:text-slate-900 underline font-mono cursor-pointer"
              >
                Mode: {mode.toUpperCase()}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
