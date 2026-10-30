import db from "@/services/db";
import { get_post_user_sub, getUserActionCounts, getUserPosts } from "./actions";
import { FeedProfileCard } from "@/types/feed.types";
import { is_user_blocked } from "../user/block";

type FetchFeedProfileParams =
    | { type: "post_id"; post_id: number; requester_sub: string; limit?: number }
    | { type: "user_sub"; user_sub: string; requester_sub: string; limit?: number };


export const fetchFeedProfile = async (params: FetchFeedProfileParams): Promise<FeedProfileCard> => {
  try {

    const safeLimit = Math.min(Math.max(params.limit ?? 100, 1), 200);

    let userSub: string;
    let postId = 0;

    switch (params.type) {

        case "post_id": {
            const foundUserSub = await get_post_user_sub(params.post_id);

            if (!foundUserSub) {
                throw new Error("post_not_found");
            }

            userSub = foundUserSub;
            postId = params.post_id;
            break;
        }

        case "user_sub": {
            userSub = params.user_sub;
            break;
        }

        default:
            throw new Error("invalid_fetch_type");
    }

    if (await is_user_blocked(params.requester_sub, userSub)) {
        throw new Error("user_not_found");
    }

    const userResult = await db.query(
        `SELECT 
            sub,
            xp,
            avatar,
            badge,
            level,
            bread,
            first_name,
            last_name,
            profile_name,
            created_at AS date_joined,
            profile_img_url,
            bio,
            website
        FROM users
        WHERE sub = $1`,
        [userSub]
    );

    if (userResult.rowCount === 0) {
      throw new Error("user_not_found");
    }

    const user = userResult.rows[0];
    const actionCounts = await getUserActionCounts(userSub);
    const userPosts = await getUserPosts(userSub, safeLimit);

    return {
        sub: user.sub,
        post_id: postId,
        xp: user.xp,
        avatar: user.avatar,
        badge: user.badge,
        level: user.level,
        bread: user.bread,
        firstName: user.first_name,
        lastName: user.last_name,
        profile_name: user.profile_name,
        bio: user.bio || null,
        website: user.website || null,
        date_joined: user.date_joined,
        num_of_stars: actionCounts.num_of_stars,
        num_of_likes: actionCounts.num_of_likes,
        num_of_cooks: actionCounts.num_of_cooks,
        num_of_shares: actionCounts.num_of_shares,
        user_posts: userPosts,
        profile_img_url: user.profile_img_url || null,
        };
    } catch (err) {
        if (err instanceof Error && ["post_not_found", "user_not_found"].includes(err.message)) throw err;
        console.error(err);
        throw new Error("failed_to_fetch_feed_profile");
    }

};
