import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { DataOriginBadge } from '../ui/DataOriginBadge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { Station, StationsResponse } from '../../types/api';
import { ApiError } from '../../api/client';

export interface StationInventoryTableProps {
  data: StationsResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  onRetry?: () => void;
}

export const StationInventoryTable: React.FC<StationInventoryTableProps> = ({
  data,
  isLoading,
  error,
  onRetry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [studyAreaFilter, setStudyAreaFilter] = useState<'all' | 'yes' | 'uncertain'>('all');
  const [simulationFilter, setSimulationFilter] = useState<'all' | 'eligible_only'>('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const stations = data?.stations || [];

  const filteredStations = useMemo(() => {
    return stations.filter((st) => {
      // Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        st.station_id.toLowerCase().includes(query) ||
        st.station_name.toLowerCase().includes(query) ||
        st.locality.toLowerCase().includes(query) ||
        st.address.toLowerCase().includes(query) ||
        st.operator.toLowerCase().includes(query);

      // Study area filter
      const matchesStudyArea =
        studyAreaFilter === 'all' || st.in_study_area === studyAreaFilter;

      // Simulation filter
      const matchesSimulation =
        simulationFilter === 'all' ||
        (simulationFilter === 'eligible_only' && st.eligible_for_simulation);

      return matchesSearch && matchesStudyArea && matchesSimulation;
    });
  }, [stations, searchQuery, studyAreaFilter, simulationFilter]);

  return (
    <Card className="border-[#DCE4E8] shadow-card">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3EF] text-[#0F766E] flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-[#0F172A]">
              Station Master Directory
            </CardTitle>
            <Badge variant="success" size="sm">
              {stations.length} Directory Records
            </Badge>
            <DataOriginBadge origin="real_public" size="sm" />
          </div>
          <CardDescription>
            Source-backed directory listing from official operator portals (Gujarat Energy Limited & HPCL). Partial subset, not an exhaustive Ahmedabad census.
          </CardDescription>
        </div>

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh Directory
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="station-search"
              aria-label="Search station directory"
              placeholder="Search by ID (e.g. AMD001), station name, locality, or operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#DCE4E8] bg-white pl-9 pr-3.5 py-2 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Study Area:</span>
            </div>
            <select
              id="study-area-filter"
              aria-label="Filter by study area status"
              value={studyAreaFilter}
              onChange={(e) => setStudyAreaFilter(e.target.value as 'all' | 'yes' | 'uncertain')}
              className="rounded-lg border border-[#DCE4E8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="all">All Records (12)</option>
              <option value="yes">In Study Area: Yes (11)</option>
              <option value="uncertain">In Study Area: Uncertain (1)</option>
            </select>

            <select
              id="simulation-eligibility-filter"
              aria-label="Filter by simulation eligibility"
              value={simulationFilter}
              onChange={(e) => setSimulationFilter(e.target.value as 'all' | 'eligible_only')}
              className="rounded-lg border border-[#DCE4E8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="all">All Eligibility</option>
              <option value="eligible_only">Simulation Eligible (11)</option>
            </select>
          </div>
        </div>

        {/* Data Honest Notice */}
        <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold text-amber-950">Spatial Verification Policy:</span>{' '}
            All 12 records are partially verified directory entries with blank latitude/longitude. None are approved for map pin rendering (<code className="font-mono text-amber-950">eligible_for_map_pin=false</code>).
          </div>
        </div>

        {/* Loading / Error / Empty / Table States */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to Load Station Directory"
            code={error.code}
            message={error.message}
            onRetry={onRetry}
          />
        ) : filteredStations.length === 0 ? (
          <EmptyState
            title="No Matching Stations"
            description="No directory records match your current search query and filters."
            actionLabel="Reset Search & Filters"
            onAction={() => {
              setSearchQuery('');
              setStudyAreaFilter('all');
              setSimulationFilter('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#DCE4E8]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFCFD] border-b border-[#DCE4E8] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Station ID</th>
                  <th className="py-3 px-3">Name & Locality</th>
                  <th className="py-3 px-3">Operator / Brand</th>
                  <th className="py-3 px-3">Study Area</th>
                  <th className="py-3 px-3">Simulation Profile</th>
                  <th className="py-3 px-3">Map Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStations.map((st) => (
                  <tr key={st.station_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">
                      {st.station_id}
                    </td>

                    {/* Name & Locality */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#0F172A]">{st.station_name}</div>
                      <div className="text-[11px] text-[#64748B] truncate max-w-xs">
                        {st.locality}
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="py-3 px-3">
                      <div className="text-slate-800">
                        {st.operator === 'Not established' ? (
                          <span className="text-slate-500 italic">Not established</span>
                        ) : (
                          st.operator
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B]">{st.brand}</div>
                    </td>

                    {/* Study Area */}
                    <td className="py-3 px-3">
                      {st.in_study_area === 'yes' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>In Study Area</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Uncertain (Ognaj)</span>
                        </span>
                      )}
                    </td>

                    {/* Simulation Profile */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {st.simulation_profile}
                      </span>
                    </td>

                    {/* Map Status */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Unverified Pin</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStation(st)}
                        aria-label={`View details for ${st.station_name}`}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Station Details Inspection Modal */}
      {selectedStation && (
        <Modal
          isOpen={!!selectedStation}
          onClose={() => setSelectedStation(null)}
          title={`Station Audit: ${selectedStation.station_name} (${selectedStation.station_id})`}
          description="Detailed metadata record from cng_stations.csv and operator source directories."
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedStation(null)}>
              Close Audit
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-700">Data Origin Classification:</span>
              <DataOriginBadge origin={selectedStation.data_origin} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded border border-slate-100">
                <span className="text-[11px] text-[#64748B] block">Station ID</span>
                <span className="font-mono font-bold text-sm text-[#0F766E]">
                  {selectedStation.station_id}
                </span>
              </div>
              <div className="p-2.5 rounded border border-slate-100">
                <span className="text-[11px] text-[#64748B] block">Verification Status</span>
                <Badge variant="success" size="sm">
                  {selectedStation.verification_status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-[#64748B] block">Official Address</span>
                <p className="font-medium text-[#0F172A] mt-0.5">{selectedStation.address}</p>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] block">Pincode</span>
                <p className="font-mono text-slate-700 mt-0.5">{selectedStation.pincode}</p>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] block">Operator Established</span>
                <p className="font-medium text-[#0F172A] mt-0.5">{selectedStation.operator}</p>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] block">Brand Label</span>
                <p className="font-medium text-[#0F172A] mt-0.5">{selectedStation.brand}</p>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] block">Directory CNG Status</span>
                <p className="font-mono text-[11px] text-slate-700 mt-0.5">
                  {selectedStation.cng_status}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] block">Coordinates Verification</span>
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 mt-1">
                  <p className="font-semibold text-[11px]">Latitude / Longitude: NULL (Blank in Master)</p>
                  <p className="text-[10px] text-amber-800 mt-0.5">
                    Eligible for Map Pin: <span className="font-mono">false</span>. Per docs/DATA_PROVENANCE.md, no unverified secondary leads may be rendered as approved pins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
