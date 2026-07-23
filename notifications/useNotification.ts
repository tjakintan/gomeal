import { create } from "zustand";
import { get_notification, mark_notifications_read } from "@/notifications/notification.socket";
import { NotificationCard } from "@/notifications/notification.types";

type NotificationState = {
    notifications: NotificationCard | null;
    unreadCount: number;
    loadingNotifications: boolean;
    loadNotifications: () => Promise<void>;
    markAllRead: () => Promise<void>;
    clearNotifications: () => void;
};

export const useNotification = create<NotificationState>((set, get) => ({
  
    notifications: null,
    unreadCount: 0,
    loadingNotifications: false,

    loadNotifications: async () => {

        set({ loadingNotifications: true });

        try {
            const data = await get_notification();
            if (!data) return;

            const unreadCount = data.like.filter((n) => !n.is_read).length + data.message.filter((n) => !n.is_read).length;
            set({ notifications: data, unreadCount });
            
        } catch (err) {
            console.error("Error loading notifications:", err);
        } finally {
            set({ loadingNotifications: false });
        }

    },

    markAllRead: async () => {
        await mark_notifications_read();

        set((state) => ({
            unreadCount: 0,
            notifications: state.notifications
                ? {
                    like: state.notifications.like.map((n) => ({ ...n, is_read: true })),
                    message: state.notifications.message.map((n) => ({ ...n, is_read: true })),
                    cook: state.notifications.cook.map((n) => ({ ...n, is_read: true })),
                    trend: state.notifications.trend.map((n) => ({ ...n, is_read: true })),
                }
                : null,
        }));
    },

    clearNotifications: () => set({ notifications: null, unreadCount: 0 }),
}));