import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { ArrowRight, Map as MapIcon, Globe } from 'lucide-react';
import { GujaratNetworkSummary } from '../../types/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface GujaratNetworkOverviewCardProps {
  networkSummary: GujaratNetworkSummary | undefined;
  isLoading: boolean;
}

export const GujaratNetworkOverviewCard: React.FC<GujaratNetworkOverviewCardProps> = ({
  networkSummary,
  isLoading,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className="h-[360px] w-full rounded-2xl" />;
  }

  if (!networkSummary) return null;

  const topCities = networkSummary.station_distribution_by_city.slice(0, 6);
  const geo = networkSummary.geographic_coverage;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0A9396] shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900">
              Gujarat CNG Network Overview
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Verified CNG station footprint across {network_summary_text(networkSummary)} (excluding {networkSummary.excluded_or_unverified_count} unverified/non-CNG records).
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/map')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="rounded-xl shrink-0"
        >
          Open Network Map
        </Button>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Compact Gujarat Map Preview (Verified Stations Only) */}
          <div className="lg:col-span-7 relative rounded-xl overflow-hidden border border-slate-200 bg-[#0B1320] min-h-[280px] h-[280px]">
            <MapContainer
              center={[22.3, 71.8]}
              zoom={7}
              className="w-full h-full"
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {networkSummary.verified_coordinates.map((st) => (
                <CircleMarker
                  key={st.station_id}
                  center={[st.latitude, st.longitude]}
                  radius={5}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 1.5,
                    fillColor: '#0A9396',
                    fillOpacity: 0.9,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -4]}>
                    <div className="text-xs font-sans">
                      <div className="font-bold">{st.station_name}</div>
                      <div className="text-slate-500">
                        {st.city}, {st.district} • {st.operator}
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>

            <div className="absolute bottom-2.5 left-2.5 z-[500] bg-[#0B1320]/90 text-white px-3 py-1.5 rounded-lg text-[11px] border border-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5EEAD4]" />
              <span>{geo.verified_coordinate_stations} Verified Station Markers</span>
            </div>
          </div>

          {/* City Distribution & Geographic Coverage */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Top Cities by Station Count
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {networkSummary.cities_covered_count} Cities Total
                </span>
              </div>

              <div className="space-y-2">
                {topCities.map((c) => (
                  <div key={`${c.city}-${c.district}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate">
                        {c.city}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {c.station_count}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          ({c.share_pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0A9396] rounded-full"
                        style={{ width: `${Math.min(100, c.share_pct * 2.2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <Globe className="w-4 h-4 text-[#0A9396] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">Geographic Bounding Coverage</span>
                {geo.min_latitude !== null && geo.max_latitude !== null
                  ? `Lat ${geo.min_latitude.toFixed(2)}°N–${geo.max_latitude.toFixed(2)}°N, Lon ${geo.min_longitude?.toFixed(2)}°E–${geo.max_longitude?.toFixed(2)}°E`
                  : 'Coordinates unavailable'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function network_summary_text(summary: GujaratNetworkSummary): string {
  return `${summary.cities_covered_count} cities and ${summary.districts_covered_count} districts`;
}
