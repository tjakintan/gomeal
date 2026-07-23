import { Avatar, DietaryData, DishInfoData, Ingredient, MediaType, NutritionData, StepData } from "./";

export type FeedPageResponse = {
    posts: FeedCard[];
    nextCursor: number;
    hasMore: boolean;
};

export type ReelPageResponse = {
    reels: ReelFeedCard[];
    nextCursor: number;
    hasMore: boolean;
};

export type FeedCacheEntry<T> = {
    data: T[];
    createdAt: number;
};

export const FEED_CACHE_TTL_MS = 1000 * 60 * 5;
export const REEL_CACHE_TTL_MS = 1000 * 60 * 5;

// --- don't change all --ML returns that object
export const getCacheKey = (
    limit: number,
    scope?: FeedScopeType | null,
) => `${scope ?? "all"}:${limit}`;

export const feedToReels = (posts: FeedCard[]): ReelFeedCard[] => {
    return posts as unknown as ReelFeedCard[];
};

export type FeedScopeType =
    | "dessert"
    | "soup"
    | "appetizer"
    | "high_protein"
    | "quick";

export type FeedActionType =
    | "post_love"
    | "post_cook"
    | "post_star"
    | "post_share";

export type FeedAction = {
    post_id: number;
    user_sub: string;
    action_type: FeedActionType;
};

export type FeedActionCountsTypes = {
    post_love: number;
    post_cook: number;
    post_star: number;
    post_share: number;
};

export type UserActionedPostsType = {
    post_made: MinimumFeedCard[];
    post_love: MinimumFeedCard[];
    post_cook: MinimumFeedCard[];
    post_star: MinimumFeedCard[];
    post_share: MinimumFeedCard[];
};

export type FeedCard = {
    post_id: number,
    firstName: string;
    lastName: string | null;
    user_sub: string,
    info: DishInfoData;
    dietary: DietaryData;
    num_ingredients: number;
    profile_name: string;
    level: number;
    avatar: Avatar;
    user_actions: FeedActionType[];
    action_counts: {
        post_love: number;
        post_cook: number;
        post_star: number;
        post_share: number;
    };
    tag_color?: string | null;
};

export type MinimumFeedCard = {
    post_id: number;
    info: {
        dish_name: string;
        dish_media_url: string; 
        dish_media_type: MediaType;
    };
    action_counts: FeedActionCountsTypes;
};

export type FeedProfileCard ={
    sub: string,
    post_id: number,
    xp: number;
    level: number; 
    firstName: string;
    lastName: string;
    profile_name: string;

    bio?: string | null;
    website?: string | null;

    date_joined: string;
    num_of_likes: number;
    num_of_cooks: number;

    num_of_stars: number;
    num_of_shares: number;

    user_posts: UserActionedPostsType;
    profile_img_url?: string | null;
};

export type ReelFeedCard = {
    post_id: number,
    user_sub: string,
    firstName: string;
    lastName: string | null;
    info: DishInfoData;
    user_actions: FeedActionType[];
    action_counts: FeedActionCountsTypes;
    avatar: Avatar;
    level: number; 
    profile_name: string;

    dietary: DietaryData;
    nutrition: NutritionData[];
};

export type FullPost = FeedCard & {
    ingredients: Ingredient[];
    steps: StepData[];
    nutrition: NutritionData[];
};
