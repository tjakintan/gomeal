import { DietaryData, DishInfoData, Ingredient, MediaType, NutritionData, StepData } from "./food.types";
import { Avatar } from "./user.types";

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
    profile_name: string;

    dietary: DietaryData;
    nutrition: NutritionData[];
};

export type MinimumFeedCard = {
    post_id: number;
    info: {
        dish_name: string;
        dish_media_url: string; 
        dish_media_type: MediaType;
    };
    action_counts?: FeedActionCountsTypes;
};

export type FeedProfileCard ={
    sub: string,
    post_id: number,
    xp: number;
    level: number; 
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
    dietary: DietaryData;
    num_ingredients: number;
    tag_color?: string | null;
    profile_name: string;
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
    profile_name: string;
    level: number;
    avatar: Avatar | null;
    post_love: number;
    post_star: number;
    post_cook: number;
    post_share: number;
    user_actions: FeedActionType[];

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