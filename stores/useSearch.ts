import { create } from "zustand";
import { get_search_api, get_user_search_api, get_trend_api } from "@/api/search.api";
import { MinimumFeedCard } from "@/types/feed.types";
import { MinimumProfile } from "@/types/profile.types";

type SearchResult = {
    users?: MinimumProfile[];
    trending_user?: MinimumProfile[];
    trending_post?: MinimumFeedCard[];
    posts?: MinimumFeedCard[];
};

type SearchState = {
    trending_post: MinimumFeedCard[];
    trending_user: MinimumProfile[];
    users: MinimumProfile[];
    posts: MinimumFeedCard[];
    loading: boolean;
    trendLoading: boolean;
    loadSearch: (query: string) => Promise<void>;
    loadTrend: () => Promise<void>;
    loadUserSearch: (user: string) => Promise<void>;
    setSearch: (data: SearchResult) => void;
    clearSearch: () => void;
    clearUserSearch: () => void;
    clearTrend: () => void;
};

export const useSearch = create<SearchState>((set, get) => ({
    trending_post: [],
    trending_user: [],
    users: [],
    posts: [],
    loading: false,
    trendLoading: false,

    loadSearch: async (query: string) => {
        if (!query.trim() || query.trim().length < 3) {
            set({
                users: [],
                posts: [],
            });
            return;
        }

        set({ loading: true });

        try {
            const result = await get_search_api(query);

            set({
                users: result.users ?? [],
                posts: result.posts ?? [],
            });
        } catch (err) {
            console.error("Failed to load search:", err);
        } finally {
            set({ loading: false });
        }
    },

    loadTrend: async () => {
        const { trending_post, trending_user, trendLoading } = get();

        if (trendLoading || trending_post.length > 0 || trending_user.length > 0) return

        set({ trendLoading: true });

        try {
            const result = await get_trend_api();

            set({
                trending_post: result.trending_post ?? [],
                trending_user: result.trending_user ?? [],
            });
        } catch (err) {
            console.error("Failed to load trend:", err);
        } finally {
            set({ trendLoading: false });
        }
    },

    loadUserSearch: async (user: string) => {
        if (!user.trim() || user.trim().length < 3) {
            set({ users: [] });
            return;
        }

        set({ loading: true });

        try {
            const user_search = await get_user_search_api(user);
            set({ users: user_search ?? [] });
        } catch (err) {
            console.error("Failed to load user search:", err);
        } finally {
            set({ loading: false });
        }
    },

    setSearch: (data) =>
        set({
            trending_post: data.trending_post ?? [],
            trending_user: data.trending_user ?? [],
            users: data.users ?? [],
            posts: data.posts ?? [],
        }),

    clearSearch: () =>
        set({
            users: [],
            posts: [],
        }),

    clearUserSearch: () =>
        set({
            users: [],
        }),

    clearTrend: () =>
        set({
            trending_post: [],
            trending_user: [],
        }),
}));
