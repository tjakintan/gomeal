import db from "@/services/db";
import { FeedActionCountsTypes, FeedActionType, MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import log_user_actions from "../user/log";
import { MediaType } from "@/types/food.types";

export const get_post_user_sub = async (post_id: number): Promise<string | null> => {

    const result = await db.query(
        `SELECT user_sub FROM post WHERE id = $1 LIMIT 1`,
        [post_id]
    );

    return result.rows[0]?.user_sub ?? null;

};

export const getFeedUserAction = async (post_id: number, user_sub: string): Promise<FeedActionType[]> => {

    try {

        const result = await db.query(
            `SELECT action_type 
             FROM post_actions 
             WHERE post_id = $1 AND user_sub = $2`,
            [post_id, user_sub]
        );

        const userActions: FeedActionType[] = result.rows.map(
            (row: { action_type: FeedActionType }) => row.action_type
        );

        return userActions;

    } catch (err) {

        throw new Error("failed_to_get_user_actions");
    }
};

export const setFeedActionCount = async (post_id: number, user_sub: string, action_type: FeedActionType) => {

    try {

        // -- optional, front end already ensures it can't be spammed
        const existing = await db.query(
            `SELECT id FROM post_actions 
            WHERE post_id=$1 AND user_sub=$2 AND action_type=$3`,
            [post_id, user_sub, action_type]
        );

        if (existing.rowCount > 0) {

            // -- if somehow, delete
            await db.query(
                `DELETE FROM post_actions 
                WHERE post_id=$1 AND user_sub=$2 AND action_type=$3`,
                [post_id, user_sub, action_type]
            );

        } else {

            await db.query(
                `INSERT INTO post_actions (post_id, user_sub, action_type) 
                VALUES ($1, $2, $3)`,
                [post_id, user_sub, action_type]
            );

        }

        const counts = await getFeedActionCounts(post_id);
        return counts;

    } catch (err) {
        
        console.error(err);
        throw new Error("failed_to_set_post_action");
    
    }

};

export const getFeedActionCounts = async (post_id: number): Promise<FeedActionCountsTypes> => {

    try {

        const countsResult = await db.query(
            `SELECT action_type, COUNT(*) AS count
            FROM post_actions
            WHERE post_id=$1
            GROUP BY action_type`,
            [post_id]
        );

        const action_counts: FeedActionCountsTypes = {
            post_love: 0,
            post_cook: 0,
            post_star: 0,
            post_share: 0,
        };

        countsResult.rows.forEach((row: { action_type: FeedActionType; count: string }) => {
            switch (row.action_type) {
                case "post_love":
                    action_counts.post_love = parseInt(row.count, 10);
                    break;
                case "post_cook":
                    action_counts.post_cook = parseInt(row.count, 10);
                    break;
                case "post_star":
                    action_counts.post_star = parseInt(row.count, 10);
                    break;
                case "post_share":
                    action_counts.post_share = parseInt(row.count, 10);
                    break;
            }
        });

        return action_counts;

    } catch (err) {
        
        console.error(err);
        throw new Error("failed_to_get_post_counts");
    }

};

export const getUserPosts = async (user_sub: string, limit = 100): Promise<UserActionedPostsType> => {

    const grouped: UserActionedPostsType = {
        post_made: [],
        post_love: [],
        post_cook: [],
        post_star: [],
        post_share: [],
    };

    // Query 1: posts the user made
    const madeResult = await db.query(
        `SELECT p.id AS post_id, p.dish_name, p.image_url, p.media_type
         FROM post p
         WHERE p.user_sub = $1 AND p.status = 'active'
         ORDER BY p.id DESC
         LIMIT $2`,
        [user_sub, limit]
    );

    // Query 2: posts the user actioned (excluding their own to avoid double-counting)
    const actionedResult = await db.query(
        `SELECT p.id AS post_id, p.dish_name, p.image_url, p.media_type, pa.action_type
         FROM post_actions pa
         JOIN post p ON pa.post_id = p.id
         WHERE pa.user_sub = $1 AND p.status = 'active'
         ORDER BY p.id DESC
         LIMIT $2`,
        [user_sub, limit]
    );

    const allPostIds = [
        ...madeResult.rows.map((r: any) => r.post_id),
        ...actionedResult.rows.map((r: any) => r.post_id),
    ];

    const uniqueIds = [...new Set(allPostIds)];

    const countsMap = Object.fromEntries(
        await Promise.all(uniqueIds.map(async (id) => [id, await getFeedActionCounts(Number(id))]))
    );

    for (const row of madeResult.rows) {
        grouped.post_made.push({
            post_id: row.post_id,
            info: {
                dish_name: row.dish_name,
                dish_media_url: row.image_url,
                dish_media_type: row.media_type,
            },
            action_counts: countsMap[row.post_id],
        });
    }

    for (const row of actionedResult.rows) {
        grouped[row.action_type as FeedActionType].push({
            post_id: row.post_id,
            info: {
                dish_name: row.dish_name,
                dish_media_url: row.image_url,
                dish_media_type: row.media_type,
            },
            action_counts: countsMap[row.post_id],
        });
    }

    return grouped;

};

export const getUserActionCounts = async (user_sub: string) => {

    try {

        const result = await db.query(
            `SELECT pa.action_type, COUNT(*)::int AS count
             FROM post_actions pa
             JOIN post p ON pa.post_id = p.id
             WHERE p.user_sub = $1
             GROUP BY pa.action_type`,
            [user_sub]
        );

        const actionCounts: Record<FeedActionType, number> = {
            post_love: 0,
            post_cook: 0,
            post_star: 0,
            post_share: 0,
        };

        result.rows.forEach((row: { action_type: FeedActionType; count: number }) => {
            actionCounts[row.action_type] = row.count;
        });

        return {
            num_of_likes: actionCounts.post_love,
            num_of_cooks: actionCounts.post_cook,
            num_of_stars: actionCounts.post_star,
            num_of_shares: actionCounts.post_share,
        };

    } catch (err) {

        console.error(err);
        throw new Error("failed_to_get_action_counts_against_user");
    }

};

export const get_post_by_id = async (post_id: number) => {

    try {

        const result = await db.query(
            `
            SELECT
                p.id,
                p.user_sub,
                p.dish_name,
                p.description,
                p.image_url,
                p.media_type,
                p.status,
                u.profile_name,
                u.first_name,
                u.last_name
            FROM post p
            LEFT JOIN users u
                ON u.sub = p.user_sub
            WHERE p.id = $1
              AND p.status = 'active'
            LIMIT 1
            `,
            [post_id]
        );

        if (!result.rows.length) return null;

        const row = result.rows[0];

        return {
            post_id: row.id,
            user_sub: row.user_sub,
            dish_name: row.dish_name,
            description: row.description,
            image_url: row.image_url,
            media_type: row.media_type as MediaType,
            status: row.status,
            profile_name: row.profile_name,
            first_name: row.first_name,
            last_name: row.last_name,
        };       

    } catch (err) {
        throw new Error(`failed_to_get_post_${err}`)
    }
};

export const delete_post = async (post_id: number, user_sub: string): Promise<boolean> => {
    try {
        const result = await db.query(
            `
            UPDATE post
            SET status = 'deleted'
            WHERE id = $1
              AND user_sub = $2
              AND status = 'active'
            RETURNING id
            `,
            [post_id, user_sub]
        );

        return (result.rowCount ?? 0) > 0;

    } catch (err) {
        console.error(err);
        throw new Error("failed_to_delete_post");
    }
};
