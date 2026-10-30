import cron from "node-cron";
import db from "@/services/db";
import { PoolClient } from "pg";
import {
    Notification,
    MessageNotificationCard,
    NotificationCard,
    CreateNotificationParams,
    TrendNotificationCard,
    PostNotifType,
    POST_NOTIF_TYPES,
    GroupedPostNotificationCard,
    RecommendationNotificationCard,
    NotificationActionType,
} from "@/types/notification.types";
import { can_send_notification } from "./notification_settings";
import { blockedFilter, is_user_blocked } from "./block";

const upsert_post_notification = async (
    runner: PoolClient | typeof db,
    type: PostNotifType,
    receiver_sub: string,
    actor_sub: string,
    post_id: number,
    conversation_id: number | null
): Promise<Notification | null> => {
    const result = await runner.query(
        `INSERT INTO notifications (
            receiver_sub, actor_sub, action_type, post_id, conversation_id, is_read, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, false, 'active', NOW())
        ON CONFLICT (receiver_sub, actor_sub, action_type, post_id)
        WHERE action_type = '${type}' AND post_id IS NOT NULL
        DO UPDATE SET is_read = false, status = 'active', created_at = NOW()
        WHERE notifications.status <> 'active'
        RETURNING *`,
        [receiver_sub, actor_sub, type, post_id, conversation_id]
    );
    return (result.rows[0] as Notification) ?? null;
};

