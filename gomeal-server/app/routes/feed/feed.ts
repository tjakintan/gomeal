import db from "@/services/db";
import { FeedActionCountsTypes, FeedCard, FeedDBRow, FullPost } from "@/types/feed.types";
import { getFeedActionCounts, getFeedUserAction } from "./actions";
import { DietaryData, DishInfoData, Ingredient, MediaType, NutritionData, StepData } from "@/types/food.types";
import { Avatar } from "@/types/user.types";
import { BLOCKED_USER_FILTER } from "../user/block";
import { parseNutrition } from "@/utils/food";

export const fetch_feed_post = async (limit: number, user_sub: string): Promise<FeedCard[]> => {
    try {
        const result = await db.query(
            `SELECT
                p.id,
                p.user_sub,
                p.dish_name,
                p.description,
                p.difficulty,
                p.image_url,
                p.dietary,
                p.media_type,
                jsonb_array_length(p.ingredients) AS num_ingredients,
                u.profile_name,
                u.first_name AS "firstName",
                u.last_name AS "lastName",
                u.level,
                u.tag_color,
                u.avatar
            FROM post p
            JOIN users u on p.user_sub = u.sub
            WHERE P.status = 'active'
            ${BLOCKED_USER_FILTER}
            ORDER BY p.created_at DESC
            LIMIT $1`,
            [limit, user_sub]
        );

        const rows = result.rows as FeedDBRow[];

        const feedCards: FeedCard[] = await Promise.all(
            rows.map(async (row): Promise<FeedCard> => {
                const action_counts = await getFeedActionCounts(row.id);
                const user_actions = await getFeedUserAction(row.id, user_sub);

                return {
                    post_id: row.id,
                    user_sub: row.user_sub,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    info: {
                        dish_media_file: null,
                        dish_media_url: row.image_url,
                        dish_media_type: row.media_type as MediaType,
                        dish_name: row.dish_name,
                        dish_description: row.description,
                        dish_difficulty: row.difficulty as "Easy" | "Medium" | "Hard" | "",
                    } as DishInfoData,
                    dietary: row.dietary as DietaryData,
                    num_ingredients: Number(row.num_ingredients),
                    profile_name: row.profile_name,
                    level: row.level,
                    avatar: row.avatar as Avatar ?? null,
                    action_counts: action_counts as FeedActionCountsTypes,
                    tag_color: row.tag_color,
                    user_actions,
                };
            })
        );

        return feedCards;

    } catch (err) {
        console.error("[fetchFeedPosts] Database query failed:", err);
        throw err;
    }
};

export const fetch_feed_post_by_id_feed_card = async (post_id: number, user_sub: string): Promise<FeedCard> => {

    try {

        const result = await db.query(
            `SELECT
                p.id,
                p.user_sub,
                p.dish_name,
                p.description,
                p.difficulty,
                p.image_url,
                p.dietary,
                p.media_type,
                jsonb_array_length(p.ingredients) AS num_ingredients,
                u.profile_name,
                u.first_name AS "firstName",
                u.last_name AS "lastName",
                u.level,
                u.tag_color,
                u.avatar
            FROM post p
            JOIN users u ON p.user_sub = u.sub
            WHERE p.id = $1
                AND p.status = 'active'
                ${BLOCKED_USER_FILTER}
            LIMIT 1`,
            [post_id, user_sub]
        );

        if (result.rows.length === 0) {
            throw new Error(`Feed post ${post_id} not found`);
        }

        const row = result.rows[0] as FeedDBRow;

        const action_counts = await getFeedActionCounts(row.id);
        const user_actions = await getFeedUserAction(row.id, user_sub);

        return {
            post_id: row.id,
            user_sub: row.user_sub,
            firstName: row.firstName,
            lastName: row.lastName,
            info: {
                dish_media_file: null,
                dish_media_url: row.image_url,
                dish_media_type: row.media_type as MediaType,
                dish_name: row.dish_name,
                dish_description: row.description,
                dish_difficulty: row.difficulty as "Easy" | "Medium" | "Hard" | "",
            } as DishInfoData,
            dietary: row.dietary as DietaryData,
            num_ingredients: Number(row.num_ingredients),
            profile_name: row.profile_name,
            level: row.level,
            avatar: (row.avatar as Avatar) ?? null,
            action_counts: action_counts as FeedActionCountsTypes,
            tag_color: row.tag_color,
            user_actions,
        };

  } catch (err) {
    console.error("[fetchFeedPostById] Database query failed:", err);
    throw err;
  }
};

export const fetch_post_by_id_full_post = async (post_id: number, user_sub: string): Promise<FullPost> => {

    try {

        const result = await db.query(
        `SELECT
            p.id,
            p.dish_name,
            p.description,
            p.difficulty,
            p.image_url,
            p.media_type,
            p.dietary,
            p.nutrition,
            p.user_sub,
            p.ingredients,
            p.steps,
            u.profile_name,
            u.first_name AS "firstName",
            u.last_name AS "lastName",
            u.level,
            u.avatar
        FROM post p
        JOIN users u ON p.user_sub = u.sub
        WHERE p.id = $1 AND p.status = 'active' ${BLOCKED_USER_FILTER}`,
        [post_id, user_sub]
        );

        if (result.rows.length === 0) throw new Error(`Post ${post_id} not found`);

        const row = result.rows[0];
        const action_counts = await getFeedActionCounts(row.id);
        const user_actions = await getFeedUserAction(row.id, row.user_sub);

        return {
            post_id: row.id,
            user_sub: row.user_sub,
            firstName: row.firstName,
            lastName: row.lastName,
            info: {
                dish_media_file: null,
                dish_media_url: row.image_url,
                dish_media_type: row.media_type as MediaType,
                dish_name: row.dish_name,
                dish_description: row.description,
                dish_difficulty: row.difficulty as "Easy" | "Medium" | "Hard" | "",
            } as DishInfoData,

            dietary: row.dietary as DietaryData,
            num_ingredients: row.ingredients.length,
            nutrition: [parseNutrition(row.nutrition)],
            profile_name: row.profile_name,
            level: row.level,
            avatar: row.avatar as Avatar ?? null,
            action_counts: action_counts as FeedActionCountsTypes,
            user_actions,
            ingredients: row.ingredients as Ingredient[],
            steps: row.steps as StepData[],
        };

    } catch (err) {
        console.error("[fetchPostById] Database query failed:", err);
        throw err;
    }
};

export const fetch_post_image_url = async (post_id: number): Promise<string | null> => {
    try {
        const result = await db.query(
            `
            SELECT image_url
            FROM post
            WHERE id = $1
              AND status = 'active'
            LIMIT 1
            `,
            [post_id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].image_url;
    } catch (err) {
        console.error("[fetchPostImageUrl] Database query failed:", err);
        throw err;
    }
};