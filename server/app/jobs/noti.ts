import cron from "node-cron";
import db from "@/services/db";
import { getNowInTimezone } from "@/utils/time";
import { send_push_notification, send_push_notification_to_user_devices } from "@/services/push";
import { create_notification } from "@/routes/user/notification";
import { fetch_post_image_url } from "@/routes/feed/feed";

import { get_user_profile_name } from "@/routes/user/getProfile";

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
                    `[automated]=>cooking_checked_user_${row.user_sub}_at_time_${hour}:${minute}_with_target_${remHour}:${remMin}_window_${isWithinReminderWindow}`
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
                    title: "Let's cook ⏰",
                    body: "Try making something delicious today. 🍳",
                    data: { type: "cook_reminder" },
                });

                // Stamp send time so today's window won't fire again for this user.
                await db.query(
                    `UPDATE notification_settings
                     SET last_reminder_sent_at = NOW()
                     WHERE user_sub = $1`,
                    [row.user_sub]
                );

                console.log(`[automated]=>cooking_reminder_sent_user_${row.user_sub}`);
            }

            console.log(`[automated]=>cooking_reminder_finished`);
        } catch (e) {
            console.error(`[automated]=>cooking_reminder_error_${e}`);
        }
    });
};



/**
 * Independent notification systems:
 *
 * TREND:
 * - Selects globally trending posts.
 * - Does not use user taste embeddings.
 * - Notifies eligible users regardless of personal relevance.
 *
 */

const TREND_USER_COOLDOWN_INTERVAL = "4 hours";
const TREND_POST_COOLDOWN_INTERVAL = "6 hours";

/**
 * Notify users about globally trending posts.
 *
 * Runs every 30 minutes.
 * Selects the strongest currently trending post, then fans it out
 * to eligible users without filtering by taste embedding.
 */
export const send_push_noti_trending = () => {
    cron.schedule("*/30 * * * *", async () => {
        try {
            console.log("[automated] => trending_noti_started");

            const result = await db.query(`
                SELECT
                    p.id,
                    p.dish_name,
                    p.trend_rank,
                    p.trend_score,
                    p.trend_velocity,
                    p.user_sub
                FROM post p
                WHERE p.trend_rank <= 10
                  AND p.trend_score >= 0.08
                  AND p.last_ranked_at > NOW() - INTERVAL '2 hours'
                  AND (
                      p.last_trending_notification_at IS NULL
                      OR p.last_trending_notification_at
                          < NOW() - INTERVAL '${TREND_POST_COOLDOWN_INTERVAL}'
                  )
                ORDER BY
                    p.trend_score DESC,
                    p.trend_velocity DESC
                LIMIT 1
            `);

            if (result.rows.length === 0) {
                console.log("[automated] => trending_noti_no_candidates");
                return;
            }

            const post = result.rows[0];
            const image_url = await fetch_post_image_url(post.id);

            /*
             * All users with registered push tokens are candidates.
             * No user_embeddings or post_embeddings join here.
             *
             * DISTINCT prevents multi-device users from consuming
             * multiple recipient slots.
             */
            const receiversResult = await db.query(`
                SELECT DISTINCT pt.user_sub
                FROM push_tokens pt
                WHERE pt.user_sub <> $1
            `, [post.user_sub]);

            const candidateReceivers: string[] =
                receiversResult.rows.map(
                    (row: { user_sub: string }) => row.user_sub
                );

            if (candidateReceivers.length === 0) {
                console.log(
                    `[automated] => trending_noti_no_receivers_${post.id}`
                );
                return;
            }

            // Independent cooldown for global trending notifications.
            const cooldownResult = await db.query(`
                SELECT DISTINCT receiver_sub
                FROM notifications
                WHERE receiver_sub = ANY($1::text[])
                  AND action_type = 'trend'
                  AND created_at > NOW() - INTERVAL '${TREND_USER_COOLDOWN_INTERVAL}'
            `, [candidateReceivers]);

            const recentlyNotified = new Set<string>(
                cooldownResult.rows.map(
                    (row: { receiver_sub: string }) => row.receiver_sub
                )
            );

            const eligibleReceivers = candidateReceivers.filter(
                (sub) => !recentlyNotified.has(sub)
            );

            console.log(
                `[automated] => trending_post_${post.id}` +
                `_candidates_${candidateReceivers.length}` +
                `_eligible_${eligibleReceivers.length}`
            );

            if (eligibleReceivers.length === 0) {
                console.log(
                    `[automated] => trending_noti_all_on_cooldown_${post.id}`
                );
                return;
            }

            // Create one in-app notification per recipient.
            await Promise.all(
                eligibleReceivers.map((receiver_sub) =>
                    create_notification({
                        receiver_sub,
                        actor_sub: post.user_sub,
                        action_type: "trend",
                        post_id: post.id,
                    })
                )
            );

            // The helper delivers to the receiver's registered devices.
            await Promise.all(
                eligibleReceivers.map(async (receiver_sub) => {
                    try {
                        await send_push_notification_to_user_devices({
                            receiver_sub,
                            title: "🔥 This is trending",
                            body: `${post.dish_name} is trending on GoMeal. Tap to cook it!`,
                            image_url: image_url ?? undefined,
                            data: {
                                type: "trending_post",
                                image_url: image_url ?? undefined,
                                post_id: post.id,
                                trend_rank: post.trend_rank,
                            },
                        });
                    } catch (error) {
                        console.error(
                            `[automated] => trending_push_error_${receiver_sub}`,
                            error
                        );
                    }
                })
            );

            // Mark the post after processing its recipients.
            await db.query(`
                UPDATE post
                SET last_trending_notification_at = NOW()
                WHERE id = $1
            `, [post.id]);

            console.log(`[automated] => trending_noti_sent_${post.id}`);
        } catch (error) {
            console.error("[automated] => trending_noti_error", error);
        }
    });
};


