import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Lock, Sparkles, AlertTriangle, ShieldCheck, ArrowRight, Loader2, PartyPopper, CheckCircle2 } from "lucide-react";
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
  onUnlock: () => Promise<any>;
}

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
      await onUnlock();
      toast.success("🎉 Project unlocked! You now have a fresh validation cycle.");
    } catch (err) {
      toast.error("Failed to unlock project. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // If permanently CLOSED after 200h Stage 3 window
  if (isClosed) {
    return createPortal(
      <div
        ref={overlayRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 outline-none overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`${projectTitle} is Concluded & Closed`}
      >
        {/* Backdrop: blurred + dimmed */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />

        {/* Floating card */}
        <div className="relative z-10 w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-card/95 border-2 border-slate-700/50 backdrop-blur-xl shadow-2xl">
          {/* Background ambient glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

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
                The 200-hour Pilot MVP sprint for this project has closed. To continue testing prototypes, engaging your pilot cohort, and viewing AI validation reports, unlock a fresh 200-hour window below.
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
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-purple-600/25 px-6 py-2.5 rounded-xl gap-2 justify-center"
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Unlocking Stage 3...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Unlock Stage 3 Window (200h) ⚡</span>
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

  // Otherwise: 20-Hour Sprint LOCKED state (Can unlock via Pro)
  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 outline-none overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`${projectTitle} is Currently Locked`}
    >
      {/* Backdrop: blurred + dimmed */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />

      {/* Floating card */}
      <div className="relative z-10 w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-card/95 border-2 border-rose-500/30 backdrop-blur-xl shadow-2xl">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          {/* Header Icon */}
          <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 animate-pulse" />
          </div>

          {/* Title and message */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                20-Hour Validation Sprint Concluded
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-display font-bold text-foreground">
              {projectTitle} is Currently Locked
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              The initial 20-hour validation sprint for this project has closed. To continue building, collecting feedback, and accessing AI insights, upgrade to Pro or unlock your project.
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
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold shadow-lg shadow-emerald-600/25 px-6 py-2.5 rounded-xl gap-2 justify-center"
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Unlock Project Now ⚡</span>
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
