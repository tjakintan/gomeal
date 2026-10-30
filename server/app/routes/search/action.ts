import db from "@/services/db";
import { SearchFeedCard } from "@/types/feed.types";
import { MinimumProfile } from "@/types/profile.types";
import { blockedFilter } from "../user/block";

export const get_search_post = async (
    query: string,
    limit: number,
    requester_sub: string,
): Promise<SearchFeedCard[]> => {
    try {
        if (!query.trim()) return [];

        const result = await db.query(
            `
            SELECT
                p.id AS post_id,
                p.dish_name,
                p.description AS dish_description,
                p.difficulty AS dish_difficulty,
                p.image_url,
                p.media_type,
                p.user_sub,

                u.profile_name,
                u.avatar,
                u.tag_color,
                u.first_name,
                u.last_name,
                u.level,
                u.xp,
                u.badge

            FROM post p

            JOIN users u
                ON u.sub = p.user_sub

            WHERE p.status = 'active'
                AND u.status = 'active'
                ${blockedFilter("$3", "p.user_sub")}
                AND (
                    p.dish_name ILIKE '%' || $1 || '%' OR
                    p.description ILIKE '%' || $1 || '%'
                )

            ORDER BY p.created_at DESC
            LIMIT $2
            `,
            [query, limit, requester_sub]
        );

        return result.rows.map((row: any): SearchFeedCard => ({
            post_id: row.post_id,

            info: {
                dish_media_file: null,
                dish_media_url: row.image_url,
                dish_media_type: row.media_type,
                dish_name: row.dish_name,
                dish_description: row.dish_description ?? "",
                dish_difficulty: row.dish_difficulty ?? "",
            },

            user_sub: row.user_sub,
            profile_name: row.profile_name,
            avatar: row.avatar,
            tag_color: row.tag_color,
            firstName: row.first_name,
            lastName: row.last_name,
            level: row.level,
            xp: row.xp,
            badge: row.badge,
        }));

    } catch (err) {
        console.error(err);
        throw new Error("failed_to_search_posts");
    }
};

export const get_search_users = async (
    query: string,
    limit: number = 20,
    requester_sub: string, 
): Promise<MinimumProfile[]> => {
    try {
        if (!query.trim()) return [];

        const result = await db.query(
            `
            SELECT
                sub, profile_name, first_name, last_name, profile_img_url,
                bio, website, badge, avatar, tag_color, level, xp
            FROM users
            WHERE status = 'active'
                AND sub <> $3::text
                ${blockedFilter("$3", "users.sub")}
                AND (
                    profile_name ILIKE '%' || $1 || '%' OR
                    first_name ILIKE '%' || $1 || '%' OR
                    last_name ILIKE '%' || $1 || '%'
                )
            ORDER BY profile_name ASC
            LIMIT $2
            `,
            [query, limit, requester_sub]
        );

        return result.rows.map((row: any): MinimumProfile => ({
            sub: row.sub,
            badge: row.badge,
            avatar: row.avatar,
            profile_name: row.profile_name,
            firstName: row.first_name,
            lastName: row.last_name,
            profile_img_url: row.profile_img_url,
            bio: row.bio,
            website: row.website,
            tag_color: row.tag_color,
            level: row.level,
            xp: row.xp,
        }));

    } catch (err) {
        console.error(err);
        throw new Error("failed_to_search_users");
    }
};

export const get_search_posts_by_ids = async (
    post_ids: number[],
    requester_sub: string,
): Promise<SearchFeedCard[]> => {
    try {
        if (!post_ids.length) return [];

        const result = await db.query(
            `
            SELECT
                p.id AS post_id,
                p.dish_name,
                p.description AS dish_description,
                p.difficulty AS dish_difficulty,
                p.image_url,
                p.media_type,

                p.user_sub,
                u.profile_name,
                u.avatar,
                u.tag_color,
                u.first_name,
                u.last_name,
                u.level,
                u.xp,
                u.badge

            FROM post p

            JOIN users u
                ON u.sub = p.user_sub

            WHERE p.status = 'active'
                AND u.status = 'active'
                AND p.id = ANY($1::int[])
                ${blockedFilter("$2", "p.user_sub")}
            `,
            [post_ids, requester_sub]
        );

        const rowsById = new Map(
            result.rows.map((row: any) => [
                Number(row.post_id),
                {
                    post_id: row.post_id,

                    info: {
                        dish_media_file: null,
                        dish_media_url: row.image_url,
                        dish_media_type: row.media_type,
                        dish_name: row.dish_name,
                        dish_description: row.dish_description ?? "",
                        dish_difficulty: row.dish_difficulty ?? "",
                    },

                    user_sub: row.user_sub,
                    profile_name: row.profile_name,
                    avatar: row.avatar,
                    tag_color: row.tag_color,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    level: row.level,
                    xp: row.xp,
                    badge: row.badge,
                } as SearchFeedCard,
            ])
        );

        return post_ids
            .map((id) => rowsById.get(Number(id)))
            .filter(Boolean) as SearchFeedCard[];

    } catch (err) {
        console.error(err);
        throw new Error("failed_to_get_search_posts_by_ids");
    }
};

export const get_search_users_by_subs = async (
    user_subs: string[],
    requester_sub: string, 
): Promise<MinimumProfile[]> => {
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
                avatar,
                tag_color,
                level,
                xp
            FROM users
            WHERE status = 'active'
                AND sub = ANY($1::text[])
                AND sub <> $2::text
                ${blockedFilter("$2", "users.sub")}
            `,
            [user_subs, requester_sub]
        );

        const rowsBySub = new Map(
            result.rows.map((row: any) => [
                String(row.sub),
                {
                    sub: row.sub,
                    badge: row.badge,
                    avatar: row.avatar,
                    profile_name: row.profile_name,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    profile_img_url: row.profile_img_url,
                    bio: row.bio,
                    website: row.website,
                    tag_color: row.tag_color,
                    level: row.level,
                    xp: row.xp,
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
    limit: number = 20,
    requester_sub: string,
): Promise<{
    users: MinimumProfile[];
    posts: SearchFeedCard[];
}> => {
    try {
        if (!query.trim()) {
            return {
                users: [],
                posts: [],
            };
        }

        const [users, posts] = await Promise.all([
            get_search_users(query, limit, requester_sub),
            get_search_post(query, limit, requester_sub),
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