/** 
 * WE THINK YOU'LL LIKE:
 * - Selects recommendations individually for each user.
 * - Does not require posts to be globally trending.
 * - Uses taste embedding similarity and recent content.
*/
const RECOMMENDATION_USER_COOLDOWN_INTERVAL = "12 hours";
const RECOMMENDATION_SIMILARITY_THRESHOLD = 0.55;

/**
 * "We think you'll like" personalized recommendations.
 *
 * Runs every 30 minutes.
 *
 * Unlike global trending, candidate posts do NOT need a trend rank
 * or minimum trend score. Each user receives the best eligible post
 * matching their taste embedding.
 *
 * Rules:
 * - Similarity must exceed the configured threshold.
 * - Exclude the post's author.
 * - Only recommend recent posts (last 7 days).
 * - Exclude the same user/post recommendation if already sent.
 * - Maximum one recommendation per user per 12 hours.
 * - Choose at most one post per user per run.
 */
export const send_push_noti_we_think_youll_like = () => {
    cron.schedule("*/30 * * * *", async () => {
        try {
            console.log(
                "[automated] => recommendation_noti_started"
            );

            /*
             * DISTINCT ON chooses each user's highest-similarity
             * eligible post.
             *
             * This query intentionally has no trend_rank or trend_score
             * condition: recommendations are independent of trending.
             */
            const candidatesResult = await db.query(`
                SELECT DISTINCT ON (ue.user_sub)
                    ue.user_sub AS receiver_sub,
                    p.id AS post_id,
                    p.dish_name,
                    p.user_sub AS actor_sub,
                    1 - (ue.embedding <=> pe.embedding) AS similarity
                FROM user_embeddings ue
                JOIN post_embeddings pe
                  ON TRUE
                JOIN post p
                  ON p.id = pe.post_id
                WHERE ue.user_sub <> p.user_sub
                  AND 1 - (ue.embedding <=> pe.embedding) >
                      $1::float
                  AND p.created_at > NOW() - INTERVAL '7 days'
                  AND EXISTS (
                      SELECT 1
                      FROM push_tokens pt
                      WHERE pt.user_sub = ue.user_sub
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM notifications n
                      WHERE n.receiver_sub = ue.user_sub
                        AND n.post_id = p.id
                        AND n.action_type = 'recommendation'
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM notifications n
                      WHERE n.receiver_sub = ue.user_sub
                        AND n.action_type = 'recommendation'
                        AND n.created_at >
                            NOW() - INTERVAL '${RECOMMENDATION_USER_COOLDOWN_INTERVAL}'
                  )
                ORDER BY
                    ue.user_sub,
                    (ue.embedding <=> pe.embedding) ASC,
                    p.created_at DESC
            `, [RECOMMENDATION_SIMILARITY_THRESHOLD]);

            if (candidatesResult.rows.length === 0) {
                console.log(
                    "[automated] => recommendation_noti_no_candidates"
                );
                return;
            }

            console.log(
                `[automated] => recommendation_candidates_${candidatesResult.rows.length}`
            );

            /*
             * Each row already represents one receiver and their
             * highest-similarity candidate.
             */
            for (const candidate of candidatesResult.rows) {
                try {
                    const image_url = await fetch_post_image_url(
                        candidate.post_id
                    );

                    const created = await create_notification({
                        receiver_sub: candidate.receiver_sub,
                        actor_sub: candidate.actor_sub,
                        action_type: "recommendation",
                        post_id: candidate.post_id,
                    });

                    if (!created) continue;

                    await send_push_notification_to_user_devices({
                        receiver_sub: candidate.receiver_sub,
                        title: "✨ We think you'll like this",
                        body: `${candidate.dish_name} might be right up your alley. Tap to check it out!`,
                        image_url: image_url ?? undefined,
                        data: {
                            type: "recommended_post",
                            post_id: candidate.post_id,
                            image_url: image_url ?? undefined,
                            similarity: Number(
                                candidate.similarity
                            ),
                        },
                    });

                    console.log(
                        `[automated] => recommendation_sent_` +
                        `${candidate.receiver_sub}_post_${candidate.post_id}` +
                        `_similarity_${Number(candidate.similarity).toFixed(3)}`
                    );
                } catch (error) {
                    console.error(
                        `[automated] => recommendation_error_` +
                        `${candidate.receiver_sub}_post_${candidate.post_id}`,
                        error
                    );
                }
            }

            console.log(
                "[automated] => recommendation_noti_finished"
            );
        } catch (error) {
            console.error(
                "[automated] => recommendation_noti_error",
                error
            );
        }
    });
};

