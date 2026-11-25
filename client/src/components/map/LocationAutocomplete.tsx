import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation, AlertCircle } from 'lucide-react';
import { autocompleteLocations } from '../../api/maps';
import { AutocompleteSuggestion } from '../../types/maps';

export interface LocationAutocompleteProps {
  onSelectLocation: (coords: { lat: number; lng: number; label?: string }) => void;
  centerLat?: number;
  centerLng?: number;
  placeholder?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onSelectLocation,
  centerLat = 23.0225,
  centerLng = 72.5714,
  placeholder = 'Search place, locality, or address in Ahmedabad...',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced autocomplete query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const resp = await autocompleteLocations(
          trimmed,
          centerLat,
          centerLng,
          controller.signal
        );
        setSuggestions(resp.suggestions);
        setIsOpen(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Failed to fetch location suggestions');
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, centerLat, centerLng]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (sug: AutocompleteSuggestion) => {
    if (sug.is_selectable_place && sug.latitude !== null && sug.longitude !== null && sug.latitude !== undefined && sug.longitude !== undefined) {
      onSelectLocation({
        lat: sug.latitude,
        lng: sug.longitude,
        label: sug.title,
      });
      setQuery(sug.title);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-16 py-2 bg-slate-50 text-xs text-slate-900 border border-slate-200 rounded-xl shadow-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0A9396] focus:border-[#0A9396] transition-all"
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#0A9396] animate-spin" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-900 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs text-[#AE2012] bg-[#FDF0EE] flex items-center gap-1.5 border-b border-[#F5C2BC]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {suggestions.length === 0 && !isLoading && !error && (
            <div className="p-3 text-xs text-slate-500 text-center">
              No matching places found. Try another search.
            </div>
          )}

          {suggestions.map((sug, idx) => {
            const isPlace = sug.is_selectable_place;
            return (
              <button
                key={`${sug.place_id || sug.title}-${idx}`}
                type="button"
                onClick={() => handleSelect(sug)}
                disabled={!isPlace}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 border-b border-slate-100 last:border-b-0 transition-colors ${
                  isPlace
                    ? 'hover:bg-slate-50 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed bg-slate-50/50'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isPlace ? (
                    <div className="w-6 h-6 rounded-lg bg-[#EAF6F2] text-[#0A9396] flex items-center justify-center border border-[#94D2BD]/60">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-200">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {sug.title}
                    </span>
                    {isPlace && sug.latitude !== null && sug.longitude !== null && sug.latitude !== undefined && sug.longitude !== undefined && (
                      <span className="text-[10px] font-mono text-[#005F73] bg-[#EAF6F2] px-1.5 py-0.5 rounded border border-[#94D2BD]/60 shrink-0 font-medium">
                        {sug.latitude.toFixed(3)}, {sug.longitude.toFixed(3)}
                      </span>
                    )}
                    {!isPlace && (
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 font-semibold">
                        Keyword
                      </span>
                    )}
                  </div>
                  {sug.subtitle && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {sug.subtitle}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          <div className="bg-slate-50 px-3 py-2 text-[10px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Navigation className="w-3 h-3 text-[#0A9396]" />
              Select a place to update proposed candidate site
            </span>
            <span className="text-[9px] text-slate-500 font-medium">Google Maps Autocomplete</span>
          </div>
        </div>
      )}
    </div>
  );
};
