import db from "@/services/db";
import { defaultNotificationSettings, NotificationActionType, NotificationSettings } from "@/types/notification.types";
import { PoolClient } from "pg";

const SETTINGS_COLUMNS = `
    likes,
    stars,
    messages,
    cook,
    cooking_reminder_time,
    timezone
`;

const mapSettings = (row: any): NotificationSettings => ({
    likes: row.likes,
    stars: row.stars,
    messages: row.messages,
    cook: row.cook,
    cookingReminderTime: row.cooking_reminder_time,
    timezone: row.timezone,
});

export const get_notification_settings = async (
    user_sub: string,
    client?: PoolClient
): Promise<NotificationSettings> => {
    const runner = client ?? db;

    const result = await runner.query(
        `SELECT ${SETTINGS_COLUMNS}
         FROM notification_settings
         WHERE user_sub = $1`,
        [user_sub]
    );

    const row = result.rows[0];
    return row ? mapSettings(row) : defaultNotificationSettings;
};

export const update_notification_settings = async (
    user_sub: string,
    updates: Partial<NotificationSettings>,
    client?: PoolClient
): Promise<NotificationSettings> => {
    const runner = client ?? db;
    const current = await get_notification_settings(user_sub, client);

    const next: NotificationSettings = { ...current, ...updates };

    const result = await runner.query(
        `INSERT INTO notification_settings (
            user_sub, likes, stars, messages, cook, cooking_reminder_time, timezone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_sub)
        DO UPDATE SET
            likes = EXCLUDED.likes,
            stars = EXCLUDED.stars,
            messages = EXCLUDED.messages,
            cook = EXCLUDED.cook,
            cooking_reminder_time = EXCLUDED.cooking_reminder_time,
            timezone = EXCLUDED.timezone,
            updated_at = NOW()
        RETURNING ${SETTINGS_COLUMNS}`,
        [
            user_sub,
            next.likes,
            next.stars,
            next.messages,
            next.cook,
            next.cookingReminderTime,
            next.timezone,
        ]
    );

    return mapSettings(result.rows[0]);
};

export const can_send_notification = async (
    receiver_sub: string,
    action_type: NotificationActionType,
    client?: PoolClient
): Promise<boolean> => {
    const settings = await get_notification_settings(receiver_sub, client);

    switch (action_type) {
        case "like":
            return settings.likes;

        case "message":
            return settings.messages;

        case "cook":
            return settings.cook;

        case "star":
            return settings.stars;
            
        case "post":
            return true;

        default:
            return true;
    }
};
