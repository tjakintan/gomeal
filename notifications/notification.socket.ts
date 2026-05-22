import { useEffect, useRef } from "react";
import { API_BASE } from "@/config";
import { socketEmit, getSocket } from "@/api/socket";
import { NotificationCard } from "@/notifications/notification.types";
import { useNotification } from "@/notifications/useNotification";
import { registerPushNotifications } from "@/notifications/pushNotification";
import { Settings } from "@/types";

export const update_notification_settings = async (
    updates: Partial<Settings["notifications"]>
) => {
    try {
        const res = await socketEmit<{
            settings: Settings["notifications"];
        }>("update-notification-settings", updates);

        return res?.settings ?? null;
    } catch (err) {
        console.error("Update notification settings error:", err);
        return null;
    }
};

export async function get_notification() {

    try {

        const res = await socketEmit<{ notifications: NotificationCard }>("get-notifications", {});
        return res?.notifications ?? null;

    } catch (err) {

        console.error("Get notifications error:", err);
        return null;

    }

};

export const mark_notifications_read = async () => {

    await socketEmit<{}>("mark-notifications-read", {});
    
};

export const useNotificationListener = () => {

    useEffect(() => {

        let mounted = true;

        const setup = async () => {
            const sock = await getSocket();
            if (!mounted) return;
            
            await registerPushNotifications();
            
            useNotification.getState().loadNotifications();

            const handleNew = () => {
                useNotification.getState().loadNotifications();
            };

            sock.on("new-notification", handleNew);
            return () => sock.off("new-notification", handleNew);
        };

        const cleanup = setup();

        return () => {
            mounted = false;
            cleanup.then((fn) => fn?.());
        };

    }, []);

};