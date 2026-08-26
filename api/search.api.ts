import { apiFetch } from "./api";
import { API_BASE } from '../config';
import { MinimumProfile } from "@/types/profile.types";
import { MinimumFeedCard, SearchFeedCard } from "@/types/feed.types";

export async function get_search_api(query: string): Promise<{users?: MinimumProfile[], posts: SearchFeedCard[]}> {

    const response = await apiFetch(`${API_BASE}/search/${query}`, {
        method: "GET",
    });

    console.log(response)
    return response;
};

export async function get_user_search_api(user: string): Promise<MinimumProfile[]> {

    const response = await apiFetch(`${API_BASE}/search/user/${user}`, {
        method: "GET",
    });

    return response;
};

export async function get_trend_api(): Promise<{ trending_user?: MinimumProfile[], trending_post?: SearchFeedCard[] }> {

    const response = await apiFetch(`${API_BASE}/feed/trend`, {
        method: "GET",
    });

    return response;
};
