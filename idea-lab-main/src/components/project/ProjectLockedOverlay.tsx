import React, { useState } from "react";
import { Lock, Sparkles, AlertTriangle, ShieldCheck, ArrowRight, Loader2, PartyPopper, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/BetaBadge";
import { toast } from "sonner";

interface ProjectLockedOverlayProps {
  projectId: string;
  projectTitle: string;
  goldCount?: number;
  silverCount?: number;
  bronzeCount?: number;
  onUnlock: () => Promise<any>;
}

export const ProjectLockedOverlay: React.FC<ProjectLockedOverlayProps> = ({
  projectId,
  projectTitle,
  goldCount = 0,
  silverCount = 0,
  bronzeCount = 0,
  onUnlock,
}) => {
  const [isUnlocking, setIsUnlocking] = useState(false);

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

  return (
    <div className="relative w-full my-6 p-6 sm:p-8 rounded-3xl bg-card/95 border-2 border-rose-500/30 backdrop-blur-xl shadow-2xl overflow-hidden">
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
              5-Day Validation Sprint Concluded
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            {projectTitle} is Currently Locked
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            The initial 5-day validation sprint for this project has closed. To continue building, collecting feedback, and accessing AI insights, upgrade to Pro or unlock your project.
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
  );
};

export default ProjectLockedOverlay;
