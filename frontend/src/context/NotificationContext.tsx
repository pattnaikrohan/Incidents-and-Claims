import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { playNotificationSound } from '../utils/notificationSound';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  author?: string;
  incidentId?: string;
  link?: string;
  timestamp: string;
  read: boolean;
  type?: 'collaboration' | 'incident' | 'system';
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  activeToast: AppNotification | null;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'app_notifications_v1';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const toastTimerRef = useRef<any>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications to localStorage:', e);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dismissToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActiveToast(null);
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);

    // Play chime sound
    playNotificationSound('received');

    // Show floating toast
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActiveToast(newNotif);
    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 6500);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    dismissToast();
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (activeToast?.id === id) {
      dismissToast();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
