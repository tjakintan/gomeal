import cron from "node-cron";
import db from "@/services/db";
import { getNowInTimezone } from "@/utils/time";
import { send_push_notification, send_push_notification_to_user_devices } from "@/services/push";
import { create_notification } from "@/routes/user/notification";

export const send_push_noti_cooking_reminder = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const result = await db.query(`
                SELECT
                    user_sub,
                    cooking_reminder_time,
                    timezone,
                    last_reminder_sent_at
                FROM notification_settings
                WHERE cooking_reminder_time IS NOT NULL
            `);

            if (result.rows.length === 0) return;

            console.log(`[automated]=>cooking_reminder_started`);

            for (const row of result.rows) {
                if (!row.cooking_reminder_time) continue;

                const [remHour, remMin] = row.cooking_reminder_time
                    .toString()
                    .slice(0, 5)
                    .split(":")
                    .map(Number);

                const { hour, minute, dateString } = getNowInTimezone(row.timezone);

                const nowMinutes = hour * 60 + minute;
                const targetMinutes = remHour * 60 + remMin;
                const isWithinReminderWindow =
                    nowMinutes >= targetMinutes && nowMinutes < targetMinutes + 5;

                console.log(
                    `[automated]=>cooking_checked_${row.user_sub}_${hour}:${minute}_target_${remHour}:${remMin}_window_${isWithinReminderWindow}`
                );

                if (!isWithinReminderWindow) continue;

                if (row.last_reminder_sent_at) {
                    const lastSentDateString = new Date(row.last_reminder_sent_at)
                        .toLocaleDateString("en-US", { timeZone: row.timezone });
                    if (lastSentDateString === dateString) continue;
                }

                await send_push_notification_to_user_devices({
                    receiver_sub: row.user_sub,
                    title: "Let's cook",
                    body: "Try making something delicious today.",
                    data: { type: "cook_reminder" },
                });

                await db.query(
                    `UPDATE notification_settings
                     SET last_reminder_sent_at = NOW()
                     WHERE user_sub = $1`,
                    [row.user_sub]
                );

                console.log(`[automated]=>cooking_reminder_sent_${row.user_sub}`);
            }

            console.log(`[automated]=>cooking_reminder_finished`);
        } catch (e) {
            console.error(`[automated]=>cooking_reminder_error_${e}`);
        }
    });
};

export const send_push_noti_trending = () => {
    cron.schedule("*/30 * * * *", async () => {
        try {

            const result = await db.query(`
                SELECT p.id, p.dish_name, p.image_url, p.trend_rank, p.trend_velocity, p.user_sub
                FROM post p
                WHERE p.trend_rank <= 10
                    AND p.trend_score >= 0.08
                    AND p.last_ranked_at > NOW() - INTERVAL '2 hours'
                    AND (
                        p.last_trending_notification_at IS NULL
                        OR p.last_trending_notification_at < NOW() - INTERVAL '6 hours'
                    )
                ORDER BY
                    p.trend_score DESC,
                    p.trend_velocity DESC
                LIMIT 5
            `);

            console.log(`[automated]=>trending_notif_started`);
            console.log(`[automated]=>trending_candidates_${result.rows.length}`);

            for (const post of result.rows) {

                const tokens_result = await db.query(`
                    SELECT
                        pt.token,
                        ue.user_sub,
                        1 - (ue.embedding <=> pe.embedding) AS similarity
                    FROM user_embeddings ue
                    JOIN push_tokens pt
                        ON pt.user_sub = ue.user_sub
                    JOIN post_embeddings pe
                        ON pe.post_id = $1
                    WHERE
                        ue.user_sub <> $2
                    AND
                        1 - (ue.embedding <=> pe.embedding) > 0.55
                    ORDER BY ue.embedding <=> pe.embedding
                    LIMIT 500
                `, [
                    post.id,
                    post.user_sub
                ]);

                const uniqueReceivers: string[] = Array.from(
                    new Set<string>(tokens_result.rows.map((r: { user_sub: string }) => r.user_sub))
                );

                await Promise.all(uniqueReceivers.map((receiver_sub: string) =>
                    create_notification({
                        receiver_sub,
                        actor_sub: post.user_sub,
                        action_type: "trend",
                        post_id: post.id,
                    })
                ));

                const tokens = tokens_result.rows.map((r: { token: string }) => r.token);

                await Promise.all(tokens.map((token: string) =>
                    send_push_notification({
                        token,
                        title: "🔥 Trending Now",
                        body: `${post.dish_name} is trending, tap to cook it!`,
                        image_url: post.image_url ?? undefined,  
                        data: {
                            type: "trending_post",
                            post_id: post.id,
                            trend_rank: post.trend_rank,
                        },
                    })
                ));

                await db.query(`
                    UPDATE post
                    SET last_trending_notification_at = NOW()
                    WHERE id = $1
                `, [post.id]);

                console.log(`[automated]=>trending_notif_sent_${post.id}`);

            }

            console.log(`[automated]=>trending_notif_finished`);
        } catch (e) {
            console.error(`[automated]=>trending_notif_error_${e}`);
        }
    });
};