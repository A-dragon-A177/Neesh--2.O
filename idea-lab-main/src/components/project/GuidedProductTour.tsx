import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Check, Compass, MoveUpLeft } from "lucide-react";

export interface TourStep {
  id: string;
  tab: "overview" | "blog" | "knowledge" | "inbox" | "elevator-pitch" | "chatbot" | "audience";
  title: string;
  subtitle: string;
  description: string;
  badgeText: string;
  targetLabel: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "stage1_overview",
    tab: "overview",
    title: "Reality Check & Validation Core",
    subtitle: "Stage 1 — Reality Check",
    description: "Track your startup's core validation score, market potential, and interest signals at a glance.",
    badgeText: "Step 1",
    targetLabel: "Project Overview Tab",
  },
  {
    id: "stage2_spotlight",
    tab: "blog",
    title: "Spotlight Engine & Landing Page",
    subtitle: "Stage 2 — High-Converting Pitch",
    description: "Build an interactive, high-converting product spotlight page to capture customer intent and interest signals.",
    badgeText: "Step 2",
    targetLabel: "Spotlight Editor Tab",
  },
  {
    id: "stage2_knowledge",
    tab: "knowledge",
    title: "AI Knowledge Base",
    subtitle: "Stage 2 — Customer Q&A Context",
    description: "Upload product specs, FAQs, and docs so the AI chatbot accurately answers visitor questions 24/7.",
    badgeText: "Step 3",
    targetLabel: "Knowledge Base Tab",
  },
  {
    id: "stage3_inbox",
    tab: "inbox",
    title: "Buyer Inbox & Engagement",
    subtitle: "Stage 3 — Audience Signals",
    description: "View visitor questions, respond directly, and qualify potential buyers expressing high interest.",
    badgeText: "Step 4",
    targetLabel: "Buyer Inbox Tab",
  },
  {
    id: "stage3_pilot",
    tab: "audience",
    title: "Pilot Cohort & Validated Buyers",
    subtitle: "Stage 3 — Path to 40 Buyers",
    description: "Manage your pilot cohort, track engagement scores (Gold, Silver, Bronze), and convert interest into buyers.",
    badgeText: "Step 5",
    targetLabel: "Pilot Cohort Tab",
  },
  {
    id: "stage3_insights",
    tab: "audience",
    title: "AI Insights & Confusion Points",
    subtitle: "Stage 3 — Data-Driven Iteration",
    description: "Analyze buyer personas, top confusion points, and AI-suggested pitch improvements based on real feedback.",
    badgeText: "Step 6",
    targetLabel: "Audience Insights Tab",
  },
];

interface GuidedProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab?: string;
  onSelectTab: (tab: "overview" | "blog" | "knowledge" | "inbox" | "elevator-pitch" | "chatbot" | "audience") => void;
  onOpenStage3?: () => void;
}

export default function GuidedProductTour({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenStage3,
}: GuidedProductTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const wasOpenRef = useRef(false);

  // When tour opens, initialize step index to match current tab once
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && currentTab) {
      const matchIdx = TOUR_STEPS.findIndex((s) => s.tab === currentTab);
      if (matchIdx !== -1) {
        setCurrentStepIndex(matchIdx);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, currentTab]);

  const step = TOUR_STEPS[currentStepIndex];

  // Auto-switch tabs only when user advances step to a different tab
  useEffect(() => {
    if (isOpen && step && currentTab !== step.tab) {
      onSelectTab(step.tab);
      if (step.id === "stage3_pilot" && onOpenStage3) {
        onOpenStage3();
      }
    }
  }, [isOpen, currentStepIndex, step?.tab]);

  if (!isOpen || !step) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed bottom-3 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 pointer-events-none max-w-[285px] xs:max-w-[300px] sm:max-w-[320px] w-auto sm:w-full mx-auto sm:mx-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto relative bg-white/95 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 border-2 border-cyan-400/70 shadow-[0_10px_35px_rgba(8,145,178,0.18)] text-slate-900 overflow-hidden"
          >
            {/* Top Cyan Laser Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            {/* Subtle Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Step Badge & Close */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9.5px] sm:text-[10px] font-extrabold tracking-wider text-[hsl(190,85%,35%)] bg-cyan-50/90 px-2 sm:px-2.5 py-0.5 rounded-full border border-cyan-200/80 flex items-center gap-1.5 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(190,85%,38%)]"></span>
                  </span>
                  STEP {currentStepIndex + 1} OF {TOUR_STEPS.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={onClose}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded transition-colors active:scale-95"
                  title="Skip tour"
                >
                  Skip
                </button>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-all border border-slate-200/80 active:scale-95"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Content: Heading & Description */}
            <div className="space-y-1 my-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-snug flex items-center gap-1">
                <span className="text-[hsl(190,85%,38%)] font-mono font-normal">//</span> {step.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>

            {/* Progress Line */}
            <div className="w-full bg-cyan-50 h-1 rounded-full overflow-hidden my-2 border border-cyan-100">
              <motion.div
                className="h-full bg-gradient-to-r from-[hsl(190,85%,38%)] to-cyan-400 rounded-full shadow-[0_0_8px_rgba(8,145,178,0.3)]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Footer Navigation Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handlePrev}
                disabled={isFirstStep}
                className="h-8 sm:h-8.5 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 !rounded-md rounded-md transition-colors flex items-center gap-1 active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                onClick={handleNext}
                className="h-8.5 sm:h-9 px-5 text-xs sm:text-[13px] font-bold bg-gradient-to-r from-[hsl(190,90%,40%)] to-cyan-500 text-white hover:opacity-95 shadow-[0_4px_14px_rgba(6,182,212,0.35)] !rounded-md rounded-md transition-all border border-cyan-300/40 flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
              >
                {isLastStep ? (
                  <>
                    Finish <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

