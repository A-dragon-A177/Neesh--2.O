import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

export type NotificationType = "success" | "error" | "info" | "warning" | "message";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let globalAddNotification: ((type: NotificationType, title: string, description?: string) => void) | null = null;

// Generate unique ID
const genId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem("neesh-notifications");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
      }
    } catch { /* ignore */ }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      // Keep only the latest 50 notifications
      const toStore = notifications.slice(0, 50);
      localStorage.setItem("neesh-notifications", JSON.stringify(toStore));
    } catch { /* ignore */ }
  }, [notifications]);

  const addNotification = useCallback((type: NotificationType, title: string, description?: string) => {
    const newNotif: AppNotification = {
      id: genId(),
      type,
      title,
      description,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
  }, []);

  // Expose globally for the patched toast
  useEffect(() => {
    globalAddNotification = addNotification;
    return () => { globalAddNotification = null; };
  }, [addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

// ─── Monkey-patch sonner toast to capture notifications ───
// We wrap each toast method so that every call also pushes to our notification history.

type ToastFn = typeof sonnerToast;

const wrapToastMethod = (
  originalMethod: (...args: any[]) => any,
  type: NotificationType
) => {
  return (...args: any[]) => {
    const title = typeof args[0] === "string" ? args[0] : "";
    const options = typeof args[1] === "object" ? args[1] : {};
    const description = options?.description || undefined;

    if (globalAddNotification && title) {
      globalAddNotification(type, title, description);
    }

    return originalMethod(...args);
  };
};

// Patch the specific methods
const originalSuccess = sonnerToast.success.bind(sonnerToast);
const originalError = sonnerToast.error.bind(sonnerToast);
const originalInfo = sonnerToast.info.bind(sonnerToast);
const originalWarning = sonnerToast.warning.bind(sonnerToast);
const originalMessage = sonnerToast.message?.bind(sonnerToast);

(sonnerToast as any).success = wrapToastMethod(originalSuccess, "success");
(sonnerToast as any).error = wrapToastMethod(originalError, "error");
(sonnerToast as any).info = wrapToastMethod(originalInfo, "info");
(sonnerToast as any).warning = wrapToastMethod(originalWarning, "warning");
if (originalMessage) {
  (sonnerToast as any).message = wrapToastMethod(originalMessage, "message");
}
