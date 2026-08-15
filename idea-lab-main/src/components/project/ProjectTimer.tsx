import React, { useState, useEffect } from "react";
import { Clock, Lock, Sparkles, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectTimerProps {
  deadline?: string | null;
  createdAt?: string | null;
  status?: string;
  variant?: "header" | "compact" | "badge" | "card";
  goldCount?: number;
  silverCount?: number;
  bronzeCount?: number;
  className?: string;
  onTimerExpired?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(deadlineStr?: string | null, createdAtStr?: string | null): TimeRemaining {
  let targetTime: number;

  if (deadlineStr) {
    targetTime = new Date(deadlineStr).getTime();
  } else if (createdAtStr) {
    // Default to 5 days from createdAt
    targetTime = new Date(createdAtStr).getTime() + 5 * 24 * 60 * 60 * 1000;
  } else {
    // Fallback: 5 days from now
    targetTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
  }

  const now = Date.now();
  const diff = targetTime - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
    };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: Math.floor(diff / 1000),
    isExpired: false,
  };
}

export const ProjectTimer: React.FC<ProjectTimerProps> = ({
  deadline,
  createdAt,
  status,
  variant = "badge",
  goldCount = 0,
  silverCount = 0,
  bronzeCount = 0,
  className = "",
  onTimerExpired,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline, createdAt)
  );

  useEffect(() => {
    // Initial calculate
    const current = calculateTimeRemaining(deadline, createdAt);
    setTimeLeft(current);

    if (current.isExpired && onTimerExpired) {
      onTimerExpired();
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(deadline, createdAt);
      setTimeLeft(remaining);
      if (remaining.isExpired && onTimerExpired) {
        onTimerExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, createdAt]);

  const isLocked = status?.toUpperCase() === "LOCKED";
  const meetsRequirements = goldCount >= 5 && silverCount >= 10 && bronzeCount >= 15;

  // Determine urgency tier
  const isUrgent = !timeLeft.isExpired && timeLeft.days < 1;
  const isWarning = !timeLeft.isExpired && timeLeft.days >= 1 && timeLeft.days < 3;
  const isSafe = !timeLeft.isExpired && timeLeft.days >= 3;

  // Render for Locked state
  if (isLocked) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-sm ${className}`}
      >
        <Lock className="w-3.5 h-3.5" />
        <span>Validation Locked</span>
      </div>
    );
  }

  // Render for Expired state (but maybe meeting requirements)
  if (timeLeft.isExpired) {
    if (meetsRequirements) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Sprint Passed (5d)</span>
        </div>
      );
    }
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Sprint Completed</span>
      </div>
    );
  }

  // Format string
  const formattedTime = `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`;

  const tooltipContent = (
    <div className="space-y-2 p-1 text-xs max-w-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          5-Day Validation Sprint
        </span>
        <span className="text-primary font-bold">{formattedTime}</span>
      </div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Acquire verified stage 2 audiences before the timer ends to auto-qualify for Stage 3:
      </p>
      <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-medium">
        <div className={`p-1.5 rounded-lg border text-[10px] ${goldCount >= 5 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-muted/40 border-border/40 text-muted-foreground"}`}>
          <span className="block font-bold">🥇 Gold</span>
          <span>{goldCount}/5</span>
        </div>
        <div className={`p-1.5 rounded-lg border text-[10px] ${silverCount >= 10 ? "bg-slate-300/20 border-slate-400/30 text-slate-600 dark:text-slate-300" : "bg-muted/40 border-border/40 text-muted-foreground"}`}>
          <span className="block font-bold">🥈 Silver</span>
          <span>{silverCount}/10</span>
        </div>
        <div className={`p-1.5 rounded-lg border text-[10px] ${bronzeCount >= 15 ? "bg-amber-700/10 border-amber-700/30 text-amber-700 dark:text-amber-500" : "bg-muted/40 border-border/40 text-muted-foreground"}`}>
          <span className="block font-bold">🥉 Bronze</span>
          <span>{bronzeCount}/15</span>
        </div>
      </div>
      {isUrgent && (
        <p className="text-[10px] text-rose-500 font-semibold pt-1 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 shrink-0" />
          Less than 24 hours remaining!
        </p>
      )}
    </div>
  );

  // Variant: Header (sleek glowing pill with icon)
  if (variant === "header") {
    let colorClasses = "bg-emerald-50/90 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
    let dotClasses = "bg-emerald-500";

    if (isUrgent) {
      colorClasses = "bg-rose-50/90 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 shadow-[0_0_12px_rgba(244,63,94,0.2)] animate-pulse";
      dotClasses = "bg-rose-500";
    } else if (isWarning) {
      colorClasses = "bg-amber-50/90 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
      dotClasses = "bg-amber-500";
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:scale-105 select-none font-sans ${colorClasses} ${className}`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClasses}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClasses}`} />
            </span>
            <Clock className="w-3.5 h-3.5 shrink-0 text-current" />
            <span className="font-sans font-semibold tracking-normal tabular-nums text-xs">{formattedTime}</span>
            <span className="hidden sm:inline text-[11px] font-medium opacity-80">left</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="bg-popover/95 backdrop-blur-md border border-border/60 shadow-xl p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Variant: Compact (for dashboard grid cards)
  if (variant === "compact") {
    let bgClasses = "bg-emerald-50/90 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
    if (isUrgent) {
      bgClasses = "bg-rose-50/90 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 animate-pulse";
    } else if (isWarning) {
      bgClasses = "bg-amber-50/90 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border backdrop-blur-sm font-sans ${bgClasses} ${className}`}
          >
            <Clock className="w-3 h-3 text-current" />
            <span className="font-sans font-semibold tracking-normal tabular-nums">{formattedTime}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover/95 backdrop-blur-md border border-border/60 shadow-xl p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Default badge variant
  let badgeColor = "bg-emerald-50/90 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
  if (isUrgent) {
    badgeColor = "bg-rose-50/90 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60";
  } else if (isWarning) {
    badgeColor = "bg-amber-50/90 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border font-sans ${badgeColor} ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-current" />
      <span className="font-sans font-semibold tracking-normal tabular-nums">{formattedTime} remaining</span>
    </div>
  );
};

export default ProjectTimer;
