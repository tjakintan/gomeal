import { apiFetch } from "./api";
import { API_BASE } from '../config';
import { MinimumProfile } from "@/types/profile.types";
import { MinimumFeedCard } from "@/types/feed.types";

export async function get_search_api(query: string): Promise<{users?: MinimumProfile[], posts: MinimumFeedCard[]}> {

    const response = await apiFetch(`${API_BASE}/search/${query}`, {
        method: "GET",
    });

    return response;
};

export async function get_user_search_api(user: string): Promise<MinimumProfile[]> {

    const response = await apiFetch(`${API_BASE}/search/user/${user}`, {
        method: "GET",
    });

    return response;
};

export async function get_trend_api(): Promise<{ trending_user?: MinimumProfile[], trending_post?: MinimumFeedCard[] }> {

    const response = await apiFetch(`${API_BASE}/feed/trend`, {
        method: "GET",
    });

    return response;
};
