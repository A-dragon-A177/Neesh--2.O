import { useState, useRef, useEffect } from "react";
import { useNotifications, type AppNotification, type NotificationType } from "@/contexts/NotificationContext";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  MessageSquare,
  X,
  Trash2,
  CheckCheck,
  ChevronDown,
} from "lucide-react";
import newLogo from "@/assets/new-logo.png";

// ─── Time formatting ───
const timeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// ─── Icon & color mapping ───
const typeConfig: Record<NotificationType, {
  icon: React.ElementType;
  color: string;
  bgRing: string;
  label: string;
}> = {
  success: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bgRing: "bg-emerald-500/10 ring-emerald-500/20",
    label: "Success",
  },
  error: {
    icon: XCircle,
    color: "text-rose-400",
    bgRing: "bg-rose-500/10 ring-rose-500/20",
    label: "Error",
  },
  info: {
    icon: Info,
    color: "text-cyan-400",
    bgRing: "bg-cyan-500/10 ring-cyan-500/20",
    label: "Info",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bgRing: "bg-amber-500/10 ring-amber-500/20",
    label: "Warning",
  },
  message: {
    icon: MessageSquare,
    color: "text-sky-400",
    bgRing: "bg-sky-500/10 ring-sky-500/20",
    label: "Message",
  },
};

// ─── Filter tabs ───
type FilterTab = "all" | "success" | "error" | "info" | "warning";

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, setIsOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, setIsOpen]);

  const filteredNotifications = activeFilter === "all"
    ? notifications
    : notifications.filter((n) => n.type === activeFilter);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: notifications.length },
    { key: "success", label: "Success", count: notifications.filter((n) => n.type === "success").length },
    { key: "error", label: "Errors", count: notifications.filter((n) => n.type === "error").length },
    { key: "info", label: "Info", count: notifications.filter((n) => n.type === "info").length },
    { key: "warning", label: "Alerts", count: notifications.filter((n) => n.type === "warning").length },
  ];

  return (
    <>
      {/* ─── Floating Bell Button ─── */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9998] group"
        aria-label="Open notification center"
        id="neesh-notification-bell"
      >
        <div className="relative flex items-center justify-center w-14 h-14 rounded-full 
          bg-gradient-to-br from-[#09daed] to-[#0bb8c7] shadow-lg shadow-cyan-500/30
          hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105
          active:scale-95 transition-all duration-200 ease-out">
          <Bell className="w-6 h-6 text-white" strokeWidth={2} />
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] 
              px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold
              ring-2 ring-white dark:ring-gray-900 animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        
        {/* Pulse ring when there are unread notifications */}
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping pointer-events-none" 
            style={{ animationDuration: "2s" }} />
        )}
      </button>

      {/* ─── Notification Panel ─── */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[400px] max-h-[600px] 
          flex flex-col overflow-hidden
          bg-white dark:bg-[#0d1b2a] 
          border border-gray-200/60 dark:border-cyan-900/30
          rounded-2xl
          shadow-2xl shadow-black/15 dark:shadow-cyan-950/40
          transition-all duration-300 ease-out origin-bottom-right
          ${isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
          }`}
        style={{ backdropFilter: "blur(24px)" }}
      >
        {/* ─── Header ─── */}
        <div className="relative flex items-center gap-3 px-5 py-4 
          bg-gradient-to-r from-[#09daed]/5 to-transparent dark:from-[#09daed]/10
          border-b border-gray-100 dark:border-cyan-900/20">
          
          {/* Neesh Logo Watermark */}
          <div className="flex items-center justify-center w-9 h-9 rounded-xl 
            bg-gradient-to-br from-[#09daed]/10 to-[#09daed]/5 
            dark:from-[#09daed]/15 dark:to-[#09daed]/5
            ring-1 ring-[#09daed]/20">
            <img src={newLogo} alt="Neesh AI" className="w-6 h-6 object-contain" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
              Notifications
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {unreadCount > 0 ? `${unreadCount} new` : "All caught up"} · Neesh AI
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400
                    hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={clearAll}
                  title="Clear all notifications"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 
                    hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Filter Tabs ─── */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-gray-100 dark:border-cyan-900/20
          bg-gray-50/50 dark:bg-white/[0.02] overflow-x-auto scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium 
                transition-all duration-150 whitespace-nowrap
                ${activeFilter === tab.key
                  ? "bg-[#09daed]/10 text-[#09daed] dark:bg-[#09daed]/15 ring-1 ring-[#09daed]/25"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                  ${activeFilter === tab.key
                    ? "bg-[#09daed]/20 text-[#0bb8c7] dark:text-[#09daed]"
                    : "bg-gray-200/70 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Notification List ─── */}
        <div className="flex-1 overflow-y-auto overscroll-contain" 
          style={{ maxHeight: "420px" }}>
          
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 
                flex items-center justify-center mb-4">
                <img src={newLogo} alt="" className="w-10 h-10 object-contain opacity-30" />
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">
                {activeFilter === "all" ? "No notifications yet" : `No ${activeFilter} notifications`}
              </p>
              <p className="text-xs text-gray-400/70 dark:text-gray-600 text-center max-w-[200px]">
                Your activity feed will appear here as you use Neesh AI
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/80 dark:divide-white/5">
              {filteredNotifications.map((notif, idx) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onRead={() => markAsRead(notif.id)}
                  onRemove={() => removeNotification(notif.id)}
                  index={idx}
                  isOpen={isOpen}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center justify-center px-4 py-2.5 
            border-t border-gray-100 dark:border-cyan-900/20
            bg-gray-50/50 dark:bg-white/[0.02]">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* ─── Backdrop overlay ─── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9997] bg-black/5 dark:bg-black/20 backdrop-blur-[1px]
            transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

// ─── Individual Notification Item ───
const NotificationItem = ({
  notification,
  onRead,
  onRemove,
  index,
  isOpen,
}: {
  notification: AppNotification;
  onRead: () => void;
  onRemove: () => void;
  index: number;
  isOpen: boolean;
}) => {
  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`group relative flex items-start gap-3 px-5 py-3.5 cursor-pointer
        transition-all duration-200 ease-out
        hover:bg-gray-50 dark:hover:bg-white/[0.03]
        ${!notification.read ? "bg-[#09daed]/[0.03] dark:bg-[#09daed]/[0.05]" : ""}
        `}
      style={{
        animationDelay: isOpen ? `${index * 30}ms` : "0ms",
      }}
      onClick={() => {
        if (!notification.read) onRead();
      }}
    >
      {/* Unread indicator dot */}
      {!notification.read && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full 
          bg-[#09daed]" />
      )}

      {/* Type icon */}
      <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 mt-0.5
        rounded-lg ring-1 ${config.bgRing}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug
          ${notification.read 
            ? "text-gray-600 dark:text-gray-400" 
            : "text-gray-900 dark:text-white font-medium"
          }`}>
          {notification.title}
        </p>
        {notification.description && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
            {notification.description}
          </p>
        )}
        <p className="text-[10px] text-gray-400/70 dark:text-gray-600 mt-1.5 flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            notification.type === "success" ? "bg-emerald-400" :
            notification.type === "error" ? "bg-rose-400" :
            notification.type === "warning" ? "bg-amber-400" :
            "bg-cyan-400"
          }`} />
          {config.label} · {timeAgo(notification.timestamp)}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md
          text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10
          transition-all duration-150 mt-0.5"
        title="Remove notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default NotificationCenter;
