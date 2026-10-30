import { Dimensions } from "react-native";
import { Avatar, BadgeLevel, DietaryData, DishInfoData, Ingredient, NutritionData, StepData } from "./";
import { MediaType } from "./media.types";

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

export const DASHBOARD_HEIGHT = 153;
export const REEL_CONTROLS_HEIGHT = 40;
export const REEL_TAG_HEIGHT = Dimensions.get("window").height - REEL_CONTROLS_HEIGHT;
export const REEL_TAG_WIDTH = Dimensions.get("window").width ;
export const REEL_TAG_RADIUS = 0;
export const SWIPE_THRESHOLD = 60;

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

export const isVideoPost = (
    p?: { info?: { dish_media_type?: string | null } | null } | null
): boolean => p?.info?.dish_media_type === "video";

export const feedToReels = (posts: FeedCard[]): ReelFeedCard[] => {
    return posts as unknown as ReelFeedCard[];
};

export type FeedScopeType =
    | "dessert"
    | "soup"
    | "appetizer"
    | "high_protein"
    | "quick"
    | "breakfast"
    | "lunch"
    | "dinner"
    | "vegetarian"
    | "vegan"
    | "low_carb"
    | "healthy"
    | "meal_prep"
    | "comfort_food"
    | "family_friendly"
    | "budget"
    | "high_fiber";

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
    post_view: number;
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
    profile_image_url: string | null;
    level: number;
    xp: number;
    badge: BadgeLevel;
    avatar: Avatar;
    user_actions: FeedActionType[];
    action_counts: FeedActionCountsTypes;
    tag_color?: string | null;
};

export type MinimumFeedCard = {
    post_id: number;
    info: DishInfoData;
    action_counts: FeedActionCountsTypes;
};

export type SearchFeedCard = {
    post_id: number;

    info: DishInfoData;

    action_counts?: FeedActionCountsTypes;

    user_sub: string;
    profile_name: string;
    avatar: Avatar;
    firstName: string;
    lastName: string | null;
    tag_color?: string | null;
    level: number; 
    xp: number;
    badge: BadgeLevel;
};

export type FeedProfileCard ={
    sub: string,
    post_id: number,
    xp: number;
    level: number; 
    bread: number;
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

    avatar: Avatar;
    badge: BadgeLevel;

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
    xp: number;
    badge: BadgeLevel;
    profile_name: string;

    steps: StepData[];

    dietary: DietaryData;
    nutrition: NutritionData[];
};

export type FullPost = FeedCard & {
    ingredients: Ingredient[];
    steps: StepData[];
    nutrition: NutritionData[];
};
