import db from "@/services/db";
import { ActionType, Avatar, BadgeLevel } from "@/types/user.types";
import log_user_actions from "./log";
import { ActionWeights } from "@/types/user.types";

export const get_reward_user_action = async (
    user_sub: string,
    action: ActionType
): Promise<{
    xp: number;
    bread: number;
    level: number;
    badge: BadgeLevel;
    xpDelta: number;
    breadDelta: number;
} | null> => {

    const XP_PER_LEVEL = 100;

    const REWARDS: Record<ActionType, { xp: number; bread: number }> = {
        CREATE_POST: { xp: 30, bread: 15 },
        LIKE_POST: { xp: 15, bread: 7 },
        COOK_POST: { xp: 50, bread: 25 },
        VIEW_POST: { xp: 5, bread: 2 },
        DELETE_POST: { xp: -30, bread: 0 },
        SHARE_POST: { xp: 20, bread: 10 },
        STAR_POST: { xp: 25, bread: 12 },
    };

    const reward = REWARDS[action];
    if (!reward) return null;

    const client = await db.connect();

    try {

        await client.query("BEGIN");

        const result = await client.query(
            `
            WITH updated AS (
                SELECT
                sub,
                GREATEST(0, xp + $2) AS new_xp,
                GREATEST(0, bread + $3) AS new_bread,
                FLOOR(GREATEST(0, xp + $2) / $4) + 1 AS new_level
                FROM users
                WHERE sub = $1
                AND status = 'active'
            )
            UPDATE users u
            SET
                xp = updated.new_xp,
                bread = updated.new_bread,
                level = updated.new_level,
                badge = CASE
                    WHEN updated.new_level >= 200 THEN 6
                    WHEN updated.new_level >= 120 THEN 5
                    WHEN updated.new_level >= 70  THEN 4
                    WHEN updated.new_level >= 40  THEN 3
                    WHEN updated.new_level >= 20  THEN 2
                    ELSE 1
                END,
                last_action_at = NOW()
            FROM updated
            WHERE u.sub = updated.sub
            RETURNING u.xp, u.bread, u.level, u.badge
            `,
            [user_sub, reward.xp, reward.bread, XP_PER_LEVEL]
        );

        if (!result.rows.length) {
            await client.query("ROLLBACK");
            return null;
        }

        await client.query("COMMIT");

        const { xp, bread, level, badge } = result.rows[0];

        return {
            xp,
            bread,
            level,
            badge,
            xpDelta: reward.xp,
            breadDelta: reward.bread,
        };

    } catch (err: any) {

        await client.query("ROLLBACK");
        console.error("Reward error", err.detail ?? err.message);
        return null;
    } finally {
        client.release();
    }
};

type LeaderboardEntry = {
    sub: string;
    rank: number;
    avatar: Avatar;
    first_name: string;
    last_name: string;
    profile_name: string;
    xp: number;
    level: number;
    badge: BadgeLevel;
    bread: number;
};
export const get_leaderboard_rankings = async (
    limit: number = 10,
    cursor: number = 0
): Promise<{ rankings: LeaderboardEntry[]; hasMore: boolean } | null> => {
    const client = await db.connect();
    try {
        const result = await client.query(
            `
            SELECT
                ROW_NUMBER() OVER (
                    ORDER BY level DESC, xp DESC, bread DESC, last_action_at ASC, sub ASC
                )::int AS rank,
                sub, avatar, first_name, last_name, profile_name, xp, level, badge, bread
            FROM users
            WHERE status = 'active'
            ORDER BY level DESC, xp DESC, bread DESC, last_action_at ASC, sub ASC
            LIMIT $1 OFFSET $2
            `,
            [limit + 1, cursor]
        );

        if (!result.rows.length) return { rankings: [], hasMore: false };

        const hasMore = result.rows.length > limit;
        return { rankings: result.rows.slice(0, limit), hasMore };
    } catch (err: any) {
        console.error("Leaderboard error", err.detail ?? err.message);
        return null;
    } finally {
        client.release();
    }
};

export const get_user_global_rank = async (
    user_sub: string
): Promise<number | null> => {

    const client = await db.connect();

    try {

        const result = await client.query(
            `
            SELECT rank FROM (
                SELECT
                    sub,
                    ROW_NUMBER() OVER (
                        ORDER BY level DESC, xp DESC, bread DESC, last_action_at ASC, sub ASC
                    )::int AS rank
                FROM users
                WHERE status = 'active'
            ) ranked
            WHERE sub = $1
            `,
            [user_sub]
        );

        if (!result.rows.length) return null;

        return result.rows[0].rank;

    } catch (err: any) {

        console.error("Global rank error", err.detail ?? err.message);
        return null;

    } finally {
        client.release();
    }
};