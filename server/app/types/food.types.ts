
// General Information
export type MediaType = "image" | "video";
export type DishInfoData = {
    dish_media_file: File | null;
    dish_media_url: string;
    dish_media_type: MediaType | null;
    dish_name: string;
    dish_description: string;
    dish_difficulty: "Easy" | "Medium" | "Hard" | "";
};

// Units
export type Unit = "" | "whole" | "piece" | "g" | "kg" | "oz" | "lb" | "ml" | "l";

// Ingredient
export type Ingredient = {
    id: number;
    name: string;
    normalized_name: string | null;
    source: string | null;
    category: string | null;
    media_url: string | null;
};

export type IngredientInput = Ingredient & {
    quantity?: number | string | null;
    unit?: Unit | null;
};

// Steps
export type StepTimer = {
    hours?: number;
    minutes?: number;
    seconds?: number;
};

export type StepData = {
    id: string;
    step_number: number;
    description: string;
    timer: StepTimer | null;
    image_url: string;
    upload_url: string;
};

// Dietary 
export type DietaryData = {
    other: string;
    vegetarian: boolean;
    vegan: boolean;
    gluten_free: boolean;
    dairy_free: boolean;
    nut_free: boolean;
    keto: boolean;
    halal: boolean;
    pescatarian: boolean;
    kosher: boolean;
};

// Default dietary data
export const defaultDietaryData: DietaryData = {
    vegetarian: false,
    vegan: false,
    gluten_free: false,
    dairy_free: false,
    nut_free: false,
    keto: false,
    halal: false,
    pescatarian: false,
    kosher: false,
    other: "",
}

// Nutrition 
export type NutritionData = {
    servings: number;

    per_serving: {
        calories: number;
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

// Payload Don't touch
export type PostPayload = {
    dish_name: string;
    description: string;
    difficulty: string;
    media_url: string;
    upload_url?: string;
    media_type: MediaType | null;
    user_sub?: string;
    ingredients: Ingredient[];
    steps: StepData[];
    nutrition: NutritionData[];
    dietary: DietaryData[];
};