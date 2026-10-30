import { useReel } from "@/stores/useReel";
import { createWithEqualityFn } from "zustand/traditional";
import { fetchFeedPosts, fetchCookPageById, fetchReelPosts, fetchFeedProfileCard, setFeedActionCount, markPostSeen as markPostSeenApi, } from "@/api/feed.api";
import { FeedActionType, FeedCard, FeedProfileCard, FullPost, ReelFeedCard, FeedScopeType, FeedCacheEntry, getCacheKey, FEED_CACHE_TTL_MS, REEL_CACHE_TTL_MS, feedToReels, FeedPageResponse, ReelPageResponse } from "@/types/feed.types";
import { usePostLive } from "./usePostLive";
import { create } from "zustand";

type Column = "left" | "right";

type FeedPlaybackState = {
    muted: boolean;
    paused: boolean;
    activeId: number | null;
    setMuted: (m: boolean) => void;
    setPaused: (p: boolean) => void;
    setActiveId: (id: number | null) => void;
};

export const useFeedPlayback = create<FeedPlaybackState>((set) => ({
    muted: true,
    paused: false,
    activeId: null,
    setMuted: (muted) => set({ muted }),
    setPaused: (paused) => set({ paused }),
    setActiveId: (activeId) => set({ activeId }),
}));

const findPost = (state: FeedState, post_id: string | number) => {
    const targetId = String(post_id);
    return state.posts.find((p) => String(p.post_id) === targetId) ?? null;
};


// Merge incoming posts into an existing list, upserting by post_id.
// Existing user_actions/action_counts always win over an incoming fetch's
// values, so a fetch (e.g. a reel page load) can never clobber optimistic
// state that a toggle already applied locally.
type AnyFeedPost = FeedCard | ReelFeedCard;

const upsertPosts = (
    existing: AnyFeedPost[],
    incoming: AnyFeedPost[]
): AnyFeedPost[] => {
    const byId = new Map<string, AnyFeedPost>(
        existing.map((p) => [String(p.post_id), p])
    );

    for (const incomingPost of incoming) {
        const key = String(incomingPost.post_id);
        const current = byId.get(key);

        byId.set(
            key,
            current
                ? {
                    ...current,
                    ...incomingPost,
                    user_actions:
                        current.user_actions ??
                        incomingPost.user_actions ??
                        [],
                    action_counts:
                        current.action_counts ??
                        incomingPost.action_counts,
                }
                : incomingPost
        );
    }

    return Array.from(byId.values());
};


type FeedState = {
    // Single source of truth for every post object — grid-loaded and
    // reel-loaded posts both live here, upserted by post_id. Nothing else
    // in the app should hold a second copy of a post object.
    posts: (FeedCard | ReelFeedCard)[];
    visiblePostIds: string[];

    feedCache: Record<string, FeedCacheEntry<FeedCard>>;
    reelCache: Record<string, FeedCacheEntry<ReelFeedCard>>;
    feedRequests: Record<string, Promise<FeedPageResponse>>;
    reelRequests: Record<string, Promise<ReelPageResponse>>;

    selectedScope: FeedScopeType | null;
    selectedPost: FullPost | null;
    activeReelPost: ReelFeedCard | null;
    activeProfile: FeedProfileCard | null;

    loadingFeed: boolean;
    loadingPost: boolean;
    loadingReel: boolean;
    loadingProfile: boolean;

    feedCursor: number;
    hasMoreFeed: boolean;
    loadingMoreFeed: boolean;

    reelCursor: number;
    hasMoreReels: boolean;
    loadingMoreReels: boolean;

    setSelectedScope: (scope: FeedScopeType | null) => void;

    markPostSeen: (post_id: string | number) => Promise<void>;

    loadFeed: (
        limit?: number,
        scope?: FeedScopeType | null,
        markSeen?: boolean,
        forceRefresh?: boolean,
    ) => Promise<FeedCard[]>;

    loadNextFeed: (
        limit?: number,
        scope?: FeedScopeType | null,
    ) => Promise<FeedCard[]>;

    loadReel: (
        limit?: number,
        scope?: FeedScopeType | null,
        markSeen?: boolean,
        forceRefresh?: boolean,
    ) => Promise<ReelFeedCard[]>;

    loadNextReel: (
        limit?: number,
        scope?: FeedScopeType | null
    ) => Promise<ReelFeedCard[]>;

    // Upsert arbitrary posts into the single posts array. Used by useReel
    // (and anywhere else) that needs to seed/merge post data without going
    // through a full loadFeed/loadReel fetch cycle.
    upsertPosts: (posts: (FeedCard | ReelFeedCard)[]) => void;

    togglePostAction: (
        post_id: string | number,
        action: FeedActionType
    ) => Promise<void>;
    updatePostEverywhere: (
        post_id: string | number,
        updater: (post: any) => any
    ) => void;

    loadPost: (id: number) => Promise<FullPost | null>;
    removeProfile: (user_sub: string | number) => void;
    removePost: (post_id: string | number) => void;

    setActiveReelPost: (post: ReelFeedCard | null) => void;
    setActiveProfile: (post_id?: number, user_sub?: string) => void;
    clearSelectedPost: () => void;
    clearActiveProfile: () => void;
};


