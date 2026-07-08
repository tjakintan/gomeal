import redis from "@/services/redis";
import express from "express";
import { AuthenticatedRequest, authenticate } from "@/middleware/authenticate";
import { fetch_feed_post_by_id_feed_card, fetch_post_by_id_full_post } from "./feed";
import { fetch_reel_posts_by_ids } from "./Reel";
import { getFeedActionCounts } from "./actions";
import {fetchFeedProfile} from "./feedUser";
import { _rank, getTrend } from "@/services/ml";
import { get_search_users_by_subs, get_search_posts_by_ids } from "../search/action";
import { FeedScopeType } from "@/types/feed.types";

const feed_router = express.Router();


const RANK_TTL_MS = 60 * 2;
const MAX_PAGE_LIMIT = 30;
const ML_RANK_LIMIT = 200;
const ML_TREND_LIMIT = 20;
const ML_RANK_LIMIT_SCOPED = 75;

const getRankedFeed = async (
    user_sub: string,
    limit: number,
    selectedScope?: FeedScopeType,
    markSeen = false,
    forceRefresh = false
) => {
    const key = `rank:${user_sub}:${selectedScope ?? "all"}:${markSeen ? 1 : 0}`;

    // 1. Burst cache if force refresh
    if (!forceRefresh) {
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached);
    }

    // 2. compute fresh rank
    const { post_ids } = await _rank(
        user_sub,
        limit,
        selectedScope,
        markSeen
    );

    // 3. store snapshot
    await redis.set(key, JSON.stringify(post_ids), {
        EX: RANK_TTL_MS,
    });

    return post_ids;
};

feed_router.get("/trend", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = String(req.user?.sub || "");

    try {

        if (!user_sub) {
            return res.status(400).json({ error: "missing_field" });
        }

        const { post_ids, user_subs } = await getTrend(user_sub, ML_TREND_LIMIT);


        const [trending_post, trending_user] = await Promise.all([
            get_search_posts_by_ids(post_ids || []),
            get_search_users_by_subs(user_subs || []),
        ]);

        return res.status(200).json({
            trending_post,
            trending_user,
        });

    } catch (err) {
        return res.status(500).json({ error: `failed_to_fetch_trend_${err}` });
    }
});

feed_router.get("/fetch-post/:limit", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req?.user?.sub;

    const limit = Math.min(parseInt(req.params.limit as string), MAX_PAGE_LIMIT);
    const cursor = Math.max(Number(req.query.cursor ?? 0), 0);

    const selectedScope = req.query.selectedScope as FeedScopeType | undefined;
    const markSeen = req.query.markSeen === "true";
    const forceRefresh = req.query.forceRefresh === "true"; 

    if (isNaN(limit) || !user_sub) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const post_ids = await getRankedFeed(
            user_sub,
            selectedScope ? ML_RANK_LIMIT_SCOPED : ML_RANK_LIMIT, 
            selectedScope,
            markSeen,
            forceRefresh,
        );

        const pageIds = post_ids.slice(cursor, cursor + limit);

        const posts = await Promise.all(
            pageIds.map(async (post_id: string) => {
                try {
                    return await fetch_feed_post_by_id_feed_card(Number(post_id), user_sub);
                } catch (err) {
                    return null;
                }
            })
        );

        const _ranked_posts = posts.filter(Boolean);
        return res.status(200).json({
            posts: _ranked_posts,
            nextCursor: cursor + _ranked_posts.length,
            hasMore: cursor + limit < post_ids.length,
        });

    } catch (error) {
        console.error("failed_to_fetch_posts", error);
        return res.status(500).json({ error: "failed_to_fetch_posts" });
    }

});

feed_router.get("/fetch-reel/:limit", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req?.user?.sub;
    const limit = Math.min(parseInt(req.params.limit as string), MAX_PAGE_LIMIT);
    const cursor = Math.max(Number(req.query.cursor ?? 0), 0);

    const selectedScope = req.query.selectedScope as FeedScopeType | undefined;
    const markSeen = req.query.markSeen === "true";

    if (isNaN(limit) || !user_sub) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const post_ids = await getRankedFeed(user_sub, ML_RANK_LIMIT, selectedScope, markSeen);

        const pageIds = post_ids.slice(cursor, cursor + limit).map(Number);

        const _ranked_reels = await fetch_reel_posts_by_ids(pageIds, user_sub);

        return res.status(200).json({
            reels: _ranked_reels,
            nextCursor: cursor + _ranked_reels.length,
            hasMore: cursor + limit < post_ids.length,
        });

    } catch (error) {
        return res.status(500).json({ error: "failed_to_fetch_posts" });
    }

});

feed_router.post('/fetch-count/:post_id', authenticate, async (req: AuthenticatedRequest, res) => {

    const post_id = req.params.post_id;

    if (!post_id) {
        res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {

        const counts = await getFeedActionCounts(Number(post_id));
        res.status(200).json({ counts });

    } catch (error) {
        res.status(500).json({ error: "failed_to_fetch_counts" });
    }

});

feed_router.get("/fetch-post-user-profile/:post_id", authenticate, async (req: AuthenticatedRequest, res) => {
    
    const post_id = Number(req.params.post_id);
    const limit = Math.min(Number(req.query.limit ?? 100), 200);

    if (!post_id || Number.isNaN(post_id)) {
        return res.status(400).json({ error: "request_failed_missing_post_id" });
    }

    try {
        const feed_profile_card = await fetchFeedProfile({
            type: "post_id",
            post_id,
            limit,
        });

        return res.status(200).json(feed_profile_card);
    } catch (error) {
        console.error("failed_to_fetch_post_user", error);
        return res.status(500).json({ error: "failed_to_fetch_post_user" });
    }

});

feed_router.get("/fetch-user-profile/:user_sub", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = String(req.params.user_sub ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 100), 200);

    if (!user_sub) {
        return res.status(400).json({ error: "request_failed_missing_user_sub" });
    }

    try {

        const feed_profile_card = await fetchFeedProfile({
            type: "user_sub",
            user_sub,
            limit,
        });

        return res.status(200).json(feed_profile_card);

    } catch (error) {
        console.error("failed_to_fetch_user_profile", error);
        return res.status(500).json({ error: "failed_to_fetch_user_profile" });
    }

});

feed_router.get('/:post_id', authenticate, async (req: AuthenticatedRequest, res) => {

    const post_id = Number(req.params.post_id);
    const user_Sub = String(req?.user?.sub);

    if (!user_Sub || !post_id) {
        res.status(400).json({error: "failed_to_fetch_post_id"})
    }

    try {

        const post = await fetch_post_by_id_full_post(post_id, user_Sub);
        res.status(200).json(post);

    } catch (err) {
        res.status(500).json({ error: "failed_to_fetch_post" });   
    }
    
});

export default feed_router;