import { create } from 'zustand';
import type { NotificationItem } from '../types';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'destructive';
}

interface NotificationState {
  notifications: NotificationItem[];
  toasts: ToastItem[];
  loadNotifications: (userId: string) => void;
  addNotification: (
    userId: string,
    type: NotificationItem['type'],
    title: string,
    message: string,
    targetDate?: string
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addToast: (title: string, message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  // Helper to load from LocalStorage
  const getStoredNotifications = (userId: string): NotificationItem[] => {
    try {
      const stored = localStorage.getItem(`bb-notifications-${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Helper to save to LocalStorage
  const saveStoredNotifications = (userId: string, items: NotificationItem[]) => {
    try {
      localStorage.setItem(`bb-notifications-${userId}`, JSON.stringify(items));
    } catch (err) {
      console.error('Error saving notifications to LocalStorage:', err);
    }
  };

  return {
    notifications: [],
    toasts: [],

    loadNotifications: (userId: string) => {
      const loaded = getStoredNotifications(userId);
      set({ notifications: loaded });
    },

    addNotification: (userId, type, title, message, targetDate) => {
      const current = getStoredNotifications(userId);
      
      // Prevent exact duplicate notifications in the history (matching same type, title, and targetDate)
      const isDuplicate = current.some(
        n => n.type === type && n.title === title && n.target_date === targetDate
      );

      if (isDuplicate) {
        // If it is a duplicate in history, we still show the toast (each comeback popup),
        // but we don't insert a new record in notifications history.
        get().addToast(title, message, type === 'auth' ? 'success' : type === 'bill' ? 'info' : 'warning');
        return;
      }

      const newNotif: NotificationItem = {
        id: crypto.randomUUID(),
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
        target_date: targetDate || undefined,
        created_at: new Date().toISOString(),
      };

      const updated = [newNotif, ...current];
      saveStoredNotifications(userId, updated);
      set({ notifications: updated });

      // Trigger the visual toast
      get().addToast(title, message, type === 'auth' ? 'success' : type === 'bill' ? 'info' : 'warning');
    },

    markAsRead: (id) => {
      const current = get().notifications;
      if (current.length === 0) return;
      const userId = current[0].user_id;

      const updated = current.map(n => n.id === id ? { ...n, is_read: true } : n);
      saveStoredNotifications(userId, updated);
      set({ notifications: updated });
    },

    markAllAsRead: () => {
      const current = get().notifications;
      if (current.length === 0) return;
      const userId = current[0].user_id;

      const updated = current.map(n => ({ ...n, is_read: true }));
      saveStoredNotifications(userId, updated);
      set({ notifications: updated });
    },

    clearNotifications: () => {
      const current = get().notifications;
      if (current.length === 0) return;
      const userId = current[0].user_id;

      saveStoredNotifications(userId, []);
      set({ notifications: [] });
    },

    addToast: (title, message, type = 'info') => {
      const id = crypto.randomUUID();
      const newToast: ToastItem = { id, title, message, type };
      
      set(state => ({ toasts: [...state.toasts, newToast] }));

      // Automatically remove toast after 4 seconds
      setTimeout(() => {
        get().removeToast(id);
      }, 4000);
    },

    removeToast: (id) => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    },
  };
});
