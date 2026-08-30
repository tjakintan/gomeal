import db from "@/services/db";
import { get_user_global_rank } from "./leaderboard";
import { getUserPosts, getUserActionCounts } from "../feed/actions";
import { ProfileResponse, UltraMinimumProfile, } from "@/types/profile.types";

export const getProfile = async (user_sub: string): Promise<ProfileResponse> => {

    try {

        const userResult = await db.query(
            `SELECT
                sub,
                email,
                profile_name,
                first_name,
                DATE_PART('year', AGE(dob))::int AS age,
                last_name,
                avatar,
                profile_img_url,
                tag_color,
                bio,
                website,
                level,
                xp,
                badge,
                bread,
                created_at AS date_joined
            FROM users
            WHERE sub = $1
            AND status = 'active'
            LIMIT 1`,
            [user_sub]
        );

        if (userResult.rowCount === 0) {
            throw new Error("user_not_found");
        }

        const user = userResult.rows[0];

        const postCountResult = await db.query(
            `SELECT COUNT(*)::int AS num_posts
             FROM post
             WHERE user_sub = $1 AND status = 'active'`,
            [user_sub]
        );

        const [actionCounts, activity, global_rank] = await Promise.all([
            getUserActionCounts(user_sub),
            getUserPosts(user_sub),
            get_user_global_rank(user_sub),
        ]);

        const response: ProfileResponse = {
            profile: {
                sub: user.sub,
                email: user.email,
                profile_name: user.profile_name,
                firstName: user.first_name,
                lastName: user.last_name,
                age: user.age,
                avatar: user.avatar,
                profile_img_url: user.profile_img_url ?? null,
                tag_color: user.tag_color ?? null,
                bio: user.bio ?? "",
                website: user.website ?? "",
                level: user.level,
                xp: user.xp,
                badge: user.badge,
                bread: user.bread,
                date_joined: user.date_joined,
            },
            stats: {
                num_posts: postCountResult.rows[0].num_posts,
                num_likes: actionCounts.num_of_likes,
                num_cooks: actionCounts.num_of_cooks,
                num_stars: actionCounts.num_of_stars,
                num_shares: actionCounts.num_of_shares,
            },
            activity,
            global_rank: global_rank ?? undefined,
        };

        return response;

    } catch (err) {
        console.error(err);
        throw err;
    }

};

export const get_minimal_profile = async (
    user_sub: string
): Promise<UltraMinimumProfile | null> => {
    const result = await db.query(
        `SELECT sub, profile_name, first_name, last_name, profile_img_url, badge, avatar
         FROM users
         WHERE sub = $1 AND status = 'active'`,
        [user_sub]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
        sub: row.sub,
        profile_name: row.profile_name,
        firstName: row.first_name,
        lastName: row.last_name,
        profile_img_url: row.profile_img_url,
        badge: row.badge,
        avatar: row.avatar,
    };
};

export const get_user_profile_name = async (user_sub: string): Promise<string> => {
    const result = await db.query(
        `SELECT profile_name FROM users WHERE sub = $1`,
        [user_sub]
    );
    return result.rows[0]?.profile_name ?? "Someone";
};