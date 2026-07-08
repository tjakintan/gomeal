import cron from "node-cron";
import db from "@/services/db";
import { PoolClient } from "pg";
import { Notification, NotificationActionType, LikeNotificationCard, MessageNotificationCard, NotificationCard, CreateNotificationParams, CookNotificationCard } from "@/types/notification.types";
import { can_send_notification } from "./notification_settings";

export const create_notification = async ({
    receiver_sub,
    actor_sub,
    action_type,
    post_id = null,
    conversation_id = null,
}: CreateNotificationParams, client?: PoolClient): Promise<Notification | null> => {
    if (receiver_sub === actor_sub) return null;

    const runner = client ?? db;

    const canNotify = await can_send_notification(
        receiver_sub,
        action_type,
        client
    );

    if (!canNotify) return null;

    try {
        if (action_type === "like" && post_id !== null) {
            const result = await runner.query(
                `INSERT INTO notifications (
                    receiver_sub, actor_sub, action_type, post_id, conversation_id, is_read, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, false, 'active', NOW())
                ON CONFLICT (receiver_sub, actor_sub, action_type, post_id)
                WHERE action_type = 'like' AND post_id IS NOT NULL
                DO UPDATE SET
                    is_read = false,
                    status = 'active',
                    created_at = NOW()
                RETURNING *`,
                [receiver_sub, actor_sub, action_type, post_id, conversation_id]
            );

            return (result.rows[0] as Notification) ?? null;
        }

        if (action_type === "message" && conversation_id !== null) {
            const result = await runner.query(
                `INSERT INTO notifications (
                    receiver_sub, actor_sub, action_type, post_id, conversation_id, is_read, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, false, 'active', NOW())
                ON CONFLICT (receiver_sub, actor_sub, action_type, conversation_id)
                WHERE action_type = 'message' AND conversation_id IS NOT NULL
                DO UPDATE SET
                    is_read = false,
                    status = 'active',
                    created_at = NOW()
                RETURNING *`,
                [receiver_sub, actor_sub, action_type, post_id, conversation_id]
            );

            return (result.rows[0] as Notification) ?? null;
        }

        const result = await runner.query(
            `INSERT INTO notifications (
                receiver_sub, actor_sub, action_type, post_id, conversation_id
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [receiver_sub, actor_sub, action_type, post_id, conversation_id]
        );

        return (result.rows[0] as Notification) ?? null;
    } catch (err) {
        console.error("Error creating notification:", err);
        return null;
    }
};

export const cleanup_notification = () => {

    cron.schedule("0 2 * * *", async () => {

        try {

            console.log(`[automated]=>noti_cleanup_started_running`);

            await db.query(`
                UPDATE notifications
                SET status = 'expired'
                WHERE created_at < NOW() - INTERVAL '7 days'    
            `)

            console.log(`[automated]=>noti_cleanup_done_running`);

        } catch(e) {
            console.error(`noti_cleanup_err_${e}`);
        }
    })
}

export const get_notifications = async (receiver_sub: string): Promise<NotificationCard> => {

    try {
        const [like, message, cook] = await Promise.all([
            get_notifications_like(receiver_sub),
            get_notifications_message(receiver_sub),
            get_notifications_cook(receiver_sub),
        ]);

        return { like, message, cook };

    } catch (err) {
        throw err
    }

};

export const get_notifications_like = async (receiver_sub: string): Promise<LikeNotificationCard[]> => {

    try {

        const result = await db.query(
            `SELECT
                n.post_id,
                n.is_read,
                n.created_at,
                u.avatar         AS actor_avatar,
                u.profile_name   AS actor_profile_name,
                p.dish_name,
                p.image_url      AS dish_media_url,
                p.media_type     AS dish_media_type
            FROM notifications n
            JOIN users u ON u.sub = n.actor_sub
            JOIN post  p ON p.id  = n.post_id
            WHERE n.receiver_sub = $1
                AND n.action_type  = 'like'
                AND n.status       = 'active'
            ORDER BY n.created_at DESC`,
            [receiver_sub]
        );

        return (result.rows as LikeNotificationCard[]).map((row) => ({
            post_id:            row.post_id,
            is_read:            row.is_read,
            created_at:         row.created_at,
            actor_avatar:       row.actor_avatar,
            actor_profile_name: row.actor_profile_name,
            dish_name:          row.dish_name,
            dish_media_url:     row.dish_media_url,
            dish_media_type:    row.dish_media_type,
        }));

    } catch (err) {
        throw err
    }
    
};

export const get_notifications_message = async (receiver_sub: string): Promise<MessageNotificationCard[]> => {

    try {

        const result = await db.query(
            `SELECT DISTINCT ON (n.conversation_id)
                n.conversation_id,
                n.created_at,
                n.is_read,
                u.avatar          AS actor_avatar,
                u.profile_name    AS actor_profile_name,
                m.content
            FROM notifications n
            JOIN users    u ON u.sub = n.actor_sub
            JOIN messages m ON m.conversation_id = n.conversation_id
                            AND m.sender_sub     = n.actor_sub
            WHERE n.receiver_sub = $1
                AND n.action_type  = 'message'
                AND n.status       = 'active'
            ORDER BY n.conversation_id, n.created_at DESC`,
            [receiver_sub]
        );

        return (result.rows as MessageNotificationCard[]).map((row) => ({
            conversation_id:    row.conversation_id,
            is_read:            row.is_read,
            created_at:         row.created_at,
            actor_avatar:       row.actor_avatar,
            actor_profile_name: row.actor_profile_name,
            content:            row.content,
        }));

    } catch (err) {
        throw err
    }
};

export const get_notifications_cook = async (receiver_sub: string): Promise<CookNotificationCard[]> => {
    
    try {

        const result = await db.query(
            `SELECT
                n.post_id,
                n.is_read,
                n.created_at,
                u.avatar         AS actor_avatar,
                u.profile_name   AS actor_profile_name,
                p.dish_name,
                p.image_url      AS dish_media_url,
                p.media_type     AS dish_media_type
            FROM notifications n
            JOIN users u ON u.sub = n.actor_sub
            JOIN post  p ON p.id  = n.post_id
            WHERE n.receiver_sub = $1
                AND n.action_type = 'cook'
                AND n.status      = 'active'
            ORDER BY n.created_at DESC`,
            [receiver_sub]
        );

        return (result.rows as CookNotificationCard[]).map((row) => ({
            post_id:            row.post_id,
            is_read:            row.is_read,
            created_at:         row.created_at,
            actor_avatar:       row.actor_avatar,
            actor_profile_name: row.actor_profile_name,
            dish_name:          row.dish_name,
            dish_media_url:     row.dish_media_url,
            dish_media_type:    row.dish_media_type,
        }));

    } catch (err) {
        throw err
    }
};

export const mark_notifications_read = async (receiver_sub: string): Promise<void> => {

    await db.query(
        `UPDATE notifications SET is_read = true WHERE receiver_sub = $1 AND is_read = false`,
        [receiver_sub]
    );
};
