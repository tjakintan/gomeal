import cron from "node-cron";
import db from "@/services/db";
import { getNowInTimezone } from "@/utils/time";
import { send_push_notification, send_push_notification_to_user_devices } from "@/services/push";
import { create_notification } from "@/routes/user/notification";
import { fetch_post_image_url } from "@/routes/feed/feed";

export const jobs = () => {
    send_push_noti_cooking_reminder();
    send_push_noti_trending();
}

/**
 * Cron job that sends each user a daily cooking reminder at their
 * chosen local time.
 *
 * Runs every minute (tight polling interval since reminder times are
 * per-user and arbitrary, not aligned to any fixed schedule). For each
 * user with a configured reminder time:
 *   1. Converts their stored reminder time + timezone into a 5-minute
 *      matching window against the current time.
 *   2. Skips them if a reminder was already sent today (in their timezone).
 *   3. Sends the push and stamps last_reminder_sent_at.
 *
 * Note: users with cooking_reminder_time IS NULL are excluded at the
 * query level and never get a reminder (e.g. accounts created before a
 * default reminder time was introduced — needs a backfill).
 */
const send_push_noti_cooking_reminder = () => {
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

                // cooking_reminder_time comes back as a Postgres TIME
                // ("HH:MM:SS"); slice to "HH:MM" and split into numbers.
                const [remHour, remMin] = row.cooking_reminder_time
                    .toString()
                    .slice(0, 5)
                    .split(":")
                    .map(Number);

                // Current time in the user's own timezone, not server time.
                const { hour, minute, dateString } = getNowInTimezone(row.timezone);

                // Compare as minutes-since-midnight so we can use a simple
                // range check instead of juggling hour/minute separately.
                const nowMinutes = hour * 60 + minute;
                const targetMinutes = remHour * 60 + remMin;

                // 5-minute window: since this job runs every minute, this
                // gives some slack for slow queries/ties without needing
                // an exact-minute match.
                const isWithinReminderWindow =
                    nowMinutes >= targetMinutes && nowMinutes < targetMinutes + 5;

                console.log(
                    `[automated]=>cooking_checked_${row.user_sub}_${hour}:${minute}_target_${remHour}:${remMin}_window_${isWithinReminderWindow}`
                );

                if (!isWithinReminderWindow) continue;

                // Prevent duplicate sends within the same 5-min window
                // (job runs every minute, so without this check the user
                // could get up to 5 reminders in a row).
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

                // Stamp send time so today's window won't fire again for this user.
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

/**
 * Cron job that notifies relevant users about currently trending posts.
 *
 * Runs every 30 minutes. For each qualifying trending post:
 *   1. Selects up to `N` trending posts (currently LIMIT 1) that haven't
 *      been notified about in the last 6 hours.
 *   2. Finds up to 500 users whose taste embedding is sufficiently similar
 *      (> 0.55 cosine similarity) to the post's embedding — i.e. users
 *      likely to actually be interested — excluding the post's own author.
 *   3. Filters out users who already got a trend notification within the
 *      last 4 hours (any post), to cap per-user notification frequency.
 *   4. Creates an in-app notification per unique eligible receiver.
 *   5. Sends a personalized push notification per device token.
 *   6. Marks the post as notified so it isn't re-sent within the window.
 */

const TREND_USER_COOLDOWN_INTERVAL = "4 hours";

const send_push_noti_trending = () => {
    cron.schedule("*/30 * * * *", async () => {
        try {
            /**
             * Candidate trending posts:
             * - trend_rank <= 10: only top-ranked posts
             * - trend_score >= 0.08: minimum trend strength threshold
             * - last_ranked_at within 2h: ranking must be fresh
             * - last_trending_notification_at NULL or > 6h ago: avoid re-notifying
             */
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
                LIMIT 1
            `);

            console.log(`[automated] => trending_noti_started`);
            console.log(`[automated] => trending_candidates_${result.rows.length}`);

            for (const post of result.rows) {

                // Resolve the actual displayable image URL (raw post.image_url may
                // just be a storage key, not a fetchable URL — see fetch_post_image_url).
                const image_url = await fetch_post_image_url(post.id);

                /**
                 * Relevance-based fan-out: match this post's embedding against every
                 * user's taste embedding via pgvector cosine distance (`<=>`).
                 * - similarity > 0.55: only users likely to care about this post
                 * - excludes the post's author (ue.user_sub <> post.user_sub)
                 * - capped at top 500 most-similar users to bound notification volume
                 * One row per (user, device token) pair — a user with multiple
                 * devices will appear multiple times here.
                 */
                const tokens_result = await db.query(`
                    SELECT
                        pt.token,
                        ue.user_sub,
                        us.first_name,
                        1 - (ue.embedding <=> pe.embedding) AS similarity
                    FROM user_embeddings ue
                    JOIN push_tokens pt
                        ON pt.user_sub = ue.user_sub
                    JOIN users us
                        ON us.sub = ue.user_sub
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
                    post.user_sub,
                ]);

                if (tokens_result.rows.length === 0) {
                    // No candidates at all — still mark notified so we don't
                    // re-check this post every 30 min for the next 6h window.
                    await db.query(`
                        UPDATE post
                        SET last_trending_notification_at = NOW()
                        WHERE id = $1
                    `, [post.id]);
                    console.log(`[automated] => trending_noti_no_candidates_${post.id}`);
                    continue;
                }

                // Dedup by user_sub so a multi-device user only counts once
                // for the cooldown check and gets one in-app notification row.
                const candidateReceivers: string[] = Array.from(
                    new Set<string>(tokens_result.rows.map((r: { user_sub: string }) => r.user_sub))
                );

                /**
                 * Per-user cooldown: exclude anyone who received a trend
                 * notification (for ANY post) within the last N hours.
                 * Without this, a user can be re-notified every 30-minute
                 * cron cycle as new posts start trending, since the original
                 * throttle only tracked "last_notified" per post, not per user.
                 * Backed by idx_notifications_trend_cooldown (receiver_sub, created_at)
                 * WHERE action_type = 'trend'.
                 */
                const cooldownResult = await db.query(`
                    SELECT DISTINCT receiver_sub
                    FROM notifications
                    WHERE receiver_sub = ANY($1::text[])
                      AND action_type = 'trend'
                      AND created_at > NOW() - INTERVAL '${TREND_USER_COOLDOWN_INTERVAL}'
                `, [candidateReceivers]);

                const recentlyNotified = new Set<string>(
                    cooldownResult.rows.map((r: { receiver_sub: string }) => r.receiver_sub)
                );

                const eligibleReceivers = candidateReceivers.filter(
                    (sub) => !recentlyNotified.has(sub)
                );

                console.log(
                    `[automated] => trending_noti_post_${post.id}_candidates_${candidateReceivers.length}_eligible_${eligibleReceivers.length}`
                );

                if (eligibleReceivers.length === 0) {
                    // Everyone who'd otherwise qualify is still in cooldown.
                    await db.query(`
                        UPDATE post
                        SET last_trending_notification_at = NOW()
                        WHERE id = $1
                    `, [post.id]);
                    console.log(`[automated] => trending_noti_all_on_cooldown_${post.id}`);
                    continue;
                }

                const eligibleSet = new Set(eligibleReceivers);

                await Promise.all(eligibleReceivers.map((receiver_sub: string) =>
                    create_notification({
                        receiver_sub,
                        actor_sub: post.user_sub,
                        action_type: "trend",
                        post_id: post.id,
                    })
                ));

                // Group tokens per eligible user so each receiver's push uses
                // their own first_name, and skipped users get no push either.
                const rowsByUser = new Map<string, { token: string; first_name: string }[]>();

                for (const row of tokens_result.rows as { user_sub: string; token: string; first_name: string }[]) {
                    if (!eligibleSet.has(row.user_sub)) continue;
                    if (!rowsByUser.has(row.user_sub)) rowsByUser.set(row.user_sub, []);
                    rowsByUser.get(row.user_sub)!.push({ token: row.token, first_name: row.first_name });
                }

                // Send one push per device token, personalized per user.
                await Promise.all(
                    Array.from(rowsByUser.entries()).flatMap(([, rows]) =>
                        rows.map(({ token, first_name }) =>
                            send_push_notification({
                                token,
                                title: `🔥 This is trending${ `, ${first_name}` || " "}`,
                                body: `${post.dish_name} is trending, tap to cook it!`,
                                image_url: image_url ?? undefined,
                                data: {
                                    type: "trending_post",
                                    post_id: post.id,
                                    trend_rank: post.trend_rank,
                                },
                            })
                        )
                    )
                );

                // Mark this post as notified so it's excluded from the
                // candidate query for the next 6 hours.
                await db.query(`
                    UPDATE post
                    SET last_trending_notification_at = NOW()
                    WHERE id = $1
                `, [post.id]);

                console.log(`[automated] => trending_noti_sent_${post.id}`);
            }

            console.log(`[automated] => trending_noti_finished`);
        } catch (e) {
            console.error(`[automated] => trending_noti_error_${e}`);
        }
    });
};