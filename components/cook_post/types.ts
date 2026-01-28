// General Information
export type DishInfoData = {
    dish_image_file: File | null;
    dish_image_url: string;
    dish_name: string;
    dish_description: string;
    dish_difficulty: "easy" | "medium" | "hard" | "";
};

// Ingredient
export type Ingredient = {
    fdcId: number | null;
    category: string | null;
    name: string;
    quantity: string;
    unit: string;
};

// Steps
export type StepTimer = {
    hours?: number;
    minutes?: number;
    seconds?: number;
};

export type StepData = {
    step_number: number;
    description: string;
    tips?: string;
    timer: StepTimer | null;
    image_url: string;
    upload_url: string;
};

// Dietary 
export type DietaryData = {
    vegetarian: boolean;
    vegan: boolean;
    gluten_free: boolean;
    dairy_free: boolean;
    nut_free: boolean;
    keto: boolean;
    halal: boolean;
    pescatarian: boolean;
    kosher: boolean;
    other: string;
};

// Nutrition 
export type NutritionData = {
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;

    sugar_per_100g?: number;
    fiber_g?: number;
    saturated_fat_g?: number;
    cholesterol_mg?: number;
    sodium_mg?: number;
    water_g?: number;

    servings?: number;
    calories_per_serving?: number;
};

// Payload Don't touch
export type PostPayload = {
    dish_name: string;
    description: string;
    difficulty: string;
    image_url: string;
    upload_url?: string;
    user_sub?: string;
    ingredients: Ingredient[];
    steps: StepData[];
    nutrition: NutritionData[];
    dietary: DietaryData[];
};