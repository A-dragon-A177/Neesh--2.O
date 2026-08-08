import React from "react";
import {
  X,
  Clapperboard,
  Database,
  BarChart3,
  Check,
} from "lucide-react";

/* ──────── Custom Premium SVG Icons ──────── */

const OverviewIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="overview-grad" x1="4" y1="4" x2="20" y2="20">
        <stop offset="0%" stopColor={active ? "#f59e0b" : "currentColor"} />
        <stop offset="100%" stopColor={active ? "#ef4444" : "currentColor"} />
      </linearGradient>
    </defs>
    {/* Dashboard grid with sparkle */}
    <rect x="3" y="3" width="8" height="8" rx="2" stroke="url(#overview-grad)" strokeWidth="1.8" fill={active ? "url(#overview-grad)" : "none"} fillOpacity={active ? 0.15 : 0} />
    <rect x="13" y="3" width="8" height="5" rx="2" stroke="url(#overview-grad)" strokeWidth="1.8" fill={active ? "url(#overview-grad)" : "none"} fillOpacity={active ? 0.15 : 0} />
    <rect x="13" y="10" width="8" height="11" rx="2" stroke="url(#overview-grad)" strokeWidth="1.8" fill={active ? "url(#overview-grad)" : "none"} fillOpacity={active ? 0.15 : 0} />
    <rect x="3" y="13" width="8" height="8" rx="2" stroke="url(#overview-grad)" strokeWidth="1.8" fill={active ? "url(#overview-grad)" : "none"} fillOpacity={active ? 0.15 : 0} />
    {/* Sparkle accent */}
    <circle cx="7" cy="7" r="1.2" fill={active ? "#f59e0b" : "none"} opacity={active ? 1 : 0}>
      {active && <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />}
    </circle>
  </svg>
);

const EditorIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="editor-grad" x1="3" y1="3" x2="21" y2="21">
        <stop offset="0%" stopColor={active ? "#6366f1" : "currentColor"} />
        <stop offset="100%" stopColor={active ? "#8b5cf6" : "currentColor"} />
      </linearGradient>
    </defs>
    {/* Document shape */}
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="url(#editor-grad)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "url(#editor-grad)" : "none"}
      fillOpacity={active ? 0.12 : 0}
    />
    <polyline
      points="14,2 14,8 20,8"
      stroke="url(#editor-grad)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Text lines */}
    <line x1="8" y1="13" x2="16" y2="13" stroke="url(#editor-grad)" strokeWidth="1.6" strokeLinecap="round" opacity={active ? 1 : 0.7} />
    <line x1="8" y1="17" x2="13" y2="17" stroke="url(#editor-grad)" strokeWidth="1.6" strokeLinecap="round" opacity={active ? 1 : 0.7} />
  </svg>
);

const InboxIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="inbox-grad" x1="2" y1="4" x2="22" y2="20">
        <stop offset="0%" stopColor={active ? "#06b6d4" : "currentColor"} />
        <stop offset="100%" stopColor={active ? "#0ea5e9" : "currentColor"} />
      </linearGradient>
    </defs>
    {/* Envelope body */}
    <path
      d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
      stroke="url(#inbox-grad)"
      strokeWidth="1.8"
      fill={active ? "url(#inbox-grad)" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    {/* Envelope flap */}
    <polyline
      points="2,6 12,13 22,6"
      stroke="url(#inbox-grad)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const ChatbotIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chatbot-grad" x1="3" y1="3" x2="21" y2="21">
        <stop offset="0%" stopColor={active ? "#10b981" : "currentColor"} />
        <stop offset="100%" stopColor={active ? "#34d399" : "currentColor"} />
      </linearGradient>
    </defs>
    {/* Chat bubble body */}
    <path
      d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
      stroke="url(#chatbot-grad)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "url(#chatbot-grad)" : "none"}
      fillOpacity={active ? 0.12 : 0}
    />
    {/* Bot eyes */}
    <circle cx="9.5" cy="11" r="1.2" fill={active ? "#10b981" : "currentColor"} opacity={active ? 1 : 0.6} />
    <circle cx="14.5" cy="11" r="1.2" fill={active ? "#10b981" : "currentColor"} opacity={active ? 1 : 0.6} />
    {/* Bot smile */}
    <path d="M10 14.5a4.5 4.5 0 004 0" stroke={active ? "#10b981" : "currentColor"} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity={active ? 1 : 0.5} />
  </svg>
);

const MoreIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="more-grad" x1="4" y1="6" x2="20" y2="18">
        <stop offset="0%" stopColor={active ? "#f97316" : "currentColor"} />
        <stop offset="100%" stopColor={active ? "#fb923c" : "currentColor"} />
      </linearGradient>
    </defs>
    {/* Three dots in a grid pattern */}
    <circle cx="12" cy="6" r="1.8" fill="url(#more-grad)" />
    <circle cx="12" cy="12" r="1.8" fill="url(#more-grad)" />
    <circle cx="12" cy="18" r="1.8" fill="url(#more-grad)" />
  </svg>
);

/* ──────── Component ──────── */

interface ProjectMobileNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  badgeCount: number;
  isMoreSheetOpen: boolean;
  setIsMoreSheetOpen: (open: boolean) => void;
}

export default function ProjectMobileNav({
  activeTab,
  setActiveTab,
  badgeCount,
  isMoreSheetOpen,
  setIsMoreSheetOpen,
}: ProjectMobileNavProps) {
  const tabs = [
    { id: "overview", label: "Overview", Icon: OverviewIcon },
    { id: "blog", label: "Editor", Icon: EditorIcon },
    { id: "inbox", label: "Inbox", Icon: InboxIcon },
    { id: "chatbot", label: "Chatbot", Icon: ChatbotIcon },
  ];

  const isMoreActive = ["elevator-pitch", "knowledge", "audience"].includes(activeTab);

  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-bottom-nav md:hidden">
        {/* Primary Tabs */}
        {tabs.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={isActive ? "active" : ""}
            >
              <item.Icon active={isActive} />
              <span className="nav-label">{item.label}</span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="active-dot" />
              )}
              {item.id === "inbox" && badgeCount > 0 && (
                <span className="nav-badge">{badgeCount > 9 ? "9+" : badgeCount}</span>
              )}
            </button>
          );
        })}
        {/* More Tab */}
        <button
          onClick={() => setIsMoreSheetOpen(true)}
          className={isMoreActive ? "active" : ""}
        >
          <MoreIcon active={isMoreActive} />
          <span className="nav-label">More</span>
          {isMoreActive && (
            <span className="active-dot" />
          )}
        </button>
      </nav>

      {/* Mobile More Sheet */}
      {isMoreSheetOpen && (
        <div className="md:hidden">
          <div
            className="mobile-sheet-backdrop open"
            onClick={() => setIsMoreSheetOpen(false)}
          />
          <div className="mobile-sheet open p-6">
            <div className="mobile-sheet-handle" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">More Actions</h3>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center animate-fade"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: "elevator-pitch",
                  label: "Elevator Pitch",
                  desc: "Upload and manage video pitch",
                  icon: Clapperboard,
                },
                {
                  id: "knowledge",
                  label: "Train your ChatBot",
                  desc: "Upload training documents",
                  icon: Database,
                },
                {
                  id: "audience",
                  label: "Audience Insights",
                  desc: "View detailed metrics & reports",
                  icon: BarChart3,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isActive = activeTab === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setActiveTab(opt.id);
                      setIsMoreSheetOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left font-medium transition-all active:scale-[0.98] ${
                      isActive
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/50 bg-card text-foreground"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? "bg-primary/25 text-primary" : "bg-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{opt.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{opt.desc}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
