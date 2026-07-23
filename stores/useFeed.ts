import { create } from "zustand";
import { useReel } from "@/stores/useReel";
import { fetchFeedPosts, fetchCookPageById, fetchReelPosts, fetchFeedProfileCard } from "@/api/feed.api";
import { FeedActionCountsTypes, FeedActionType, FeedCard, FeedProfileCard, FullPost, ReelFeedCard, FeedScopeType, FeedCacheEntry, getCacheKey, FEED_CACHE_TTL_MS, REEL_CACHE_TTL_MS, feedToReels, FeedPageResponse, ReelPageResponse } from "@/types/feed.types";

type FeedState = {
    posts: FeedCard[];
    reels?: ReelFeedCard[];

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

export const useFeed = create<FeedState>((set, get) => ({

    posts: [],
    reels: [],

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
            set({
                posts: cached.data,
                feedCursor: cached.data.length,
                hasMoreFeed: true,
            });

            return cached.data;
        }

        const existingRequest = get().feedRequests[cacheKey];
        if (!forceRefresh && existingRequest) {
            const response = await existingRequest;
            return response.posts;
        }

        set({ loadingFeed: true, posts: [], feedCursor: 0 });

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

            set({
                posts: data,
                feedCursor: response.nextCursor,
                hasMoreFeed: response.hasMore,
                feedCache: {
                    ...get().feedCache,
                    [cacheKey]: {
                        data,
                        createdAt: Date.now(),
                    },
                },
            });

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
            posts,
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

            const merged = Array.from(
                new Map(
                    [...posts, ...nextPosts].map(post => [
                        post.post_id,
                        post,
                    ])
                ).values()
            );

            set({
                posts: merged,
                feedCursor: response.nextCursor,
                hasMoreFeed: response.hasMore,
            });

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
            set({
                reels: cached.data,  
                hasMoreReels: true,
            });
            return cached.data;
        }

        const feedCached = get().feedCache[cacheKey];
        if (!forceRefresh && !markSeen && feedCached && Date.now() - feedCached.createdAt < FEED_CACHE_TTL_MS) {
            const reels = feedToReels(feedCached.data);
            set({
                reels,    
                hasMoreReels: true,
                reelCache: {
                    ...get().reelCache,
                    [cacheKey]: {
                        data: reels,
                        createdAt: Date.now(),
                    },
                },
            });
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

            set({
                reels: data,
                reelCursor: response.nextCursor,  
                hasMoreReels: response.hasMore, 
                reelCache: {
                    ...get().reelCache,
                    [cacheKey]: {
                        data,
                        createdAt: Date.now(),
                    },
                },
            });

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
            reels,
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

            const existingIds = new Set((reels ?? []).map(r => r.post_id));

            const filteredNext = next.filter(r => !existingIds.has(r.post_id));

            const isSamePage =
                filteredNext.length === 0 ||
                (reels?.length ?? 0) + filteredNext.length === (reels?.length ?? 0);

            if (isSamePage) {
                set({
                    hasMoreReels: false,
                    loadingMoreReels: false,
                });
                return [];
            }

            set({
                reels: [...(reels ?? []), ...filteredNext],
                reelCursor: response.nextCursor ?? reelCursor + filteredNext.length,
                hasMoreReels: response.hasMore && filteredNext.length > 0,
            });

            return filteredNext;
        } catch (err) {
            console.error("Error loading more reels:", err);
            return [];
        } finally {
            set({ loadingMoreReels: false });
        }
    },

    loadPost: async (id: number): Promise<FullPost | null> => {
        set({ loadingPost: true });

        try {
            const data = await fetchCookPageById(id);

            const existing =
                get().posts.find((p) => String(p.post_id) === String(id)) ??
                get().reels?.find((r) => String(r.post_id) === String(id));

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
            const currentReels = state.reels ?? [];
            const removedReelIndex = currentReels.findIndex(
                (reel) => String(reel.post_id) === targetId
            );

            const nextReels = currentReels.filter(
                (reel) => String(reel.post_id) !== targetId
            );

            const isRemovingActiveReel =
                state.activeReelPost &&
                String(state.activeReelPost.post_id) === targetId;

            const nextActiveReelPost = isRemovingActiveReel
                ? nextReels[removedReelIndex] ?? nextReels[removedReelIndex - 1] ?? null
                : state.activeReelPost;

            return {
                posts: state.posts.filter(
                    (post) => String(post.post_id) !== targetId
                ),

                reels: nextReels,

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
    },
    
    removeProfile: (user_sub) => {
        const targetSub = String(user_sub);

        set((state) => {
            const currentReels = state.reels ?? [];

            const removedReelIndex = currentReels.findIndex(
                (reel) => String(reel.user_sub) === targetSub
            );

            const nextReels = currentReels.filter(
                (reel) => String(reel.user_sub) !== targetSub
            );

            const isRemovingActiveReel =
                state.activeReelPost &&
                String(state.activeReelPost.user_sub) === targetSub;

            const nextActiveReelPost = isRemovingActiveReel
                ? nextReels[removedReelIndex] ?? nextReels[removedReelIndex - 1] ?? null
                : state.activeReelPost;

            return {
                activeProfile:
                    state.activeProfile && String(state.activeProfile.sub) === targetSub
                        ? null
                        : state.activeProfile,

                posts: state.posts.filter(
                    (post) => String(post.user_sub) !== targetSub
                ),

                reels: nextReels,

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

        const updateOne = (post: any) =>
            post && String(post.post_id) === targetId ? updater(post) : post;

        const updateList = <T extends { post_id: string | number }>(items: T[]) =>
            items.map((item) => updateOne(item));

        set((state) => ({
            posts: updateList(state.posts),
            reels: updateList(state.reels ?? []),

            selectedPost: updateOne(state.selectedPost),
            activeReelPost: updateOne(state.activeReelPost),

            feedCache: Object.fromEntries(
                Object.entries(state.feedCache).map(([key, entry]) => [
                    key,
                    {
                    ...entry,
                    data: updateList(entry.data),
                    },
                ])
            ),

            reelCache: Object.fromEntries(
            Object.entries(state.reelCache).map(([key, entry]) => [
                key,
                {
                ...entry,
                data: updateList(entry.data),
                },
            ])
            ),
        }));


        useReel.setState((reelState: any) => ({
            reels: reelState.reels.map((r: any) =>
                String(r.post_id) === targetId ? updater(r) : r
            ),
        }));
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

    setSelectedScope: (scope) => set({ selectedScope: scope }),

    setActiveReelPost: (reel) => set({ activeReelPost: reel }),
    clearSelectedPost: () => set({ selectedPost: null }),
    clearActiveProfile: () => set({ activeProfile: null }),
    
}));