export const useFeed = createWithEqualityFn<FeedState>((set, get) => ({

    posts: [],
    visiblePostIds: [],

    feedCache: {},
    reelCache: {},
    feedRequests: {},
    reelRequests: {},

    feedCursor: 0,
    hasMoreFeed: true,
    loadingMoreFeed: false,

    reelCursor: 0,
    hasMoreReels: true,
    loadingMoreReels: false,

    selectedPost: null,
    activeReelPost: null,
    activeProfile: null,
    selectedScope: null,

    loadingFeed: false,
    loadingPost: false,
    loadingReel: true,
    loadingProfile: false,

    markPostSeen: async (post_id) => {
        try {
            const counts = await markPostSeenApi(Number(post_id));
            if (counts?.post_view !== undefined) {
                get().updatePostEverywhere(post_id, (post: any) => ({
                    ...post,
                    action_counts: { ...post.action_counts, post_view: counts.post_view },
                }));
            }
        } catch (err) {
            console.error("[markPostSeen] Failed:", err);
        }
    },

    loadFeed: async (
        limit = 10,
        scope?: FeedScopeType | null,
        markSeen = false,
        forceRefresh = false,
    ): Promise<FeedCard[]> => {
        const selectedScope = scope ?? get().selectedScope;
        const cacheKey = getCacheKey(limit, selectedScope);
        const cached = get().feedCache[cacheKey];

        if (!forceRefresh && !markSeen && cached && Date.now() - cached.createdAt < FEED_CACHE_TTL_MS) {
            set((state) => ({
                posts: upsertPosts(state.posts, cached.data),
                visiblePostIds: cached.data.map((p) => String(p.post_id)),
                feedCursor: cached.data.length,
                hasMoreFeed: true,
            }));

            return cached.data;
        }

        const existingRequest = get().feedRequests[cacheKey];
        if (!forceRefresh && existingRequest) {
            const response = await existingRequest;
            return response.posts;
        }

        set({ loadingFeed: true, feedCursor: 0 });

        const request = fetchFeedPosts(
            limit,
            selectedScope ?? undefined,
            markSeen,
            0,
            forceRefresh,
        );

        set({
            feedRequests: {
                ...get().feedRequests,
                [cacheKey]: request,
            },
        });

        try {
            const response = await request;
            const data = response.posts;

            set((state) => ({
                posts: upsertPosts(state.posts, data),
                visiblePostIds: data.map((p) => String(p.post_id)),
                feedCursor: response.nextCursor,
                hasMoreFeed: response.hasMore,
                feedCache: {
                    ...state.feedCache,
                    [cacheKey]: {
                        data,
                        createdAt: Date.now(),
                    },
                },
            }));

            return data;
        } catch (err) {
            console.error("Error loading feed:", err);
            throw err;
        } finally {
            const { [cacheKey]: _, ...remainingRequests } = get().feedRequests;

            set({
                loadingFeed: false,
                feedRequests: remainingRequests,
            });
        }
    },

    loadNextFeed: async (
        limit = 10,
        scope?: FeedScopeType | null,
    ): Promise<FeedCard[]> => {
        const {
            selectedScope,
            feedCursor,
            hasMoreFeed,
            loadingFeed,
            loadingMoreFeed,
        } = get();

        if (loadingFeed || loadingMoreFeed || !hasMoreFeed) {
            return [];
        }

        const activeScope = scope ?? selectedScope;

        set({ loadingMoreFeed: true });

        try {
            const response = await fetchFeedPosts(
                limit,
                activeScope ?? undefined,
                false,
                feedCursor,
            );

            const nextPosts = response.posts;

            set((state) => ({
                posts: upsertPosts(state.posts, nextPosts),
                visiblePostIds: [
                    ...state.visiblePostIds,
                    ...nextPosts.map((p) => String(p.post_id)),
                ],
                feedCursor: response.nextCursor,
                hasMoreFeed: response.hasMore,
            }));

            return nextPosts;
        } catch (err) {
            console.error("Error loading next feed:", err);
            throw err;
        } finally {
            set({ loadingMoreFeed: false });
        }
    },

    loadReel: async (
        limit = 10,
        scope?: FeedScopeType | null,
        markSeen = false,
        forceRefresh = false,
    ): Promise<ReelFeedCard[]> => {
        const selectedScope = scope ?? get().selectedScope;
        const cacheKey = getCacheKey(limit, selectedScope);
        const cached = get().reelCache[cacheKey];

        if (!forceRefresh && !markSeen && cached && Date.now() - cached.createdAt < REEL_CACHE_TTL_MS) {
            set((state) => ({
                posts: upsertPosts(state.posts, cached.data),
                hasMoreReels: true,
            }));
            return cached.data;
        }

        const feedCached = get().feedCache[cacheKey];
        if (!forceRefresh && !markSeen && feedCached && Date.now() - feedCached.createdAt < FEED_CACHE_TTL_MS) {
            const reels = feedToReels(feedCached.data);
            set((state) => ({
                posts: upsertPosts(state.posts, reels),
                hasMoreReels: true,
                reelCache: {
                    ...state.reelCache,
                    [cacheKey]: {
                        data: reels,
                        createdAt: Date.now(),
                    },
                },
            }));
            return reels;
        }

        const existingRequest = get().reelRequests[cacheKey];
        if (!forceRefresh && existingRequest) {
            const response = await existingRequest;
            return response.reels;
        }

        set({ loadingReel: true });

        const request = fetchReelPosts(
            limit,
            selectedScope ?? undefined,
            markSeen,
            0,
        );

        set({
            reelRequests: {
                ...get().reelRequests,
                [cacheKey]: request,
            },
        });

        try {
            const response = await request;
            const data = response.reels;

            set((state) => ({
                posts: upsertPosts(state.posts, data),
                reelCursor: response.nextCursor,
                hasMoreReels: response.hasMore,
                reelCache: {
                    ...state.reelCache,
                    [cacheKey]: {
                        data,
                        createdAt: Date.now(),
                    },
                },
            }));

            return data;
        } catch (err) {
            console.error("Error loading reels:", err);
            return [];
        } finally {
            const { [cacheKey]: _, ...remainingRequests } = get().reelRequests;
            set({
                loadingReel: false,
                reelRequests: remainingRequests,
            });
        }
    },

    loadNextReel: async (limit = 20, scope) => {
        const {
            selectedScope,
            reelCursor,
            hasMoreReels,
            loadingReel,
            loadingMoreReels,
            posts,
        } = get();

        if (loadingReel || loadingMoreReels || !hasMoreReels) return [];

        const activeScope = scope ?? selectedScope;

        set({ loadingMoreReels: true });

        try {
            const response = await fetchReelPosts(
                limit,
                activeScope ?? undefined,
                false,
                reelCursor
            );

            const next = response.reels ?? [];

            const existingIds = new Set(posts.map((p) => String(p.post_id)));
            const filteredNext = next.filter((r) => !existingIds.has(String(r.post_id)));

            if (filteredNext.length === 0) {
                set({
                    hasMoreReels: false,
                    loadingMoreReels: false,
                });
                return [];
            }

            set((state) => ({
                posts: upsertPosts(state.posts, filteredNext),
                reelCursor: response.nextCursor ?? reelCursor + filteredNext.length,
                hasMoreReels: response.hasMore && filteredNext.length > 0,
            }));

            return filteredNext;
        } catch (err) {
            console.error("Error loading more reels:", err);
            return [];
        } finally {
            set({ loadingMoreReels: false });
        }
    },

    upsertPosts: (incoming) => {
        set((state) => ({ posts: upsertPosts(state.posts, incoming) }));
    },

    loadPost: async (id: number): Promise<FullPost | null> => {
        set({ loadingPost: true });

        try {
            const data = await fetchCookPageById(id);
            const existing = findPost(get(), id);

            const merged = existing
                ? {
                    ...data,
                    user_actions: existing.user_actions ?? data.user_actions,
                    action_counts: existing.action_counts ?? data.action_counts,
                }
                : data;

            set({ selectedPost: merged });
            return merged;

        } catch (err) {
            console.error("Error loading post:", err);
            return null;
        } finally {
            set({ loadingPost: false });
        }
    },

    removePost: (post_id) => {
        const targetId = String(post_id);

        set((state) => {
            const removedIndex = state.posts.findIndex(
                (post) => String(post.post_id) === targetId
            );

            const nextPosts = state.posts.filter(
                (post) => String(post.post_id) !== targetId
            );

            const isRemovingActiveReel =
                state.activeReelPost &&
                String(state.activeReelPost.post_id) === targetId;

            const isReelFeedCard = (p: FeedCard | ReelFeedCard): p is ReelFeedCard =>
                "nutrition" in p;

            const nextActiveReelPost = isRemovingActiveReel
                ? [nextPosts[removedIndex], nextPosts[removedIndex - 1]]
                    .find((p): p is ReelFeedCard => !!p && isReelFeedCard(p)) ?? null
                : state.activeReelPost;

            return {
                posts: nextPosts,
                visiblePostIds: state.visiblePostIds.filter((id) => id !== targetId),

                selectedPost:
                    state.selectedPost && String(state.selectedPost.post_id) === targetId
                        ? null
                        : state.selectedPost,

                activeReelPost: nextActiveReelPost,

                feedCache: Object.fromEntries(
                    Object.entries(state.feedCache).map(([key, entry]) => [
                        key,
                        {
                            ...entry,
                            data: entry.data.filter(
                                (post) => String(post.post_id) !== targetId
                            ),
                        },
                    ])
                ),

                reelCache: Object.fromEntries(
                    Object.entries(state.reelCache).map(([key, entry]) => [
                        key,
                        {
                            ...entry,
                            data: entry.data.filter(
                                (reel) => String(reel.post_id) !== targetId
                            ),
                        },
                    ])
                ),
            };
        });

        useReel.setState((state) => ({
            order: state.order.filter((id) => String(id) !== targetId),
            history: state.history.filter((id) => String(id) !== targetId),
        }));
    },

    removeProfile: (user_sub) => {
        const targetSub = String(user_sub);

        set((state) => {
            const removedIndex = state.posts.findIndex(
                (post) => String(post.user_sub) === targetSub
            );

            // Figure out which post_ids belong to this user BEFORE filtering
            // posts, so we can also strip them from visiblePostIds.
            const removedIds = new Set(
                state.posts
                    .filter((post) => String(post.user_sub) === targetSub)
                    .map((post) => String(post.post_id))
            );

            const nextPosts = state.posts.filter(
                (post) => String(post.user_sub) !== targetSub
            );

            const isRemovingActiveReel =
                state.activeReelPost &&
                String(state.activeReelPost.user_sub) === targetSub;

            const isReelFeedCard = (p: FeedCard | ReelFeedCard): p is ReelFeedCard =>
                "nutrition" in p;

            const nextActiveReelPost = isRemovingActiveReel
                ? [nextPosts[removedIndex], nextPosts[removedIndex - 1]]
                    .find((p): p is ReelFeedCard => !!p && isReelFeedCard(p)) ?? null
                : state.activeReelPost;

            return {
                activeProfile:
                    state.activeProfile && String(state.activeProfile.sub) === targetSub
                        ? null
                        : state.activeProfile,

                posts: nextPosts,
                visiblePostIds: state.visiblePostIds.filter((id) => !removedIds.has(id)),

                selectedPost:
                    state.selectedPost && String(state.selectedPost.user_sub) === targetSub
                        ? null
                        : state.selectedPost,

                activeReelPost: nextActiveReelPost,

                feedCache: Object.fromEntries(
                    Object.entries(state.feedCache).map(([key, entry]) => [
                        key,
                        {
                            ...entry,
                            data: entry.data.filter(
                                (post) => String(post.user_sub) !== targetSub
                            ),
                        },
                    ])
                ),

                reelCache: Object.fromEntries(
                    Object.entries(state.reelCache).map(([key, entry]) => [
                        key,
                        {
                            ...entry,
                            data: entry.data.filter(
                                (reel) => String(reel.user_sub) !== targetSub
                            ),
                        },
                    ])
                ),
            };
        });
    },

    updatePostEverywhere: (post_id, updater) => {
        const targetId = String(post_id);

        // First updated copy wins (posts is evaluated before selectedPost,
        // activeReelPost, and the caches), so we mirror exactly what the
        // store received without running the updater again.
        let mirrored: any = null;

        const updateOne = (post: any) => {
            if (!post || String(post.post_id) !== targetId) return post;
            const updated = updater(post);
            if (mirrored === null) mirrored = updated;
            return updated;
        };

        const updateList = <T extends { post_id: string | number }>(items: T[]) => {
            let changed = false;
            const next = items.map((item) => {
                const updated = updateOne(item);
                if (updated !== item) changed = true;
                return updated;
            });
            return changed ? next : items;
        };

        set((state) => ({
            posts: updateList(state.posts),
            selectedPost: updateOne(state.selectedPost),
            activeReelPost: updateOne(state.activeReelPost),

            feedCache: Object.fromEntries(
                Object.entries(state.feedCache).map(([key, entry]) => [
                    key,
                    { ...entry, data: updateList(entry.data) },
                ])
            ),

            reelCache: Object.fromEntries(
                Object.entries(state.reelCache).map(([key, entry]) => [
                    key,
                    { ...entry, data: updateList(entry.data) },
                ])
            ),
        }));

        // Post isn't in any store copy (Discovery/Min-only), so apply the
        // updater to whatever the live overlay already has for it.
        if (mirrored === null) {
            const live = usePostLive.getState().byId[targetId];
            mirrored = updater({
                post_id,
                action_counts: live?.action_counts,
                user_actions: live?.user_actions,
            });
        }

        usePostLive.getState().setLive(targetId, {
            action_counts: mirrored.action_counts,
            user_actions: mirrored.user_actions,
        });
    },

    setActiveProfile: async (post_id?: number, user_sub?: string) => {
        set({ loadingProfile: true });

        try {
            if (post_id) {
                const profile = await fetchFeedProfileCard({ post_id, limit: 100 });
                set({ activeProfile: profile });
                return;
            }

            if (user_sub) {
                const profile = await fetchFeedProfileCard({ user_sub, limit: 100 });
                set({ activeProfile: profile });
                return;
            }

            return;

        } catch (err) {
            console.error("Failed to load profile:", err);
        } finally {
            set({ loadingProfile: false });
        }
    },

    togglePostAction: async (post_id, action) => {
        const targetId = String(post_id);
        const current = findPost(get(), post_id);

        //console.log("[togglePostAction] target:", targetId, "current.user_actions:", current?.user_actions, "typeof:", typeof current?.user_actions, "isArray:", Array.isArray(current?.user_actions));

        if (!current) return;

        const wasActive = (current.user_actions ?? []).includes(action);
        const rollbackDelta = wasActive ? -1 : 1;

        get().updatePostEverywhere(targetId, (post: any) => {
            const actions = Array.isArray(post.user_actions) ? post.user_actions : [];
            const isActive = actions.includes(action);
            const nextActions = isActive
                ? actions.filter((a: any) => a !== action)
                : [...actions, action];

            return {
                ...post,
                user_actions: nextActions,
                action_counts: {
                    ...post.action_counts,
                    [action]: Math.max((post.action_counts?.[action] ?? 0) + (isActive ? -1 : 1), 0),
                },
            };
        });

        try {
            const freshCounts = await setFeedActionCount(Number(post_id), action);

            // Only the action we actually toggled is trustworthy from this
            // response — other keys in it can be stale relative to
            // concurrent in-flight toggles on other actions.
            get().updatePostEverywhere(targetId, (post: any) => ({
                ...post,
                action_counts: {
                    ...post.action_counts,
                    [action]: freshCounts?.[action] ?? post.action_counts?.[action],
                },
            }));
        } catch (err) {
            console.error("[togglePostAction] failed:", err);

            get().updatePostEverywhere(targetId, (post: any) => {
                const actions = Array.isArray(post.user_actions) ? post.user_actions : [];
                const isActive = actions.includes(action);
                const nextActions = wasActive
                    ? (isActive ? actions : [...actions, action])
                    : actions.filter((a: any) => a !== action);

                return {
                    ...post,
                    user_actions: nextActions,
                    action_counts: {
                        ...post.action_counts,
                        [action]: Math.max((post.action_counts?.[action] ?? 0) - rollbackDelta, 0),
                    },
                };
            });
        }
    },

    setSelectedScope: (scope) => set({ selectedScope: scope }),

    setActiveReelPost: (reel) => set({ activeReelPost: reel }),
    clearSelectedPost: () => set({ selectedPost: null }),
    clearActiveProfile: () => set({ activeProfile: null }),

}));