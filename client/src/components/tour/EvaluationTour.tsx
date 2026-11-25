import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface TourStep {
  step: number;
  title: string;
  page: string;
  path: string;
  headline: string;
  summary: string;
  evaluationChecklist: string[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: 'Executive Operations Dashboard',
    page: 'Dashboard',
    path: '/',
    headline: 'Operational Decision-Support Overview',
    summary:
      'Provides a high-level executive view of Ahmedabad network demand, active station counts, and fleet consumption benchmarks with real-time planning KPI intelligence.',
    evaluationChecklist: [
      'Executive KPI metrics and daily demand totals across 11 active stations',
      'Historical baseline demand trajectory and seasonal consumption curves',
      'Direct access to demand forecasting, network map, and simulation modules',
    ],
  },
  {
    step: 2,
    title: 'Station Network Directory',
    page: 'Station Register',
    path: '/',
    headline: 'Master Station Inventory & Geocoded Directory',
    summary:
      'Examine the comprehensive directory of Gujarat Gas operating stations in Ahmedabad. Each station is geocoded with verified coordinates, operator metadata, and operational status.',
    evaluationChecklist: [
      'Operational stations with full operator metadata and locality details',
      'Verified coordinates plotted for geospatial analysis and route planning',
      'Search and filter capabilities by station ID, locality, and operational status',
    ],
  },
  {
    step: 3,
    title: 'Seasonal Demand Forecasting',
    page: 'Forecasting Engine',
    path: '/forecast',
    headline: 'Multi-Horizon Holt-Winters Seasonal Models',
    summary:
      'Predictive forecasting (1 to 30 days) powered by Holt-Winters exponential smoothing and diurnal hourly dispensing curves. Evaluates demand against available supply to detect planning shortfalls.',
    evaluationChecklist: [
      'Multi-horizon forecasting (1–30 days) with confidence intervals',
      'Holt-Winters seasonal model compared against rolling mean baseline',
      'Diurnal hourly demand profiles showing peak vehicle dispensing hours',
      'Supply deficit monitoring with custom scenario target overrides',
    ],
  },
  {
    step: 4,
    title: 'Geospatial Network Map',
    page: 'Network Map',
    path: '/map',
    headline: 'Google Maps Station Navigation & Placement',
    summary:
      'Interactive cartography combining Gujarat Gas station registry with Google Maps search, place autocomplete, and turn-by-turn road navigation via SerpApi.',
    evaluationChecklist: [
      'Interactive Leaflet map with verified Gujarat Gas station markers',
      'Google Maps place autocomplete and direct coordinate selection',
      'Driving route navigation with road distance, travel time, and detour ratio',
      'One-click "Send to Simulator" for candidate location analysis',
    ],
  },
  {
    step: 5,
    title: 'New-Station Impact Simulator',
    page: 'Impact Simulator',
    path: '/simulator',
    headline: 'Cannibalization vs Net Growth Decision Engine',
    summary:
      'Core decision-support innovation: mathematically evaluates whether candidate stations generate genuinely new network CNG demand or cannibalize existing sales. Features road detour analysis, scenario persistence, and CSV export.',
    evaluationChecklist: [
      'Canonical impact metrics: Proposed Demand, Diverted Demand, Net Additional Demand',
      'Google Maps road distance, travel duration, and detour ratio analysis',
      'Scenario persistence: Save named scenarios, restore on reload, and reset to benchmark',
      'Executive CSV data download and printable scenario report',
      'Sensitivity analysis exploring capture vs diversion dynamics',
    ],
  },
];

interface EvaluationTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvaluationTour: React.FC<EvaluationTourProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isCurrentPage = location.pathname === currentStep.path;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      navigate(TOUR_STEPS[nextIndex].path);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      navigate(TOUR_STEPS[prevIndex].path);
    }
  };

  const handleJumpToStep = (idx: number) => {
    setCurrentStepIndex(idx);
    navigate(TOUR_STEPS[idx].path);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('cng_eval_tour_dismissed', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <aside
      aria-label="Judge Evaluation Quick Tour"
      className="fixed bottom-4 right-4 z-50 max-w-md w-full px-2 sm:px-0 transition-all duration-200"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden ring-1 ring-slate-900/10">
        {/* Tour Header Strip */}
        <div className="bg-[#0B1320] text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-teal-600 text-white">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs tracking-wide">
              Evaluator Quick Tour &bull; Step {currentStep.step} of {TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
              title={isMinimized ? 'Expand Tour' : 'Minimize Tour'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
              title="Close Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimized View */}
        {isMinimized ? (
          <div className="p-3 bg-slate-50 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 truncate">
              {currentStep.step}. {currentStep.title}
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="text-[#0F766E] font-bold text-xs hover:underline shrink-0 ml-2"
            >
              Expand
            </button>
          </div>
        ) : (
          /* Expanded Body */
          <div className="p-4 space-y-3.5 text-xs text-slate-700">
            {/* Step Stepper Dots */}
            <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((s, idx) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleJumpToStep(idx)}
                    className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                      idx === currentStepIndex
                        ? 'bg-[#0F766E] text-white ring-2 ring-teal-200'
                        : idx < currentStepIndex
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={s.title}
                  >
                    {s.step}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-semibold text-[#0F766E]">
                {currentStep.page}
              </span>
            </div>

            {/* Step Headline & Summary */}
            <div>
              <h4 className="font-bold text-sm text-[#0F172A] leading-tight">
                {currentStep.headline}
              </h4>
              <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">
                {currentStep.summary}
              </p>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5">
              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block">
                Key Features to Evaluate:
              </span>
              {currentStep.evaluationChecklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E] shrink-0 mt-0.5" />
                  <span className="leading-snug">{item}</span>
                </div>
              ))}
            </div>

            {/* Page Jump Action (if not currently on this page) */}
            {!isCurrentPage && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(currentStep.path)}
                  className="w-full text-xs text-[#0F766E] border-[#0F766E]/40 hover:bg-teal-50/50"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Navigate to {currentStep.page} ({currentStep.path})
                </Button>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="text-xs"
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1.5">
                {currentStepIndex < TOUR_STEPS.length - 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleNext}
                    className="text-xs"
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-xs bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Finish Tour
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

