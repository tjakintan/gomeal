import db from "@/services/db";
import { MinimumProfile, UltraMinimumProfile } from "@/types/profile.types";

export const BLOCKED_USER_FILTER = `
    AND NOT EXISTS (
        SELECT 1
        FROM user_blocks ub
        WHERE
            (ub.blocker_sub = $2 AND ub.blocked_sub = p.user_sub)
            OR
            (ub.blocker_sub = p.user_sub AND ub.blocked_sub = $2)
    )
`;

export async function block_user(
    blocker_sub: string,
    blocked_sub: string
): Promise<{ ok: true }> {

    if (blocker_sub === blocked_sub) {
        throw new Error("cannot_block_self");
    }

    await db.query(
        `
        INSERT INTO user_blocks (blocker_sub, blocked_sub)
        VALUES ($1, $2)
        ON CONFLICT (blocker_sub, blocked_sub) DO NOTHING
        `,
        [blocker_sub, blocked_sub]
    );

    return { ok: true };
}

export async function is_user_blocked(
    user_a_sub: string,
    user_b_sub: string
): Promise<boolean> {

    if (!user_a_sub || !user_b_sub) return false;
    if (user_a_sub === user_b_sub) return false;

    const result = await db.query(
        `
        SELECT 1
        FROM user_blocks
        WHERE 
            (blocker_sub = $1 AND blocked_sub = $2)
            OR
            (blocker_sub = $2 AND blocked_sub = $1)
        LIMIT 1
        `,
        [user_a_sub, user_b_sub]
    );

    return result.rowCount > 0;
};

export async function get_blocked_users(
    blocker_sub: string
): Promise<UltraMinimumProfile[]> {
    const result = await db.query(
        `
        SELECT
            u.sub,
            u.profile_name,
            u.first_name,
            u.last_name,
            u.profile_img_url,
            u.badge,
            u.avatar
        FROM user_blocks ub
        JOIN users u
            ON u.sub = ub.blocked_sub
        WHERE ub.blocker_sub = $1
          AND u.status = 'active'
        ORDER BY ub.created_at DESC
        `,
        [blocker_sub]
    );

    return result.rows.map((row: any): UltraMinimumProfile => ({
        sub: row.sub,
        badge: row.badge,
        profile_name: row.profile_name,
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar,
        profile_img_url: row.profile_img_url,
    }));
};

export async function remove_blocked_user(
    blocker_sub: string,
    blocked_sub: string
): Promise<{ ok: true }> {

    if (blocker_sub === blocked_sub) {
        throw new Error("cannot_unblock_self");
    }

    await db.query(
        `
        DELETE FROM user_blocks
        WHERE blocker_sub = $1
          AND blocked_sub = $2
        `,
        [blocker_sub, blocked_sub]
    );

    return { ok: true };
};
