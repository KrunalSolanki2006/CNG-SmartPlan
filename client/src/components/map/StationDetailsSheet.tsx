import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Star,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Navigation,
  TrendingUp,
  Loader2,
  MessageSquareQuote,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { DiscoveredStation, PlaceDetailsResponse } from '../../types/maps';
import { getPlaceDetails } from '../../api/maps';

export interface StationDetailsSheetProps {
  station: DiscoveredStation | null;
  onClose: () => void;
  onCalculateRoute: (destination: { lat: number; lng: number; label: string }) => void;
}

export const StationDetailsSheet: React.FC<StationDetailsSheetProps> = ({
  station,
  onClose,
  onCalculateRoute,
}) => {
  const navigate = useNavigate();
  const [details, setDetails] = useState<PlaceDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!station) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await getPlaceDetails({
          place_id: station.place_id,
          data_cid: station.data_cid,
          data_id: station.data_id,
          latitude: station.latitude,
          longitude: station.longitude,
        });
        if (isMounted) setDetails(resp);
      } catch (err: unknown) {
        if (isMounted) {
          setError('Could not load extra place details. Showing basic info.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [station]);

  if (!station) return null;

  const currentRating = details?.rating ?? station.rating;
  const currentReviews = details?.reviews_count ?? station.reviews_count;
  const currentHours = details?.hours;
  const currentPhone = details?.phone ?? station.phone;
  const currentAddress = details?.address ?? station.address;
  const currentOpenState = details?.open_state ?? station.open_state;
  const currentPhotos = details?.images && details.images.length > 0 ? details.images : (station.thumbnail ? [station.thumbnail] : []);
  const currentReviewsList = details?.reviews || [];

  const handleSimulate = () => {
    const params = new URLSearchParams({
      lat: String(station.latitude),
      lng: String(station.longitude),
      name: station.station_name,
    });
    navigate(`/simulator?${params.toString()}`);
  };

  const handleRoute = () => {
    onCalculateRoute({
      lat: station.latitude,
      lng: station.longitude,
      label: station.station_name,
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-[#0A9396]/20 bg-gradient-to-r from-[#001219] to-[#002633] text-white flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EE9B00] text-[#001219]">
              Discovered Candidate
            </span>
            <span className="text-[11px] text-[#94D2BD] font-mono">
              {station.place_id ? 'Google Place ID' : 'SerpApi Record'}
            </span>
          </div>
          <h3 className="text-sm font-bold truncate text-white">
            {station.station_name}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-[#94D2BD] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Provenance & Quarantine Warning Pill */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 text-xs text-slate-900 flex items-start gap-2.5 shrink-0">
        <ShieldAlert className="w-4 h-4 text-[#CA6702] shrink-0 mt-0.5" />
        <div className="leading-tight">
          <span className="font-semibold text-[#CA6702]">Quarantine Data Policy: </span>
          This station was discovered via Google Maps Search API. It is isolated in candidate quarantine and never injected into the immutable master CNG network CSVs.
        </div>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Photo Gallery or Thumbnail */}
        {currentPhotos.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <div className="h-44 w-full relative">
              <img
                src={currentPhotos[0]}
                alt={station.station_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              {currentPhotos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-medium">
                  +{currentPhotos.length - 1} photos
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ratings and Operating status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <div className="flex items-center gap-1.5">
              {currentRating ? (
                <>
                  <div className="flex items-center text-[#EE9B00]">
                    <Star className="w-4 h-4 fill-[#EE9B00]" />
                    <span className="font-bold text-sm text-slate-900 ml-1">
                      {currentRating.toFixed(1)}
                    </span>
                  </div>
                  {currentReviews && (
                    <span className="text-xs text-slate-500">
                      ({currentReviews} reviews)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-slate-500">No rating available</span>
              )}
            </div>
          </div>

          <div>
            {currentOpenState ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EAF6F2] text-[#005F73] border border-[#94D2BD]/60">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A9396]" />
                {currentOpenState}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Operating hours unlisted</span>
            )}
          </div>
        </div>

        {/* Location & Contact Info */}
        <div className="space-y-2.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl p-3">
          {currentAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-slate-900">Address: </span>
                <span>{currentAddress}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 font-mono text-[11px] text-[#005F73]">
            <span className="font-semibold font-sans text-slate-900">Coordinates: </span>
            <span>{station.latitude.toFixed(4)}°N, {station.longitude.toFixed(4)}°E</span>
          </div>

          {currentPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <a
                href={`tel:${currentPhone}`}
                className="text-[#005F73] hover:underline font-medium"
              >
                {currentPhone}
              </a>
            </div>
          )}

          {station.google_maps_url && (
            <div className="pt-1.5 border-t border-slate-100">
              <a
                href={station.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#005F73] hover:underline flex items-center gap-1 font-medium"
              >
                <span>View original listing on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Operating Hours Table */}
        {error && (
          <div className="p-2.5 rounded-xl bg-[#FEF6E9] text-[#CA6702] border border-[#E9D8A6] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#CA6702] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading && (
          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#0A9396]" />
            <span>Fetching detailed operating schedule...</span>
          </div>
        )}

        {currentHours && currentHours.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              <Clock className="w-3.5 h-3.5 text-[#005F73]" />
              <span>Weekly Operating Hours</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              {currentHours.map((h, i) => (
                <React.Fragment key={i}>
                  <span className="capitalize text-slate-500 font-medium">{h.day}</span>
                  <span className="text-right text-slate-900 font-mono text-[11px]">{h.hours}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* User Reviews Snippets */}
        {currentReviewsList.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              <MessageSquareQuote className="w-3.5 h-3.5 text-[#005F73]" />
              <span>Customer Reviews & Feedback</span>
            </div>
            <div className="space-y-2">
              {currentReviewsList.map((rev, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{rev.author}</span>
                    {rev.rating && (
                      <span className="flex items-center text-[#EE9B00] text-[11px] font-semibold">
                        ★ {rev.rating}
                      </span>
                    )}
                  </div>
                  {rev.snippet && (
                    <p className="text-slate-500 text-[11px] italic">"{rev.snippet}"</p>
                  )}
                  {rev.date && (
                    <span className="text-[10px] text-slate-500 block">{rev.date}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
        <button
          type="button"
          onClick={handleRoute}
          className="w-full py-2.5 bg-[#005F73] hover:bg-[#0A9396] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Navigation className="w-4 h-4" />
          <span>Calculate Road Directions from Candidate</span>
        </button>

        <button
          type="button"
          onClick={handleSimulate}
          className="w-full py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
        >
          <TrendingUp className="w-4 h-4 text-[#0A9396]" />
          <span>Simulate Impact for this Location</span>
        </button>
      </div>
    </div>
  );
};
