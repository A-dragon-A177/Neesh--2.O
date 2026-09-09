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
        className="fixed inset-0 z-[9999] flex items-center justify-center outline-none"
        role="dialog"
        aria-modal="true"
        aria-label={`${projectTitle} is Concluded & Closed`}
      >
        {/* Backdrop: blurred + dimmed */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />

        {/* Floating card */}
        <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-card/95 border-2 border-slate-700/50 backdrop-blur-xl shadow-2xl">
          {/* Background ambient glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
            {/* Header Icon */}
            <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            {/* Title and message */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 bg-slate-800 px-3.5 py-1 rounded-full border border-slate-700">
                  Stage 3 Concluded · Permanently Archived
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {projectTitle} is Concluded & Closed
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed font-sans">
                The 200-hour Pilot MVP window for this project has officially ended. This project has completed its lifecycle on Neesh AI and is permanently archived in read-only mode. It cannot be reopened.
              </p>
            </div>

            {/* Audience Achievements Summary Card */}
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Audience Validation Results Achieved
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">Preserved</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Gold */}
                <div className="p-3 rounded-xl bg-card border border-border/40 text-center space-y-1">
                  <span className="text-xs font-bold text-foreground block">🥇 Gold Tier</span>
                  <span className="text-lg font-mono font-extrabold text-amber-500">
                    {goldCount} <span className="text-xs font-normal text-muted-foreground">buyers</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground">High-intent customers</p>
                </div>

                {/* Silver */}
                <div className="p-3 rounded-xl bg-card border border-border/40 text-center space-y-1">
                  <span className="text-xs font-bold text-foreground block">🥈 Silver Tier</span>
                  <span className="text-lg font-mono font-extrabold text-slate-400">
                    {silverCount} <span className="text-xs font-normal text-muted-foreground">members</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground">Qualified feedback</p>
                </div>

                {/* Bronze */}
                <div className="p-3 rounded-xl bg-card border border-border/40 text-center space-y-1">
                  <span className="text-xs font-bold text-foreground block">🥉 Bronze Tier</span>
                  <span className="text-lg font-mono font-extrabold text-amber-600">
                    {bronzeCount} <span className="text-xs font-normal text-muted-foreground">signups</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground">Early adopters</p>
                </div>
              </div>
            </div>

            {/* Permanent Archive Notice */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/50 flex items-center justify-between gap-4 text-left">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Read-Only Archive Mode
                </span>
                <p className="text-xs text-muted-foreground">
                  All feedback, blog sections, and audience questions remain accessible for reference.
                </p>
              </div>
              <div className="shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  Closed (No Re-open)
                </span>
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
      className="fixed inset-0 z-[9999] flex items-center justify-center outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${projectTitle} is Currently Locked`}
    >
      {/* Backdrop: blurred + dimmed */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />

      {/* Floating card */}
      <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-card/95 border-2 border-rose-500/30 backdrop-blur-xl shadow-2xl">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          {/* Header Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center shadow-inner">
            <Lock className="w-10 h-10 text-rose-500 animate-pulse" />
          </div>

          {/* Title and message */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                20-Hour Validation Sprint Concluded
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {projectTitle} is Currently Locked
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              The initial 20-hour validation sprint for this project has closed. To continue building, collecting feedback, and accessing AI insights, upgrade to Pro or unlock your project.
            </p>
          </div>

          {/* Audience Threshold Breakdown Card */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Stage 2 Audience Sprint Targets vs Acquired
              </span>
              <span className="text-[11px] text-muted-foreground">Required for auto-advance</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Gold */}
              <div className="p-3 rounded-xl bg-card border border-border/40 text-center space-y-1">
                <span className="text-xs font-bold text-foreground block">🥇 Gold Tier</span>
                <span className={`text-lg font-mono font-extrabold ${goldCount >= 5 ? "text-emerald-500" : "text-amber-500"}`}>
                  {goldCount} <span className="text-xs font-normal text-muted-foreground">/ 5</span>
                </span>
                <p className="text-[10px] text-muted-foreground">High-intent buyers</p>
              </div>

              {/* Silver */}
              <div className="p-3 rounded-xl bg-card border border-border/40 text-center space-y-1">
                <span className="text-xs font-bold text-foreground block">🥈 Silver Tier</span>
                <span className={`text-lg font-mono font-extrabold ${silverCount >= 10 ? "text-emerald-500" : "text-amber-500"}`}>
                  {silverCount} <span className="text-xs font-normal text-muted-foreground">/ 10</span>
                </span>
                <p className="text-[10px] text-muted-foreground">Qualified feedback</p>
              </div>

              {/* Bronze */}
              <div className="p-3 rounded-xl bg-card border border-border/40 text-center space-y-1">
                <span className="text-xs font-bold text-foreground block">🥉 Bronze Tier</span>
                <span className={`text-lg font-mono font-extrabold ${bronzeCount >= 15 ? "text-emerald-500" : "text-amber-500"}`}>
                  {bronzeCount} <span className="text-xs font-normal text-muted-foreground">/ 15</span>
                </span>
                <p className="text-[10px] text-muted-foreground">Interested signups</p>
              </div>
            </div>
          </div>

          {/* Free in Beta Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/30 flex items-center justify-between gap-4 text-left">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <BetaBadge variant="glow" type="beta" />
                <span className="text-sm font-bold text-foreground">Free during 2.0 Beta!</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All Pro upgrades and project unlocks are 100% free while Neesh AI is in Beta.
              </p>
            </div>
            <div className="shrink-0">
              <Button
                onClick={handleUnlockClick}
                disabled={isUnlocking}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold shadow-lg shadow-emerald-600/25 px-6 rounded-xl gap-2"
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
