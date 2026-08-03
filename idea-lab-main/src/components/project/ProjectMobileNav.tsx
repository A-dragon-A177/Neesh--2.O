import React from "react";
import {
  Sparkles,
  FileEdit,
  Inbox,
  Bot,
  MoreVertical,
  X,
  Clapperboard,
  Database,
  BarChart3,
  Check,
} from "lucide-react";

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
  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-bottom-nav md:hidden">
        {/* Primary Tabs */}
        {[
          { id: "overview", label: "Overview", icon: Sparkles },
          { id: "blog", label: "Editor", icon: FileEdit },
          { id: "inbox", label: "Inbox", icon: Inbox },
          { id: "chatbot", label: "Chatbot", icon: Bot },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={activeTab === item.id ? "active" : ""}
          >
            <item.icon className="nav-icon" />
            <span className="nav-label">{item.label}</span>
            {item.id === "inbox" && badgeCount > 0 && (
              <span className="nav-badge">{badgeCount > 9 ? "9+" : badgeCount}</span>
            )}
          </button>
        ))}
        {/* More Tab */}
        <button
          onClick={() => setIsMoreSheetOpen(true)}
          className={["elevator-pitch", "knowledge", "audience"].includes(activeTab) ? "active" : ""}
        >
          <MoreVertical className="nav-icon" />
          <span className="nav-label">More</span>
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
