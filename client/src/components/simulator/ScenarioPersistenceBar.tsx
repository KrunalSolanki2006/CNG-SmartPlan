import React, { useState, useEffect } from 'react';
import {
  Save,
  FolderOpen,
  Printer,
  RotateCcw,
  Trash2,
  Check,
  Bookmark,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ImpactSimulatorRequest, ImpactSimulatorResponse } from '../../types/api';
import { exportSimulatorCsv, triggerPrintableReport } from '../../utils/exportSimulator';

export interface SavedScenarioItem {
  id: string;
  name: string;
  savedAt: string;
  inputs: ImpactSimulatorRequest;
}

const STORAGE_KEY_SAVED_SCENARIOS = 'cng_simulator_saved_scenarios';

interface ScenarioPersistenceBarProps {
  currentInputs: ImpactSimulatorRequest;
  currentResults: ImpactSimulatorResponse | null;
  onLoadScenario: (inputs: ImpactSimulatorRequest, name: string) => void;
  onResetToBenchmark: () => void;
  activeScenarioName: string;
  setActiveScenarioName: (name: string) => void;
}

export const ScenarioPersistenceBar: React.FC<ScenarioPersistenceBarProps> = ({
  currentInputs,
  currentResults,
  onLoadScenario,
  onResetToBenchmark,
  activeScenarioName,
  setActiveScenarioName,
}) => {
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioItem[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Load saved scenarios on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED_SCENARIOS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedScenarios(parsed);
        }
      }
    } catch {
      // Ignore storage parse error
    }
  }, []);

  const persistScenarios = (list: SavedScenarioItem[]) => {
    setSavedScenarios(list);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_SCENARIOS, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const handleSaveCurrentScenario = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newScenarioName.trim() || `Scenario ${new Date().toLocaleDateString('en-IN')}`;
    const newItem: SavedScenarioItem = {
      id: `scen_${Date.now()}`,
      name: trimmed,
      savedAt: new Date().toISOString(),
      inputs: { ...currentInputs },
    };

    const updated = [newItem, ...savedScenarios.filter((s) => s.name !== trimmed)];
    persistScenarios(updated);
    setActiveScenarioName(trimmed);
    setNewScenarioName('');
    setIsSaveModalOpen(false);

    setFeedbackMsg(`Scenario "${trimmed}" saved.`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleDeleteScenario = (id: string) => {
    const updated = savedScenarios.filter((s) => s.id !== id);
    persistScenarios(updated);
  };

  const handleSelectScenario = (item: SavedScenarioItem) => {
    onLoadScenario(item.inputs, item.name);
    setIsManageModalOpen(false);
    setFeedbackMsg(`Loaded scenario: "${item.name}"`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleExportCsv = () => {
    if (currentResults) {
      exportSimulatorCsv(currentInputs, currentResults, activeScenarioName);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Active Scenario Title & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Bookmark className="w-4 h-4 text-[#005F73]" />
          <span className="font-semibold text-slate-900">Active Scenario:</span>
          <span className="font-bold text-[#005F73] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
            {activeScenarioName}
          </span>

          {feedbackMsg && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005F73] bg-[#EAF6F2] px-2 py-0.5 rounded-lg border border-[#94D2BD]/60">
              <Check className="w-3 h-3 text-[#0A9396]" />
              {feedbackMsg}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewScenarioName(activeScenarioName === 'Default Benchmark' ? '' : activeScenarioName);
              setIsSaveModalOpen(true);
            }}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Scenario
          </Button>

          {/* Manage / Load Saved Scenarios */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsManageModalOpen(true)}
            leftIcon={<FolderOpen className="w-3.5 h-3.5" />}
          >
            Saved Scenarios ({savedScenarios.length})
          </Button>

          {/* Export CSV */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!currentResults}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#0A9396]" />}
          >
            Export CSV
          </Button>

          {/* Print Report */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerPrintableReport}
            leftIcon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
          >
            Print Report
          </Button>

          {/* Reset to Default Benchmark */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetToBenchmark}
            className="text-slate-500 hover:text-slate-900"
            title="Reset to Benchmark default values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Save Scenario Modal */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Current Scenario"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCurrentScenario} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Store the current planning parameters (catchment radius, demand, capture, diversion, coordinates) to your local browser storage for quick retrieval during evaluation.
          </p>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Scenario Name / Identifier:
            </label>
            <input
              type="text"
              required
              value={newScenarioName}
              onChange={(e) => setNewScenarioName(e.target.value)}
              placeholder="e.g. Eastern Ring Road High-Capture Corridor"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-[#0A9396] focus:border-[#0A9396] outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1 font-mono text-slate-500">
            <div>Coords: ({currentInputs.proposed_latitude}, {currentInputs.proposed_longitude})</div>
            <div>Catchment Demand: {currentInputs.catchment_demand_kg_per_day} kg/day (Radius {currentInputs.catchment_radius_km} km)</div>
            <div>Capture Rate: {(currentInputs.capture_proportion * 100).toFixed(0)}% | Diversion Rate: {(currentInputs.diversion_proportion * 100).toFixed(0)}%</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" leftIcon={<Save className="w-3.5 h-3.5" />}>
              Save to Library
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage / Load Scenarios Modal */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title="Saved Scenario Library"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {savedScenarios.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-500/60" />
              <p className="font-medium text-slate-900">No saved scenarios yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Adjust parameters in the simulator and click &ldquo;Save Scenario&rdquo; to store multiple comparison models.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {savedScenarios.map((scen) => (
                <div
                  key={scen.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{scen.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(scen.savedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Catchment: {scen.inputs.catchment_demand_kg_per_day} kg/d | Cap: {(scen.inputs.capture_proportion * 100).toFixed(0)}% | Div: {(scen.inputs.diversion_proportion * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSelectScenario(scen)}
                    >
                      Load Scenario
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScenario(scen.id)}
                      className="p-1.5 text-slate-500 hover:text-[#AE2012] rounded transition-colors"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Stored locally in browser localStorage</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsManageModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
