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
    title: "Step 1: Reality Check & Validation Core",
    subtitle: "Stage 1 — Reality Check",
    description: "Track your startup's core validation score, market potential, and interest signals at a glance.",
    badgeText: "Step 1",
    targetLabel: "Project Overview Tab",
  },
  {
    id: "stage2_spotlight",
    tab: "blog",
    title: "Step 2: Spotlight Engine & Landing Page",
    subtitle: "Stage 2 — High-Converting Pitch",
    description: "Build an interactive, high-converting product spotlight page to capture customer intent and interest signals.",
    badgeText: "Step 2",
    targetLabel: "Spotlight Editor Tab",
  },
  {
    id: "stage2_knowledge",
    tab: "knowledge",
    title: "Step 3: AI Knowledge Base",
    subtitle: "Stage 2 — Customer Q&A Context",
    description: "Upload product specs, FAQs, and docs so the AI chatbot accurately answers visitor questions 24/7.",
    badgeText: "Step 3",
    targetLabel: "Knowledge Base Tab",
  },
  {
    id: "stage3_inbox",
    tab: "inbox",
    title: "Step 4: Buyer Inbox & Engagement",
    subtitle: "Stage 3 — Audience Signals",
    description: "View visitor questions, respond directly, and qualify potential buyers expressing high interest.",
    badgeText: "Step 4",
    targetLabel: "Buyer Inbox Tab",
  },
  {
    id: "stage3_pilot",
    tab: "audience",
    title: "Step 5: Pilot Cohort & Validated Buyers",
    subtitle: "Stage 3 — Path to 40 Buyers",
    description: "Manage your pilot cohort, track engagement scores (Gold, Silver, Bronze), and convert interest into buyers.",
    badgeText: "Step 5",
    targetLabel: "Pilot Cohort Tab",
  },
  {
    id: "stage3_insights",
    tab: "audience",
    title: "Step 6: AI Insights & Confusion Points",
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
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:bottom-6 sm:right-6 md:right-8 z-50 sm:max-w-md pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 25 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto relative bg-white/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(8,145,178,0.2)] border-2 border-[hsl(190,85%,38%)]/60 overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-400/15 via-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Integrated Top Focus Target Banner (Cleanly aligned inside card) */}
            <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[hsl(190,85%,38%)]/10 to-cyan-500/10 border border-[hsl(190,85%,38%)]/20 px-3 py-1.5 rounded-2xl mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[hsl(190,85%,38%)] truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(190,85%,38%)]"></span>
                </span>
                <MoveUpLeft className="w-3.5 h-3.5 shrink-0 animate-bounce text-[hsl(190,85%,38%)]" />
                <span className="truncate">Focus: {step.targetLabel}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                Step {currentStepIndex + 1} of {TOUR_STEPS.length}
              </span>
            </div>

            {/* Header Controls: Stage Badge & Close/Skip */}
            <div className="flex items-center justify-between gap-2 border-b border-cyan-100/60 pb-3 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200/60 text-[hsl(190,85%,38%)] text-[11px] font-bold">
                <Compass className="w-3 h-3 text-[hsl(190,85%,38%)]" />
                {step.badgeText}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                  title="Skip Tour"
                >
                  Skip
                </Button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  title="Close Tour"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Step Body Content */}
            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-900 leading-snug">{step.title}</h3>
                <p className="text-[11px] font-bold text-[hsl(190,85%,38%)]">{step.subtitle}</p>
              </div>

              <div className="bg-cyan-50/40 border border-cyan-100/60 rounded-2xl p-3 sm:p-3.5">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{step.description}</p>
              </div>
            </div>

            {/* Step Indicators dots */}
            <div className="flex items-center justify-center gap-1.5 my-3.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? "w-6 bg-[hsl(190,85%,38%)]"
                      : "w-1.5 bg-slate-200 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>

            {/* Tour Controls Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-cyan-100/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className="rounded-xl text-xs gap-1 border-slate-200 h-8 text-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
                className="rounded-xl text-xs font-semibold bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] text-white hover:opacity-95 shadow-md shadow-cyan-500/20 gap-1 px-4 h-8"
              >
                {isLastStep ? (
                  <>
                    Finish Tour <Check className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Next Step <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
