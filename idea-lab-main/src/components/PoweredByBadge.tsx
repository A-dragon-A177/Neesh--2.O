import { NeeshLogo } from "@/components/NeeshLogo";

interface PoweredByBadgeProps {
  /** If true, show the badge (for Free users) */
  show: boolean;
  /** Custom logo URL (for Pro users replacing Neesh branding) */
  customLogoUrl?: string;
  /** Custom branding text (for Pro users) */
  customBrandingText?: string;
}

const PoweredByBadge = ({ show, customLogoUrl, customBrandingText }: PoweredByBadgeProps) => {
  const handleBadgeClick = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "badge_click", {
        event_category: "backlink",
        event_label: "footer_badge",
      });
    }
  };

  // Pro users with custom branding
  if (!show && (customLogoUrl || customBrandingText)) {
    return (
      <div className="flex items-center justify-center gap-3 py-6 mt-8 border-t border-border/30">
        {customLogoUrl && (
          <img src={customLogoUrl} alt="Brand" className="h-8 object-contain" />
        )}
        {customBrandingText && (
          <span className="text-sm text-muted-foreground font-medium">{customBrandingText}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 py-6 mt-8 border-t border-border/30">
      <a
        href="https://neeshglobal.com"
        onClick={handleBadgeClick}
        data-analytics-event="badge_click"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-[#09daed]/50 text-foreground hover:border-[#09daed] text-xs md:text-sm font-bold transition-all shadow-sm"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#09daed] animate-pulse" />
        Validated on Neesh AI | Test Your Startup Idea Free &rarr;
      </a>
    </div>
  );
};

export default PoweredByBadge;
