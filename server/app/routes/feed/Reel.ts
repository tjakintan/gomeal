import db from "@/services/db";
import { ReelFeedCard, FeedActionCountsTypes, ReelDBRow } from "@/types/feed.types";
import { DishInfoData, NutritionData } from "@/types/food.types";
import { getFeedActionCounts, getFeedUserAction } from "./actions";
import { BLOCKED_USER_FILTER } from "../user/block";
import { parseNutrition } from "@/utils/food";

export const fetch_reel_post = async (limit: number, user_sub: string): Promise<ReelFeedCard[]> => {
    
    try {
        
        const result = await db.query(
            `SELECT
                p.id,
                p.user_sub,
                p.dish_name,
                p.description,
                p.difficulty,
                p.image_url,
                p.media_type,
                p.dietary,
                p.nutrition,
                u.profile_name,
                u.first_name AS "firstName",
                u.last_name AS "lastName",
                u.level,
                u.avatar
            FROM post p
            JOIN users u ON p.user_sub = u.sub
            WHERE p.status = 'active'
            ${BLOCKED_USER_FILTER}
            ORDER BY p.created_at DESC
            LIMIT $1`,
            [limit, user_sub]
        );

        const rows = result.rows as any[];
        const cards = await Promise.all(

            rows.map(async (row): Promise<ReelFeedCard> => {

                const action_counts = await getFeedActionCounts( row.id);
                const user_actions = await getFeedUserAction(row.id, user_sub);

                return {

                    post_id: row.id,
                    user_sub: row.user_sub,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    level: row.level,
                    profile_name: row.profile_name,
                    avatar: row.avatar,
                    dietary: row.dietary,
                    nutrition: [parseNutrition(row.nutrition)],
                    info: {
                        dish_media_file: null,
                        dish_media_url: row.image_url,
                        dish_name: row.dish_name,
                        dish_media_type: row.media_type,
                        dish_description: row.description,
                        dish_difficulty: row.difficulty as "Easy" | "Medium" | "Hard" | "",
                    } as DishInfoData,
                    action_counts: action_counts as FeedActionCountsTypes,
                    user_actions,
                };

            })
        );

        return cards;

    } catch (err) {

        console.error("[fetchReelPosts] Database query failed:", err);
        throw err;

    }
};

export const fetch_reel_posts_by_ids = async (
    post_ids: number[],
    user_sub: string
): Promise<ReelFeedCard[]> => {
    if (!post_ids.length) return [];

    // ensure it returns an array for user actions
    const result = await db.query(
        `SELECT
            p.id,
            p.user_sub,
            p.dish_name,
            p.description,
            p.difficulty,
            p.image_url,
            p.media_type,
            p.dietary,
            p.nutrition,
            u.profile_name,
            u.first_name AS "firstName",
            u.last_name AS "lastName",
            u.level,
            u.avatar,

            COUNT(DISTINCT CASE WHEN fa.action_type = 'post_love' THEN fa.id END)::int AS post_love,
            COUNT(DISTINCT CASE WHEN fa.action_type = 'post_star' THEN fa.id END)::int AS post_star,
            COUNT(DISTINCT CASE WHEN fa.action_type = 'post_cook' THEN fa.id END)::int AS post_cook,
            COUNT(DISTINCT CASE WHEN fa.action_type = 'post_share' THEN fa.id END)::int AS post_share,

            COALESCE(
                JSONB_AGG(DISTINCT fa2.action_type)
                    FILTER (WHERE fa2.action_type IS NOT NULL),
                '[]'::jsonb
            ) AS user_actions

        FROM post p
        JOIN users u ON p.user_sub = u.sub
        LEFT JOIN post_actions fa
            ON fa.post_id = p.id
        LEFT JOIN post_actions fa2
            ON fa2.post_id = p.id
            AND fa2.user_sub = $2
        WHERE p.id = ANY($1)
            AND p.status = 'active'
            ${BLOCKED_USER_FILTER}
        GROUP BY p.id, u.sub`,
        [post_ids, user_sub]
    );

    const rows = result.rows as ReelDBRow[];
    const rowMap = new Map(rows.map((r) => [r.id, r]));
    

    return post_ids
        .map((id) => {
            const row = rowMap.get(id);
            if (!row) return null;
            return {
                post_id: row.id,
                user_sub: row.user_sub,
                firstName: row.firstName,
                lastName: row.lastName,
                level: row.level,
                profile_name: row.profile_name,
                avatar: row.avatar,
                dietary: row.dietary,
                nutrition: [parseNutrition(row.nutrition)],
                info: {
                    dish_media_file: null,
                    dish_media_url: row.image_url,
                    dish_name: row.dish_name,
                    dish_media_type: row.media_type,
                    dish_description: row.description,
                    dish_difficulty: row.difficulty,
                } as DishInfoData,
                action_counts: {
                    post_love: row.post_love,
                    post_star: row.post_star,
                    post_cook: row.post_cook,
                    post_share: row.post_share,
                } as FeedActionCountsTypes,
                user_actions: row.user_actions ?? [],
            } as ReelFeedCard;
        })
        .filter(Boolean) as ReelFeedCard[];
};
