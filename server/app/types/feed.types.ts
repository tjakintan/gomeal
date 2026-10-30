import { DietaryData, DishInfoData, Ingredient, MediaType, NutritionData, StepData } from "./food.types";
import { Avatar, BadgeLevel } from "./user.types";

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
    | "post_share"
    | "post_view";
 
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

export type FullPost = FeedCard & {
    ingredients: Ingredient[];
    steps: StepData[];
    nutrition: NutritionData[];
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

export type MinimumFeedCard = {
    post_id: number;
    info: DishInfoData;
    action_counts?: FeedActionCountsTypes;
};

export type FeedProfileCard ={
    sub: string,
    post_id: number,
    xp: number;
    level: number; 
    bread: number;
    firstName: string;
    lastName: string;
    bio?: string | null;
    website?: string | null;
    profile_name: string;
    date_joined: string;
    num_of_stars: number;
    num_of_likes: number;
    num_of_cooks: number;
    num_of_shares: number;
    avatar: Avatar;
    badge: BadgeLevel;
    user_posts: UserActionedPostsType;
    profile_img_url?: string | null;
};

export type  FeedDBRow = {
    id: number;
    dish_name: string;
    firstName: string;
    lastName: string | null;
    user_sub: string;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard" | "";
    image_url: string;
    media_type: MediaType;
    media_duration: number | null;
    dietary: DietaryData;
    num_ingredients: number;
    tag_color?: string | null;
    xp: number;
    badge: BadgeLevel;
    profile_name: string;
    profile_image_url: string | null;
    level: number;
    avatar: Avatar | null;
};

export type ReelDBRow = {
    id: number;
    user_sub: string;
    firstName: string;
    lastName: string | null;
    dish_name: string;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard" | "";
    image_url: string;
    media_type: MediaType;
    media_duration: number | null;
    profile_name: string;
    level: number;
    avatar: Avatar | null;
    post_love: number;
    post_star: number;
    post_cook: number;
    post_share: number;
    post_view: number;
    user_actions: FeedActionType[];
    xp: number;
    badge: BadgeLevel;

    steps: StepData[];
    dietary: DietaryData; 
    nutrition: {
        servings: number;
        calories_per_serving: number;
        protein_g: number;
        carbs_g: number;
        sugar_g: number;
        fat_g: number;
        saturated_fat_g: number;
        fiber_g: number;
        cholesterol_mg: number;
        sodium_mg: number;
    };

};