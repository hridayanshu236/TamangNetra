'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Trash2,
  Languages,
  AlertCircle,
  ShieldCheck,
  Lock,
  Wifi,
  WifiOff,
  BookOpen,
  FileUp,
  FileDown,
  X,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Badge } from '@/src/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/components/ui/popover';

// ─── Notification Types ────────────────────────────────────────────

export type NotificationType =
  | 'translation_complete'
  | 'translation_error'
  | 'pii_detected'
  | 'encryption_status'
  | 'api_status'
  | 'tm_hit'
  | 'file_uploaded'
  | 'export_complete'
  | 'demo_mode'
  | 'api_offline';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  meta?: Record<string, string | number>;
}

const STORAGE_KEY = 'tamangnetra-notifications';
const MAX_NOTIFICATIONS = 50;
const AUTO_DISMISS_MS = 5000;

// ─── Notification Type Config ──────────────────────────────────────

const typeConfig: Record<
  NotificationType,
  { icon: typeof Languages; color: string; bgColor: string; label: string }
> = {
  translation_complete: {
    icon: Languages,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    label: 'Translation',
  },
  translation_error: {
    icon: AlertCircle,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-900/40',
    label: 'Error',
  },
  pii_detected: {
    icon: ShieldCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    label: 'PII Shield',
  },
  encryption_status: {
    icon: Lock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    label: 'Encryption',
  },
  api_status: {
    icon: Wifi,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/40',
    label: 'API',
  },
  tm_hit: {
    icon: BookOpen,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/40',
    label: 'TM Match',
  },
  file_uploaded: {
    icon: FileUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    label: 'Upload',
  },
  export_complete: {
    icon: FileDown,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    label: 'Export',
  },
  demo_mode: {
    icon: BookOpen,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    label: 'Demo',
  },
  api_offline: {
    icon: WifiOff,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-900/40',
    label: 'Offline',
  },
};

// Fallback config for any unknown notification type
const defaultConfig = {
  icon: Bell,
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
  label: 'Info',
};

// ─── Module-level Singleton (like useGlossary) ─────────────────────

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
}

let sharedState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const listeners = new Set<(state: NotificationState) => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...sharedState }));
}

function loadFromStorage() {
  try {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppNotification[];
      sharedState.notifications = parsed.slice(0, MAX_NOTIFICATIONS);
      sharedState.unreadCount = sharedState.notifications.filter((n) => !n.read).length;
    }
  } catch {
    // Ignore storage errors
  }
}

function saveToStorage() {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedState.notifications));
  } catch {
    // Ignore storage errors
  }
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Initialize from storage
if (typeof window !== 'undefined') {
  loadFromStorage();
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useNotifications() {
  const [state, setState] = useState<NotificationState>(sharedState);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    sharedState.notifications = sharedState.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    sharedState.unreadCount = sharedState.notifications.filter((n) => !n.read).length;
    saveToStorage();
    notifyListeners();
  }, []);

  const addNotification = useCallback(
    (type: NotificationType, title: string, description: string, meta?: Record<string, string | number>) => {
      const notification: AppNotification = {
        id: genId(),
        type,
        title,
        description,
        timestamp: Date.now(),
        read: false,
        meta,
      };

      sharedState.notifications = [notification, ...sharedState.notifications].slice(
        0,
        MAX_NOTIFICATIONS
      );
      sharedState.unreadCount = sharedState.notifications.filter((n) => !n.read).length;
      saveToStorage();
      notifyListeners();

      // Auto-dismiss: mark as read after timeout (stays in history)
      setTimeout(() => {
        markAsRead(notification.id);
      }, AUTO_DISMISS_MS);
    },
    [markAsRead]
  );

  const markAllAsRead = useCallback(() => {
    sharedState.notifications = sharedState.notifications.map((n) => ({
      ...n,
      read: true,
    }));
    sharedState.unreadCount = 0;
    saveToStorage();
    notifyListeners();
  }, []);

  const clearAll = useCallback(() => {
    sharedState.notifications = [];
    sharedState.unreadCount = 0;
    saveToStorage();
    notifyListeners();
  }, []);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}

// ─── Helper: Relative Time ─────────────────────────────────────────

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Notification Panel Component ──────────────────────────────────

export function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // Bounce bell when new notification arrives
  useEffect(() => {
    if (unreadCount > 0) {
      const bounceTimer = setTimeout(() => {
        setBouncing(true);
        setAnimKey((k) => k + 1);
      }, 0);
      const stopTimer = setTimeout(() => setBouncing(false), 1500);
      return () => {
        clearTimeout(bounceTimer);
        clearTimeout(stopTimer);
      };
    }
  }, [unreadCount]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative size-9 text-muted-foreground hover:text-foreground ${
            bouncing ? 'animate-bounce' : ''
          }`}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 bg-card/90 backdrop-blur-xl border-border/50 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                onClick={markAllAsRead}
              >
                <CheckCheck className="size-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                onClick={clearAll}
              >
                <Trash2 className="size-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="size-8 mb-2 opacity-30" />
              <p className="text-xs">No notifications yet</p>
              <p className="text-[10px] mt-1">Translation events will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              <AnimatePresence initial={false}>
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type] || defaultConfig;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                        notification.read
                          ? 'bg-transparent'
                          : 'bg-emerald-50/50 dark:bg-emerald-950/20'
                      } hover:bg-muted/50`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      {/* Icon */}
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}
                      >
                        <Icon className={`size-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs ${
                              notification.read
                                ? 'font-medium text-foreground'
                                : 'font-semibold text-foreground'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {notification.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground/60">
                            {relativeTime(notification.timestamp)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[8px] px-1 py-0 h-3.5 ${config.color} border-current/20`}
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