/**
 * How long a message must sit unread before we send a "missed message" nudge.
 * The real delay is up to 5 minutes longer, since the cron only runs every 5 min.
 */
const MISSED_MESSAGE_DELAY = "30 minutes";

/**
 * Messages older than this are never nudged. Guards against a flood of stale
 * pushes after server downtime or a long-paused cron.
 */
const MISSED_MESSAGE_MAX_AGE = "24 hours";


/**
 * Cron job that sends a one-time "Missed message" push for chat messages
 * the receiver hasn't read.
 *
 * Runs every 5 minutes. On each run:
 *   1. Claims every message that is unread, active, older than
 *      MISSED_MESSAGE_DELAY, newer than MISSED_MESSAGE_MAX_AGE, and not yet
 *      nudged, by stamping `missed_push_sent_at` in a single
 *      UPDATE ... RETURNING. Claiming before sending guarantees a message
 *      can never be nudged twice, even if two runs overlap.
 *   2. Skips messages the receiver has deleted for themselves.
 *   3. Resolves the receiver as the other participant in the conversation and
 *      groups claimed messages by (conversation, sender, receiver), so five
 *      unread messages from one person produce ONE push, not five.
 *   4. Sends a push to each of the receiver's devices:
 *        - 1 message:  "<name> messaged you."
 *        - N messages: "<name> sent you N messages."
 *
 * Delivery is at-most-once: a failed APNs send is logged and NOT retried,
 * because the message was already marked as nudged. A duplicate nudge is
 * worse than a missed one.
 *
 * The push uses `type: "missed_message"` (not "message") on purpose. The iOS
 * notification extension treats `type == "message"` as a chat message and
 * builds a sender avatar from the title, which here is the static text
 * "Missed message". Any other type falls through to a plain notification.
 *
 * Requires: messages.missed_push_sent_at (timestamp, nullable) and the partial
 * index idx_messages_missed_push. Existing unread messages should be
 * backfilled at migration time so the first run doesn't nudge old history.
 */
export const send_push_missed_message = () => {
    cron.schedule("*/5 * * * *", async () => {
        try {
            /**
             * Claim unread messages in a single UPDATE ... RETURNING so the same
             * message can never be nudged twice, then group per conversation so
             * 5 unread messages from one person produce ONE push.
             * The receiver is the other participant in conversation_participants.
             */
            const result = await db.query(`
                WITH claimed AS (
                    UPDATE messages m
                    SET missed_push_sent_at = NOW()
                    WHERE m.is_read = false
                      AND m.status = 'active'
                      AND m.missed_push_sent_at IS NULL
                      AND m.sent_at < NOW() - INTERVAL '${MISSED_MESSAGE_DELAY}'
                      AND m.sent_at > NOW() - INTERVAL '${MISSED_MESSAGE_MAX_AGE}'
                      AND NOT EXISTS (
                          SELECT 1 FROM message_deletions md
                          WHERE md.message_id = m.id
                            AND md.user_sub <> m.sender_sub
                      )
                    RETURNING m.id, m.conversation_id, m.sender_sub
                )
                SELECT
                    c.conversation_id,
                    c.sender_sub,
                    cp.user_sub AS receiver_sub,
                    COUNT(*)::int AS missed_count
                FROM claimed c
                JOIN conversation_participants cp
                  ON cp.conversation_id = c.conversation_id
                 AND cp.user_sub <> c.sender_sub
                GROUP BY c.conversation_id, c.sender_sub, cp.user_sub
            `);

            if (result.rows.length === 0) return;

            console.log(`[automated]=>missed_message_started_${result.rows.length}`);

            for (const row of result.rows) {
                try {
                    const sender_name = await get_user_profile_name(row.sender_sub);

                    await send_push_notification_to_user_devices({
                        receiver_sub: row.receiver_sub,
                        title: "Missed message",
                        body: row.missed_count > 1
                            ? `${sender_name} sent you ${row.missed_count} messages.`
                            : `${sender_name} messaged you.`,
                        data: {
                            type: "missed_message", // NOT "message", see below
                            sender_id: row.sender_sub,
                            conversation_id: String(row.conversation_id),
                        },
                    });
                } catch (e) {
                    // one bad token/user shouldn't stop the rest of the batch
                    console.error(`[automated]=>missed_message_error_${row.receiver_sub}_${e}`);
                }
            }

            console.log(`[automated]=>missed_message_finished`);
        } catch (e) {
            console.error(`[automated]=>missed_message_error_${e}`);
        }
    });
};