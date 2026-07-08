import { FeedScopeType } from "@/types/feed.types";

const ML_URL = `http://ml:${process.env.ML_PORT || 6969}`;

export const getTrend = async ( user_sub: string, limit: number = 20 ): Promise<{ post_ids: number[]; user_subs: string[] }> => {
    
    const params = new URLSearchParams();
    params.append("limit", String(limit));

    const res = await fetch(
        `${ML_URL}/trend/${encodeURIComponent(user_sub)}?${params.toString()}`,
        { method: "GET" }
    );

    if (!res.ok) throw new Error("ml_failed");

    return res.json() as Promise<{ post_ids: number[]; user_subs: string[] }>;

};

export const embedPost = async (post_id: number) => {

    const res = await fetch(`${ML_URL}/embed/${post_id}`, {
        method: "POST",
    });

    if (!res.ok) throw new Error("ml_failed");

    return res.json();

};

export const embedUser = async (user_sub: string) => {

    const res = await fetch(`${ML_URL}/embed-user/${user_sub}`, {
        method: "POST",
    });

    if (!res.ok) throw new Error("ml_failed");

    return res.json();

};

export const _rank = async (
    user_sub: string,
    limit: number = 20,
    selectedScope?: FeedScopeType,
    markSeen: boolean = false,
): Promise<{ user_sub: string; post_ids: number[] }> => {

    const params = new URLSearchParams();
    params.append("limit", String(limit));

    if (selectedScope) {
        params.append("selectedScope", selectedScope);
    }

    if (markSeen) {
        params.append("markSeen", "true");
    }

    const res = await fetch(
        `${ML_URL}/rank/${encodeURIComponent(user_sub)}?${params.toString()}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!res.ok) throw new Error("ml_failed");

    return res.json() as Promise<{ user_sub: string; post_ids: number[] }>;
};
