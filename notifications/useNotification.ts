
import { create } from "zustand";
import {
    get_notification,
    mark_notifications_read,
    delete_notification,
} from "@/notifications/notification.socket";
import { DeleteNotificationParams, NotificationCard } from "@/notifications/notification.types";

type HasRead = { is_read: boolean };

const TYPES = [
    "like",
    "star",
    "message",
    "cook",
    "trend",
    "recommendation",
] as const;

const countUnread = (n: NotificationCard) =>
    TYPES.reduce(
        (sum, type) =>
            sum +
            ((n[type] ?? []) as HasRead[]).filter(
                (item) => !item.is_read,
            ).length,
        0,
    );

type NotificationState = {
    notifications: NotificationCard | null;
    unreadCount: number;
    loadingNotifications: boolean;
    loadNotifications: () => Promise<void>;

    markConversationRead: (conversationId: number) => void;
    markAllRead: () => Promise<void>;

    deleteNotification: (
        params: DeleteNotificationParams,
    ) => Promise<boolean>;
    clearNotifications: () => void;
};

export const useNotification = create<NotificationState>((set) => ({
    notifications: null,
    unreadCount: 0,
    loadingNotifications: false,

    loadNotifications: async () => {
        set({ loadingNotifications: true });

        try {
            const data = await get_notification();
            if (!data) return;

            set({
                notifications: data,
                unreadCount: countUnread(data),
            });
        } catch (err) {
            console.error("Error loading notifications:", err);
        } finally {
            set({ loadingNotifications: false });
        }
    },

    markAllRead: async () => {
        await mark_notifications_read();

        set((state) => {
            if (!state.notifications) {
                return { unreadCount: 0, notifications: null };
            }

            const read = <T extends { is_read: boolean }>(
                list?: T[],
            ) => (list ?? []).map((item) => ({
                ...item,
                is_read: true,
            }));

            const notifications: NotificationCard = {
                like: read(state.notifications.like),
                star: read(state.notifications.star),
                message: read(state.notifications.message),
                cook: read(state.notifications.cook),
                trend: read(state.notifications.trend),
                recommendation: read(
                    state.notifications.recommendation,
                ),
            };

            return {
                notifications,
                unreadCount: 0,
            };
        });
    },

    markConversationRead: (conversationId) =>
        set((state) => {
            const current = state.notifications;
            if (!current) return {};

            // bail early so we don't trigger a re-render for nothing
            const hasUnread = current.message.some(
                (m) => m.conversation_id === conversationId && !m.is_read,
            );
            if (!hasUnread) return {};

            const notifications: NotificationCard = {
                ...current,
                message: current.message.map((m) =>
                    m.conversation_id === conversationId
                        ? { ...m, is_read: true }
                        : m,
                ),
            };

            return {
                notifications,
                unreadCount: countUnread(notifications),
            };
        }),

    deleteNotification: async (params) => {
        const success = await delete_notification(params);

        if (!success) return false;

        set((state) => {
            const current = state.notifications;
            if (!current) return {};

            let notifications: NotificationCard;

            if (params.action_type === "message") {
                notifications = {
                    ...current,
                    message: current.message.filter(
                        (item) =>
                            item.conversation_id !== params.conversation_id,
                    ),
                };
            } else if (params.action_type === "like") {
                notifications = {
                    ...current,
                    like: current.like.filter(
                        (item) => item.post_id !== params.post_id,
                    ),
                };
            } else if (params.action_type === "cook") {
                notifications = {
                    ...current,
                    cook: current.cook.filter(
                        (item) => item.post_id !== params.post_id,
                    ),
                };
            } else if (params.action_type === "star") {
                notifications = {
                    ...current,
                    star: current.star.filter(
                        (item) => item.post_id !== params.post_id,
                    ),
                };
            } else if (params.action_type === "trend") {
                notifications = {
                    ...current,
                    trend: current.trend.filter(
                        (item) => item.post_id !== params.post_id,
                    ),
                };
            } else if (params.action_type === "recommendation") {
                notifications = {
                    ...current,
                    recommendation: current.recommendation.filter(
                        (item) => item.post_id !== params.post_id,
                    ),
                };
            } else {
                return {};
            }

            return {
                notifications,
                unreadCount: countUnread(notifications),
            };
        });

        return true;
    },

    clearNotifications: () =>
        set({ notifications: null, unreadCount: 0 }),
}));
