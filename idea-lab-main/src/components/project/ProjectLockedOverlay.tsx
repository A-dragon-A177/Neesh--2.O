import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Lock, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Plus, 
  Minus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/BetaBadge";
import { toast } from "sonner";

interface ProjectLockedOverlayProps {
  projectId: string;
  projectTitle: string;
  isClosed?: boolean;
  goldCount?: number;
  silverCount?: number;
  bronzeCount?: number;
  onUnlock: (days?: number) => Promise<any>;
}

interface DurationSelectorProps {
  days: number;
  onChange: (days: number) => void;
  stage: 2 | 3;
}

const DurationSelector: React.FC<DurationSelectorProps> = ({ days, onChange, stage }) => {
  const isStage3 = stage === 3;
  const defaultDays = isStage3 ? 5 : 2;
  const accentBorder = isStage3 ? "border-purple-500/30" : "border-emerald-500/30";
  const accentBg = isStage3 ? "bg-purple-500/5" : "bg-emerald-500/5";
  const activePill = isStage3 
    ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/30 font-bold"
    : "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30 font-bold";

  const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const formattedDate = targetDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDecrement = () => {
    onChange(Math.max(1, days - 1));
  };

  const handleIncrement = () => {
    onChange(Math.min(365, days + 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      onChange(Math.max(1, Math.min(365, val)));
    }
  };

  return (
    <div className={`p-3.5 sm:p-5 rounded-2xl border ${accentBorder} ${accentBg} text-left space-y-3.5`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isStage3 ? "text-purple-400" : "text-emerald-500"}`} />
          <span className="text-xs sm:text-sm font-bold text-foreground">
            Select Unlock Duration
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-sans">
          Timer runs for <strong>{days} day{days > 1 ? "s" : ""}</strong> ({days * 24} hours)
        </span>
      </div>

      {/* Stepper + Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-0.5">
        <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 bg-card/90 border border-border/70 p-1 rounded-xl shadow-xs">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={days <= 1}
            aria-label="Decrease days"
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center justify-center gap-1 px-2 font-mono">
            <input
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={handleInputChange}
              className="w-12 text-center font-bold text-base bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded p-0 text-foreground"
            />
            <span className="text-xs text-muted-foreground font-sans font-medium">
              {days === 1 ? "Day" : "Days"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={days >= 365}
            aria-label="Increase days"
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preset options */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onChange(defaultDays)}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border cursor-pointer ${
              days === defaultDays
                ? activePill
                : "bg-card/70 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {defaultDays}d (Standard)
          </button>

          <button
            type="button"
            onClick={() => onChange(7)}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border cursor-pointer ${
              days === 7
                ? activePill
                : "bg-card/70 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            7 Days
          </button>

          <button
            type="button"
            onClick={() => onChange(14)}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border cursor-pointer ${
              days === 14
                ? activePill
                : "bg-card/70 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            14 Days
          </button>

          {/* 1 Month (30 Days) Preset Button */}
          <button
            type="button"
            onClick={() => onChange(30)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all border flex items-center gap-1.5 cursor-pointer ${
              days === 30
                ? activePill
                : isStage3
                ? "bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-900/40 font-semibold"
                : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40 font-semibold"
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span>1 Month (30d)</span>
          </button>
        </div>
      </div>

      {/* Target Closes-At Preview Banner */}
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-lg border border-border/40 font-sans">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span>
          Project unlocks immediately and closes on: <strong className="text-foreground">{formattedDate}</strong>
        </span>
      </div>
    </div>
  );
};

export const ProjectLockedOverlay: React.FC<ProjectLockedOverlayProps> = ({
  projectId,
  projectTitle,
  isClosed = false,
  goldCount = 0,
  silverCount = 0,
  bronzeCount = 0,
  onUnlock,
}) => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  // Default to 5 days for Stage 3, 2 days for Stage 2
  const [selectedDays, setSelectedDays] = useState<number>(isClosed ? 5 : 2);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when overlay is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Auto-focus the overlay container on mount for keyboard trap
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  // Keyboard trap: prevent Tab from escaping the modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Don't allow escape to dismiss — project must stay locked
      e.preventDefault();
      return;
    }
    if (e.key === "Tab") {
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, []);

  const handleUnlockClick = async () => {
    setIsUnlocking(true);
    try {
      await onUnlock(selectedDays);
    } catch (err) {
      toast.error("Failed to unlock project. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // If permanently CLOSED after Stage 3 window
  if (isClosed) {
    return createPortal(
      <div
        ref={overlayRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 outline-none overflow-y-auto overflow-x-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`${projectTitle} is Concluded & Closed`}
      >
        {/* Backdrop: blurred + dimmed */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />

        {/* Floating card */}
        <div className="relative z-10 w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-card/95 border-2 border-slate-700/50 backdrop-blur-xl shadow-2xl">
          {/* Background ambient glow */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl pointer-events-none">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-slate-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
            {/* Header Icon */}
            <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
            </div>

            {/* Title and message */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-950/60 px-3.5 py-1 rounded-full border border-purple-800">
                  Stage 3 Concluded · Pilot MVP Locked
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-display font-bold text-foreground">
                {projectTitle} Stage 3 is Currently Locked
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed font-sans">
                The Stage 3 Pilot MVP sprint for this project has closed. Select how many days you would like to unlock your project to resume prototype testing and engaging your pilot cohort.
              </p>
            </div>

            {/* Audience Achievements Summary Card */}
            <div className="p-3.5 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  Audience Validation Results Achieved
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">Preserved</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Gold */}
                <div className="p-2 sm:p-3 rounded-xl bg-card border border-border/40 text-center space-y-1 min-w-0">
                  <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">🥇 Gold Tier</span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-amber-500">
                    {goldCount} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">buyers</span>
                  </span>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">High-intent customers</p>
                </div>

                {/* Silver */}
                <div className="p-2 sm:p-3 rounded-xl bg-card border border-border/40 text-center space-y-1 min-w-0">
                  <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">🥈 Silver Tier</span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-slate-400">
                    {silverCount} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">members</span>
                  </span>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Qualified feedback</p>
                </div>

                {/* Bronze */}
                <div className="p-2 sm:p-3 rounded-xl bg-card border border-border/40 text-center space-y-1 min-w-0">
                  <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">🥉 Bronze Tier</span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-amber-600">
                    {bronzeCount} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">signups</span>
                  </span>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Early adopters</p>
                </div>
              </div>
            </div>

            {/* Duration Selector for Stage 3 */}
            <DurationSelector
              days={selectedDays}
              onChange={setSelectedDays}
              stage={3}
            />

            {/* Free in Beta Banner for Stage 3 Unlock */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1 w-full sm:w-auto">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <BetaBadge variant="glow" type="beta" />
                  <span className="text-sm font-bold text-foreground">Free during 2.0 Beta!</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All Pro upgrades and project unlocks are 100% free while Neesh AI is in Beta.
                </p>
              </div>
              <div className="w-full sm:w-auto shrink-0">
                <Button
                  type="button"
                  onClick={handleUnlockClick}
                  disabled={isUnlocking}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-purple-600/25 px-6 py-2.5 rounded-xl gap-2 justify-center cursor-pointer"
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Unlocking Stage 3...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        Unlock Stage 3 for {selectedDays} {selectedDays === 1 ? "Day" : "Days"} ⚡
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Otherwise: Stage 2 Sprint LOCKED state (Can unlock via Pro with custom days)
  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 outline-none overflow-y-auto overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${projectTitle} is Currently Locked`}
    >
      {/* Backdrop: blurred + dimmed */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />

      {/* Floating card */}
      <div className="relative z-10 w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-card/95 border-2 border-rose-500/30 backdrop-blur-xl shadow-2xl">
        {/* Background ambient glow */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          {/* Header Icon */}
          <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 animate-pulse" />
          </div>

          {/* Title and message */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Stage 2 Validation Sprint Concluded
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-display font-bold text-foreground">
              {projectTitle} is Currently Locked
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              The initial validation sprint for this project has closed. Choose how many days you need to reopen your project, collect additional feedback, and access AI insights.
            </p>
          </div>

          {/* Audience Threshold Breakdown Card */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 text-left space-y-3">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Stage 2 Audience Sprint Targets vs Acquired
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">Required for auto-advance</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Gold */}
              <div className="p-2 sm:p-3 rounded-xl bg-card border border-border/40 text-center space-y-1 min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">🥇 Gold Tier</span>
                <span className={`text-base sm:text-lg font-mono font-extrabold ${goldCount >= 5 ? "text-emerald-500" : "text-amber-500"}`}>
                  {goldCount} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">/ 5</span>
                </span>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">High-intent buyers</p>
              </div>

              {/* Silver */}
              <div className="p-2 sm:p-3 rounded-xl bg-card border border-border/40 text-center space-y-1 min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">🥈 Silver Tier</span>
                <span className={`text-base sm:text-lg font-mono font-extrabold ${silverCount >= 10 ? "text-emerald-500" : "text-amber-500"}`}>
                  {silverCount} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">/ 10</span>
                </span>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Qualified feedback</p>
              </div>

              {/* Bronze */}
              <div className="p-2 sm:p-3 rounded-xl bg-card border border-border/40 text-center space-y-1 min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">🥉 Bronze Tier</span>
                <span className={`text-base sm:text-lg font-mono font-extrabold ${bronzeCount >= 15 ? "text-emerald-500" : "text-amber-500"}`}>
                  {bronzeCount} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">/ 15</span>
                </span>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Interested signups</p>
              </div>
            </div>
          </div>

          {/* Duration Selector for Stage 2 */}
          <DurationSelector
            days={selectedDays}
            onChange={setSelectedDays}
            stage={2}
          />

          {/* Free in Beta Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1 w-full sm:w-auto">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <BetaBadge variant="glow" type="beta" />
                <span className="text-sm font-bold text-foreground">Free during 2.0 Beta!</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All Pro upgrades and project unlocks are 100% free while Neesh AI is in Beta.
              </p>
            </div>
            <div className="w-full sm:w-auto shrink-0">
              <Button
                type="button"
                onClick={handleUnlockClick}
                disabled={isUnlocking}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold shadow-lg shadow-emerald-600/25 px-6 py-2.5 rounded-xl gap-2 justify-center cursor-pointer"
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Unlock for {selectedDays} {selectedDays === 1 ? "Day" : "Days"} ⚡
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProjectLockedOverlay;
