import { Crown, Gem, Medal, Mail, Briefcase, Sparkles, Clock, CheckCircle, HelpCircle } from "lucide-react";
import type { ValidatedBuyer } from "@/hooks/useValidatedBuyers";

interface ValidatedBuyersListProps {
  buyers: ValidatedBuyer[];
  earlyAccessPrice?: number | null;
  compact?: boolean;
}

const tierConfig = {
  GOLD: {
    label: "Gold Buyer",
    icon: Crown,
    bgColor: "bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 dark:from-amber-950/40 dark:to-yellow-950/30",
    borderColor: "border-amber-400/90 dark:border-amber-500/70",
    textColor: "text-amber-900 dark:text-amber-200 font-extrabold",
    iconBg: "bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white shadow-[0_0_16px_rgba(245,158,11,0.5)] border border-amber-300",
    badgeBg: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black border border-amber-300 shadow-sm font-display",
    glowShadow: "shadow-[0_4px_25px_rgba(245,158,11,0.25)]",
    description: "Priority #1 intent or highly engaged validated buyer.",
  },
  SILVER: {
    label: "Silver Lead",
    icon: Gem,
    bgColor: "bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/40",
    borderColor: "border-slate-400/80 dark:border-slate-600",
    textColor: "text-slate-900 dark:text-slate-200 font-extrabold",
    iconBg: "bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white shadow-[0_0_14px_rgba(148,163,184,0.4)] border border-slate-300",
    badgeBg: "bg-gradient-to-r from-slate-700 to-slate-900 text-white font-extrabold border border-slate-600 shadow-sm font-sans",
    glowShadow: "shadow-[0_4px_20px_rgba(148,163,184,0.22)]",
    description: "Moderate priority tag or active engagement lead.",
  },
  BRONZE: {
    label: "Bronze Lead",
    icon: Medal,
    bgColor: "bg-gradient-to-r from-orange-500/15 via-amber-600/15 to-orange-500/15 dark:from-orange-950/40 dark:to-amber-950/30",
    borderColor: "border-orange-400/90 dark:border-orange-600/70",
    textColor: "text-orange-950 dark:text-orange-200 font-extrabold",
    iconBg: "bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700 text-white shadow-[0_0_14px_rgba(234,88,12,0.4)] border border-orange-300",
    badgeBg: "bg-gradient-to-r from-orange-600 via-amber-700 to-orange-700 text-white font-extrabold border border-orange-400 shadow-sm font-sans",
    glowShadow: "shadow-[0_4px_20px_rgba(234,88,12,0.22)]",
    description: "Validated buyer with interest tag intent.",
  },
};

const ValidatedBuyersList = ({ buyers, earlyAccessPrice, compact = false }: ValidatedBuyersListProps) => {
  if (buyers.length === 0) {
    return (
      <div className="text-center py-10 px-4 border border-dashed border-gray-200 rounded-2xl bg-slate-50/20 font-sans">
        <Sparkles className="w-8 h-8 text-cyan-500 mx-auto mb-2 animate-pulse" />
        <p className="text-sm font-bold text-slate-700 font-display">No validated buyers yet</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-sans">
          Share your Spotlight link to collect customer interest and engagement signals.
        </p>
      </div>
    );
  }

  // Sort by tier priority: Gold -> Bronze -> Silver
  const sorted = [...buyers].sort((a, b) => {
    const order = { GOLD: 0, BRONZE: 1, SILVER: 2 };
    return (order[a.validationTier] ?? 3) - (order[b.validationTier] ?? 3);
  });

  const price = earlyAccessPrice ?? 49;

  return (
    <div className="space-y-3 font-sans">
      {sorted.map((buyer) => {
        const tier = tierConfig[buyer.validationTier];
        if (!tier) return null;
        const TierIcon = tier.icon;

        return (
          <div
            key={buyer.id}
            className={`w-full border-2 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] ${tier.bgColor} ${tier.borderColor} ${tier.glowShadow} flex flex-col md:flex-row md:items-center justify-between gap-4`}
          >
            {/* Left: User Avatar Icon & Core details */}
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tier.iconBg}`}>
                <TierIcon className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate font-display">
                    {buyer.name}
                  </h4>
                  <span className={`text-[10px] font-extrabold px-3 py-0.5 rounded-full ${tier.badgeBg}`}>
                    {tier.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-gray-400 font-sans">
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    {buyer.email}
                  </span>
                  {buyer.occupation && (
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      {buyer.occupation}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Interaction Details & Metrics */}
            <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-200/50 md:justify-end">
              {/* Interest Tag Status */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Selected Interest</span>
                {buyer.interestTagLabel ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    {buyer.interestTagLabel}
                    {buyer.interestTagPriority && (
                      <span className="text-[9px] opacity-75 font-mono">#{buyer.interestTagPriority}</span>
                    )}
                  </div>
                ) : buyer.interestOtherText ? (
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md truncate max-w-[160px]" title={buyer.interestOtherText}>
                    Other: {buyer.interestOtherText}
                  </div>
                ) : buyer.hasExplicitIntent ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    Interested
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                    <HelpCircle className="w-4 h-4" />
                    No tag selected
                  </div>
                )}
              </div>

              {/* Engagement Score */}
              <div className="flex flex-col gap-1 min-w-[100px]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Engagement</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, buyer.engagementScore || 0)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {buyer.engagementScore || 0} pts
                  </span>
                </div>
              </div>

              {/* Last interaction date */}
              {buyer.lastInteractionAt && (
                <div className="flex flex-col gap-1 text-right min-w-[110px]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Last Active</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center md:justify-end gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(buyer.lastInteractionAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ValidatedBuyersList;
export { tierConfig };
