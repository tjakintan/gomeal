import db from "@/services/db";
import { MinimumFeedCard } from "@/types/feed.types";
import { MinimumProfile } from "@/types/profile.types";

export const get_search_post = async (query: string, limit: number): Promise<MinimumFeedCard[]> => {

    try {

        if (!query.trim()) return [];

        const result = await db.query(
            `
            SELECT
                id AS post_id,
                dish_name,
                image_url,
                media_type
            FROM post
            WHERE status = 'active'
            AND (
                dish_name ILIKE '%' || $1 || '%' OR
                description ILIKE '%' || $1 || '%'
            )
            ORDER BY created_at DESC
            LIMIT $2
            `,
            [query, limit]
        );

        return result.rows.map((row: any): MinimumFeedCard => ({
            post_id: row.post_id,
            info: {
                dish_name: row.dish_name,
                dish_media_url: row.image_url,
                dish_media_type: row.media_type,
            },
        }));

    } catch (err) {

        console.error(err);
        throw new Error("failed_to_search_posts");

    }
};

export const get_search_users = async (query: string, limit: number = 20): Promise<MinimumProfile[]> => {

    try {

        if (!query.trim()) return [];

        const result = await db.query(
            `
            SELECT
                sub,
                profile_name,
                first_name,
                last_name,
                profile_img_url,
                bio,
                website,
                badge,
                avatar
            FROM users
            WHERE status = 'active'
            AND (
                profile_name ILIKE '%' || $1 || '%' OR
                first_name ILIKE '%' || $1 || '%' OR
                last_name ILIKE '%' || $1 || '%'
            )
            ORDER BY profile_name ASC
            LIMIT $2
            `,
            [query, limit]
        );

        return result.rows.map((row: any): MinimumProfile => ({
            sub: row.sub,
            badge: row.badge,
            profile_name: row.profile_name,
            firstName: row.first_name,
            lastName: row.last_name,
            avatar: row.avatar,
            profile_img_url: row.profile_img_url,
            bio: row.bio,
            website: row.website,
        }));

    } catch (err) {

        console.error(err);
        throw new Error("failed_to_search_users");

    }

};
export const get_search_posts_by_ids = async (post_ids: number[]): Promise<MinimumFeedCard[]> => {
    
    try {
        if (!post_ids.length) return [];

        const result = await db.query(
            `
            SELECT
                id AS post_id,
                dish_name,
                image_url,
                media_type
            FROM post
            WHERE status = 'active'
                AND id = ANY($1::int[])
            `,
            [post_ids]
        );

        const rowsById = new Map(
            result.rows.map((row: any) => [
                Number(row.post_id),
                {
                    post_id: row.post_id,
                    info: {
                        dish_name: row.dish_name,
                        dish_media_url: row.image_url,
                        dish_media_type: row.media_type,
                    },
                } as MinimumFeedCard,
            ])
        );

        return post_ids
            .map((id) => rowsById.get(Number(id)))
            .filter(Boolean) as MinimumFeedCard[];
            
    } catch (err) {
        console.error(err);
        throw new Error("failed_to_get_search_posts_by_ids");
    }
};

export const get_search_users_by_subs = async (user_subs: string[]): Promise<MinimumProfile[]> => {

    try {

        if (!user_subs.length) return [];

        const result = await db.query(
            `
            SELECT
                sub,
                profile_name,
                first_name,
                last_name,
                profile_img_url,
                bio,
                website,
                badge,
                avatar
            FROM users
            WHERE status = 'active'
                AND sub = ANY($1::text[])
            `,
            [user_subs]
        );

        const rowsBySub = new Map(
            result.rows.map((row: any) => [
                String(row.sub),
                {
                    sub: row.sub,
                    badge: row.badge,
                    profile_name: row.profile_name,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    avatar: row.avatar,
                    profile_img_url: row.profile_img_url,
                    bio: row.bio,
                    website: row.website,
                } as MinimumProfile,
            ])
        );

        return user_subs
            .map((sub) => rowsBySub.get(String(sub)))
            .filter(Boolean) as MinimumProfile[];

    } catch (err) {
        console.error(err);
        throw new Error("failed_to_get_search_users_by_subs");
    }
};
export const get_search = async (
    query: string,
    limit: number = 20
): Promise<{
    users: MinimumProfile[];
    posts: MinimumFeedCard[];
}> => {

    try {

        if (!query.trim()) {
            return {
                users: [],
                posts: [],
            };
        }

        const [users, posts] = await Promise.all([
            get_search_users(query, limit),
            get_search_post(query, limit),
        ]);

        return {
            users,
            posts,
        };

    } catch (err) {

        console.error(err);
        throw new Error("failed_to_get_search");

    }

};