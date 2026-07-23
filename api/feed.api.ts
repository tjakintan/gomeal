import { apiFetch } from "./api";
import { socketEmit } from "./socket";
import { FeedCard, FeedPageResponse, FeedProfileCard, FeedScopeType, FullPost, ReelFeedCard, ReelPageResponse } from "@/types/feed.types";
import { API_BASE } from '../config';
import { FeedActionCountsTypes, FeedActionType } from "@/types/feed.types";

type FetchFeedProfileCardParams =
  | { post_id: number; limit?: number }
  | { user_sub: string; limit?: number };

export async function fetchFeedPosts(
    limit: number,
    selectedScope?: FeedScopeType,
    markSeen = false,
    cursor = 0,
    forceRefresh = false,
): Promise<FeedPageResponse> {

    const params = new URLSearchParams();

    if (selectedScope) {
        params.append("selectedScope", selectedScope);
    }

    if (markSeen) {
        params.append("markSeen", "true");
    }

    if (cursor) {
        params.append("cursor", String(cursor));
    }

    if (forceRefresh) {
        params.append("forceRefresh", "true");
    }

    const url = `${API_BASE}/feed/fetch-post/${limit}${params.toString() ? `?${params.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
    });

    return {
        posts: response.posts ?? [],
        nextCursor: response.nextCursor ?? 0,
        hasMore: response.hasMore ?? false,
    };

}

export async function fetchReelPosts(
    limit: number,
    selectedScope?: FeedScopeType,
    markSeen = false,
    cursor = 0,
): Promise<ReelPageResponse> {

    const params = new URLSearchParams();

    if (selectedScope) {
        params.append("selectedScope", selectedScope);
    }

    if (markSeen) {
        params.append("markSeen", "true");
    }

    if (cursor) {
        params.append("cursor", String(cursor));
    }

    const url = `${API_BASE}/feed/fetch-reel/${limit}${params.toString() ? `?${params.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
    });

    return {
        reels: response.reels ?? [],
        nextCursor: response.nextCursor ?? 0,
        hasMore: response.hasMore ?? false,
    };
}

export async function fetchCookPageById(post_id: number): Promise<FullPost> {

    const response = await apiFetch(`${API_BASE}/feed/${encodeURIComponent(post_id)}`, {
        method: "GET",
    });

    return response as FullPost;
};

export async function setFeedActionCount(post_id: number, action: FeedActionType): Promise<FeedActionCountsTypes> {

    const res = await socketEmit<{ counts: FeedActionCountsTypes }>("set-count", {
        post_id,
        action_type: action,
    });

    if (!res) {
        return {
            post_love: 0,
            post_cook: 0,
            post_star: 0,
            post_share: 0,
        };
    }

    return res.counts;

};

export async function fetchFeedProfileCard(input: FetchFeedProfileCardParams): Promise<FeedProfileCard> {
  
    const params = new URLSearchParams();
    params.append("limit", String(input.limit ?? 100));

    const url =
        "post_id" in input
        ? `${API_BASE}/feed/fetch-post-user-profile/${encodeURIComponent(input.post_id)}?${params.toString()}`
        : `${API_BASE}/feed/fetch-user-profile/${encodeURIComponent(input.user_sub)}?${params.toString()}`;

    const res = await apiFetch(url, {
        method: "GET",
    });

    return res as FeedProfileCard;
}
