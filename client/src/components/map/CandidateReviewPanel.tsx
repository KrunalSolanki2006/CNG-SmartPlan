import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { DiscoveredStation, CandidateVerificationStatus } from '../../types/maps';
import { updateCandidateStatus } from '../../api/maps';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useNavigate } from 'react-router-dom';

interface CandidateReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: DiscoveredStation[];
  onCandidateUpdated: (updated: DiscoveredStation) => void;
  onRefresh: () => void;
}

export const CandidateReviewPanel: React.FC<CandidateReviewPanelProps> = ({
  isOpen,
  onClose,
  candidates,
  onCandidateUpdated,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<DiscoveredStation | null>(null);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Status counts
  const unverifiedCount = candidates.filter((c) => c.verification_status === 'unverified_candidate').length;
  const pendingCount = candidates.filter((c) => c.verification_status === 'pending_review').length;
  const verifiedCount = candidates.filter((c) => c.verification_status === 'verified_project_record').length;
  const rejectedCount = candidates.filter((c) => c.verification_status === 'rejected').length;

  const filteredCandidates = candidates.filter((c) => {
    if (activeTab === 'all') return true;
    return c.verification_status === activeTab;
  });

  const handleStatusChange = async (
    candidateId: string,
    newStatus: CandidateVerificationStatus,
    note?: string
  ) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await updateCandidateStatus(candidateId, newStatus, note || reviewNote);
      onCandidateUpdated(updated);
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate(updated);
      }
      setReviewNote('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to update candidate status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendToSimulator = (c: DiscoveredStation) => {
    handleStatusChange(c.id, 'proposed_simulation_location', 'Sent to New-Station Impact Simulator');
    onClose();
    navigate(`/simulator?lat=${c.latitude}&lng=${c.longitude}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified_project_record':
        return <Badge variant="success">Verified Record</Badge>;
      case 'pending_review':
        return <Badge variant="warning">In Review Queue</Badge>;
      case 'rejected':
        return <Badge variant="neutral">Rejected</Badge>;
      case 'proposed_simulation_location':
        return <Badge variant="teal">Simulator Site</Badge>;
      default:
        return <Badge variant="neutral">Unverified Candidate</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl" title="Candidate Station Review & Verification Workflow">
      <div className="space-y-4 text-xs">
        {/* Governance Policy Notice */}
        <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-xs block text-[#0F172A]">
                Quarantine & Verification Governance Policy
              </span>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                External discoveries from Google Maps via SerpApi are strictly segregated from authoritative baseline records. Candidates must undergo municipal verification before being recognized as official network planning assets.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="shrink-0 text-xs"
          >
            Refresh
          </Button>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`p-2.5 rounded border transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="block text-lg font-bold">{candidates.length}</span>
            <span className="text-[10px] uppercase font-semibold">All Discovered</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unverified_candidate')}
            className={`p-2.5 rounded border transition-all ${
              activeTab === 'unverified_candidate'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="block text-lg font-bold">{unverifiedCount}</span>
            <span className="text-[10px] uppercase font-semibold">Unverified</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending_review')}
            className={`p-2.5 rounded border transition-all ${
              activeTab === 'pending_review'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="block text-lg font-bold">{pendingCount}</span>
            <span className="text-[10px] uppercase font-semibold">Review Queue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verified_project_record')}
            className={`p-2.5 rounded border transition-all ${
              activeTab === 'verified_project_record'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="block text-lg font-bold">{verifiedCount}</span>
            <span className="text-[10px] uppercase font-semibold">Approved</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`p-2.5 rounded border transition-all ${
              activeTab === 'rejected'
                ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="block text-lg font-bold">{rejectedCount}</span>
            <span className="text-[10px] uppercase font-semibold">Rejected</span>
          </button>
        </div>

        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="font-bold underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Candidate List & Detail Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 max-h-[460px] overflow-hidden">
          {/* Candidates Master List */}
          <div className="md:col-span-5 overflow-y-auto space-y-2 pr-1 max-h-[450px]">
            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                No candidate stations in this review category.
              </div>
            ) : (
              filteredCandidates.map((c) => {
                const isSelected = selectedCandidate?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCandidate(c);
                      setReviewNote(c.reviewer_notes || '');
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-[#0F766E] bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-slate-900 truncate block max-w-[200px]">
                        {c.station_name}
                      </span>
                      {getStatusBadge(c.verification_status)}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mb-1">
                      {c.address || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
                    </p>

                    {c.potential_duplicate_of && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Near {c.potential_duplicate_of}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Candidate Detail & Action Form */}
          <div className="md:col-span-7 bg-slate-50/60 p-4 rounded-lg border border-slate-200 flex flex-col justify-between overflow-y-auto max-h-[450px]">
            {selectedCandidate ? (
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <h4 className="font-bold text-sm text-[#0F172A]">
                      {selectedCandidate.station_name}
                    </h4>
                    {getStatusBadge(selectedCandidate.verification_status)}
                  </div>
                  <p className="text-xs text-slate-600">{selectedCandidate.address || 'Address not listed'}</p>
                </div>

                {/* Spatial & Source Metadata */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-medium">Coordinates</span>
                    <span className="font-mono text-slate-800 font-bold">
                      {selectedCandidate.latitude.toFixed(5)}°N, {selectedCandidate.longitude.toFixed(5)}°E
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Source Provenance</span>
                    <span className="font-mono text-slate-800">
                      {selectedCandidate.data_source}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Google Place ID</span>
                    <span className="font-mono text-slate-800 truncate block">
                      {selectedCandidate.place_id || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Customer CID / Data ID</span>
                    <span className="font-mono text-slate-800 truncate block">
                      {selectedCandidate.data_cid || selectedCandidate.data_id || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Duplicate Alert Banner */}
                {selectedCandidate.potential_duplicate_of && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Duplicate Proximity Check:</strong> Discovered candidate is located within 250m of existing network asset <strong>{selectedCandidate.potential_duplicate_of}</strong>.
                    </span>
                  </div>
                )}

                {/* Planner Review Notes Input */}
                <div className="space-y-1">
                  <label htmlFor="review-notes" className="font-semibold text-slate-700 text-[11px] block">
                    Planner Decision Notes / Audit Justification:
                  </label>
                  <textarea
                    id="review-notes"
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter verification notes, municipal zoning check, or rejection rationale..."
                    className="w-full p-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {selectedCandidate.verification_status !== 'pending_review' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedCandidate.id, 'pending_review')}
                      isLoading={isUpdating}
                    >
                      Move to Review Queue
                    </Button>
                  )}

                  {selectedCandidate.verification_status !== 'verified_project_record' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStatusChange(selectedCandidate.id, 'verified_project_record')}
                      isLoading={isUpdating}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Approve as Verified Record
                    </Button>
                  )}

                  {selectedCandidate.verification_status !== 'rejected' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(selectedCandidate.id, 'rejected')}
                      isLoading={isUpdating}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      className="text-rose-700 hover:bg-rose-50 border-rose-200"
                    >
                      Reject Candidate
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendToSimulator(selectedCandidate)}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />}
                    className="text-[#0F766E]"
                  >
                    Send to Simulator
                  </Button>
                </div>

                {/* Audit History Log */}
                {selectedCandidate.review_history && selectedCandidate.review_history.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="font-bold text-[11px] text-slate-700 block">Review Decision Audit Log:</span>
                    <div className="space-y-1">
                      {selectedCandidate.review_history.map((entry, idx) => (
                        <div key={idx} className="p-1.5 bg-white rounded border border-slate-100 text-[10px] text-slate-600 flex items-center justify-between">
                          <span>
                            <strong>{entry.previous_status}</strong> &rarr; <strong>{entry.new_status}</strong>: {entry.notes}
                          </span>
                          <span className="font-mono text-slate-400">{entry.timestamp.slice(0, 10)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                <MapPin className="w-8 h-8 text-slate-300" />
                <p>Select a candidate station on the left to inspect metadata and record review decisions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