export const create_notification = async ({
    receiver_sub,
    actor_sub,
    action_type,
    post_id = null,
    conversation_id = null,
}: CreateNotificationParams, client?: PoolClient): Promise<Notification | null> => {
    if (receiver_sub === actor_sub) return null;

    const runner = client ?? db;

    const canNotify = await can_send_notification(receiver_sub, action_type, client);
    if (!canNotify) return null;

    if (await is_user_blocked(receiver_sub, actor_sub)) return null;

    try {
        if (post_id !== null && (POST_NOTIF_TYPES as readonly string[]).includes(action_type)) {
            return await upsert_post_notification(
                runner, action_type as PostNotifType,
                receiver_sub, actor_sub, post_id, conversation_id
            );
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

export const delete_notification = async (
    receiver_sub: string,
    action_type: NotificationActionType,
    post_id?: number | null,
    conversation_id?: number | null,
): Promise<boolean> => {
    if (
        action_type === "message"
            ? !Number.isInteger(conversation_id) || conversation_id! <= 0
            : !Number.isInteger(post_id) || post_id! <= 0
    ) {
        return false;
    }

    const result = await db.query(
        `UPDATE notifications
         SET status = 'pending_delete',
             status_created_on = NOW()
         WHERE receiver_sub = $1
           AND action_type = $2
           AND status = 'active'
           AND (
               ($2 = 'message' AND conversation_id = $3)
               OR
               ($2 <> 'message' AND post_id = $4)
           )
         RETURNING id`,
        [
            receiver_sub,
            action_type,
            conversation_id ?? null,
            post_id ?? null,
        ],
    );

    return result.rowCount !== null && result.rowCount > 0;
};

export const cleanup_notification = () => {
    cron.schedule("0 2 * * *", async () => {
        try {
            console.log(`[automated]=>noti_cleanup_started_running`);

            await db.query(`
                UPDATE notifications
                SET status = 'expired'
                WHERE created_at < NOW() - INTERVAL '7 days'
            `);

            console.log(`[automated]=>noti_cleanup_done_running`);
        } catch (e) {
            console.error(`noti_cleanup_err_${e}`);
        }
    });
};

const get_grouped_post_notifications = async (
    receiver_sub: string,
    type: "like" | "cook" | "star"
): Promise<GroupedPostNotificationCard[]> => {
    const result = await db.query(
        `WITH ranked AS (
            SELECT
                n.post_id, n.is_read, n.created_at,
                u.avatar, u.profile_name,
                ROW_NUMBER() OVER (PARTITION BY n.post_id ORDER BY n.created_at DESC) AS rn
            FROM notifications n
            JOIN users u ON u.sub = n.actor_sub
            WHERE n.receiver_sub = $1
                AND n.action_type = $2
                AND n.status      = 'active'
                AND u.status      = 'active'
                ${blockedFilter("$1", "n.actor_sub")}
        )
        SELECT
            r.post_id,
            COUNT(*)::int                AS actor_count,
            MAX(r.created_at)            AS created_at,
            BOOL_AND(r.is_read)          AS is_read,
            JSON_AGG(
                JSON_BUILD_OBJECT('avatar', r.avatar, 'profile_name', r.profile_name)
                ORDER BY r.rn
            ) FILTER (WHERE r.rn <= 5)   AS actors,
            p.dish_name,
            p.image_url  AS dish_media_url,
            p.media_type AS dish_media_type
        FROM ranked r
        JOIN post p ON p.id = r.post_id AND p.status = 'active'
        GROUP BY r.post_id, p.dish_name, p.image_url, p.media_type
        ORDER BY MAX(r.created_at) DESC`,
        [receiver_sub, type]
    );
    return result.rows as GroupedPostNotificationCard[];
};

export const get_notifications = async (
    receiver_sub: string
): Promise<NotificationCard> => {
    const [
        like,
        message,
        cook,
        trend,
        star,
        recommendation,
    ] = await Promise.all([
        get_grouped_post_notifications(receiver_sub, "like"),
        get_notifications_message(receiver_sub),
        get_grouped_post_notifications(receiver_sub, "cook"),
        get_notifications_trend(receiver_sub),
        get_grouped_post_notifications(receiver_sub, "star"),
        get_notifications_recommendation(receiver_sub),
    ]);

    return {
        like,
        message,
        cook,
        trend,
        star,
        recommendation,
    };
};

export const get_notifications_trend = async (receiver_sub: string): Promise<TrendNotificationCard[]> => {
    const result = await db.query(
        `SELECT
            n.post_id,
            n.is_read,
            n.created_at,
            u.avatar         AS actor_avatar,
            u.profile_name   AS actor_profile_name,
            p.dish_name,
            p.image_url      AS dish_media_url,
            p.media_type     AS dish_media_type,
            p.trend_rank     AS trend_rank
        FROM notifications n
        JOIN users u ON u.sub = n.actor_sub
        JOIN post  p ON p.id  = n.post_id
        WHERE n.receiver_sub = $1
            AND n.action_type = 'trend'
            AND n.status      = 'active'
            ${blockedFilter("$1", "n.actor_sub")}
        ORDER BY n.created_at DESC`,
        [receiver_sub]
    );

    return (result.rows as TrendNotificationCard[]).map((row) => ({
        post_id:            row.post_id,
        is_read:            row.is_read,
        created_at:         row.created_at,
        actor_avatar:       row.actor_avatar,
        actor_profile_name: row.actor_profile_name,
        dish_name:          row.dish_name,
        dish_media_url:     row.dish_media_url,
        dish_media_type:    row.dish_media_type,
        trend_rank:         row.trend_rank,
    }));
};


export const get_notifications_recommendation = async (
    receiver_sub: string
): Promise<RecommendationNotificationCard[]> => {
    const result = await db.query(
        `SELECT
            n.post_id,
            n.is_read,
            n.created_at,
            p.dish_name,
            p.image_url AS dish_media_url,
            p.media_type AS dish_media_type
        FROM notifications n
        JOIN post p ON p.id = n.post_id
        WHERE n.receiver_sub = $1
            AND n.action_type = 'recommendation'
            AND n.status = 'active'
            AND p.status = 'active'
        ORDER BY n.created_at DESC`,
        [receiver_sub]
    );

    return result.rows as RecommendationNotificationCard[];
};

export const get_notifications_message = async (receiver_sub: string): Promise<MessageNotificationCard[]> => {
    const result = await db.query(
        `SELECT DISTINCT ON (n.conversation_id)
            n.conversation_id,
            n.created_at,
            n.is_read,
            u.sub,
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
            ${blockedFilter("$1", "n.actor_sub")}
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
        user_sub:           row.user_sub,
    }));
};

export const mark_notifications_read = async (receiver_sub: string): Promise<void> => {
    await db.query(
        `UPDATE notifications SET is_read = true WHERE receiver_sub = $1 AND is_read = false`,
        [receiver_sub]
    );
};

export const get_unread_notification_count = async (user_sub: string): Promise<number> => {
    const result = await db.query(
        `SELECT COUNT(DISTINCT (action_type, COALESCE(post_id, conversation_id)))::int AS count
         FROM notifications
         WHERE receiver_sub = $1 AND is_read = false AND status = 'active'`,
        [user_sub]
    );
    return result.rows[0]?.count ?? 0;
};