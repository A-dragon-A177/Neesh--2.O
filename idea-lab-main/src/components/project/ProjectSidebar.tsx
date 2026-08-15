import React from "react";
import { Link } from "react-router-dom";
import { NeeshLogo } from "@/components/NeeshLogo";
import {
  PanelLeft,
  PanelLeftClose,
  Database,
  ChevronLeft,
  Sparkles,
  FileEdit,
  Clapperboard,
  Inbox,
  Bot,
  BarChart3,
} from "lucide-react";

const sidebarItems = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "blog", label: "Spotlight Editor", icon: FileEdit },
  { id: "elevator-pitch", label: "Elevator Pitch", icon: Clapperboard },
  { id: "inbox", label: "Audience Inbox", icon: Inbox },
  { id: "chatbot", label: "Chatbot", icon: Bot },
  { id: "knowledge", label: "Train your ChatBot", icon: Database },
  { id: "audience", label: "Audience Insights", icon: BarChart3 },
];

interface ProjectSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  projectTitle: string;
  badgeCount: number;
}

export default function ProjectSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  activeTab,
  setActiveTab,
  projectTitle,
  badgeCount,
}: ProjectSidebarProps) {
  return (
    <aside
      className={`hidden md:flex ${
        sidebarCollapsed ? "w-16" : "w-72"
      } bg-card border-r border-border/50 flex-col shadow-sm transition-all duration-300 h-screen sticky top-0`}
    >
      {/* Header */}
      <div className="p-5 border-b border-border/50 flex items-center justify-between flex-shrink-0">
        {!sidebarCollapsed && (
          <Link to="/dashboard">
            <NeeshLogo size="sm" />
          </Link>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-9 h-9 bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-6 h-6" />
          ) : (
            <PanelLeftClose className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Project Info */}
      {!sidebarCollapsed && (
        <div className="p-5 border-b border-border/50 flex-shrink-0">
          <h2 className="font-display font-semibold text-lg mb-2">Project Workspace</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <span className="truncate">{projectTitle}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
              activeTab === item.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="w-6 h-6 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="text-sm font-medium">{item.label}</span>
                {item.id === "inbox" && badgeCount > 0 && (
                  <span
                    className={`ml-auto text-xs font-semibold px-2.5 py-1 ${
                      activeTab === item.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Back to Dashboard */}
      <div className="p-4 border-t border-border/50 flex-shrink-0 mt-auto">
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ${
            sidebarCollapsed ? "justify-center px-2" : ""
          }`}
          title={sidebarCollapsed ? "Back to Dashboard" : undefined}
        >
          <ChevronLeft className="w-6 h-6 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Back to Dashboard</span>}
        </Link>
      </div>
    </aside>
  );
}
