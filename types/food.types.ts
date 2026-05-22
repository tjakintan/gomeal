import {
    VegetarianIcon, VeganIcon, GlutenFreeIcon,
    DairyFreeIcon, NutFreeIcon, KetoIcon,
    HalalIcon, PescatarianIcon, KosherIcon,
} from "@/icons/Icon";
import { 
    CaloriesIcon,
    ProteinIcon,
    CarbsIcon,
    SugarIcon,
    FatIcon,
    SaturatedFatIcon,
    FiberIcon,
    CholesterolIcon,
    SodiumIcon,
} from "@/icons/Icon";

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
    media_url?: string | null;
    normalized_name?: string | null;
    id: number | null;
    category?: string | null;
    source: string
    name: string;
    quantity: string;
    unit: Unit;
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

export const dietaryDescriptions = {
    other:        "soy-free, nightshade-free",
    vegetarian:   "No meat; may include eggs, milk, cheese, tofu",
    vegan:        "No animal products at all; includes vegetables, beans, nuts, grains",
    gluten_free:  "No wheat, barley, or rye; includes rice, quinoa, potatoes",
    dairy_free:   "No milk or milk-based products; includes plant milks, oils",
    nut_free:     "Contains no tree nuts or peanuts; safe for nut allergies",
    keto:         "Low-carb, high-fat; includes meat, eggs, cheese, avocado, nuts",
    halal:        "Prepared according to Islamic law; includes halal meat and grains",
    pescatarian:  "Includes fish like salmon, tilapia, shrimp; no other meat",
    kosher:       "Prepared following Jewish dietary laws; includes kosher meat, dairy rules",
};

type IconComponent = React.FC<{ size?: number; color?: string }>;

export const dietaryIcons: Partial<Record<keyof typeof dietaryDescriptions, IconComponent>> = {
    vegetarian:  VegetarianIcon,
    vegan:       VeganIcon,
    gluten_free: GlutenFreeIcon,
    dairy_free:  DairyFreeIcon,
    nut_free:    NutFreeIcon,
    keto:        KetoIcon,
    halal:       HalalIcon,
    pescatarian: PescatarianIcon,
    kosher:      KosherIcon,
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

export const nutrients_label_icon = [
  { key: "calories", label: "Calories", icon: CaloriesIcon, color: "#FF6B6B" },
  { key: "protein_g", label: "Protein", icon: ProteinIcon, color: "#4ECDC4" },
  { key: "carbs_g", label: "Carbs", icon: CarbsIcon, color: "#FFD93D" },
  { key: "sugar_g", label: "Sugar", icon: SugarIcon, color: "#FF6BFC" },
  { key: "fat_g", label: "Fat", icon: FatIcon, color: "#FFA500" },
  { key: "saturated_fat_g", label: "Saturated Fat", icon: SaturatedFatIcon, color: "#FF4500" },
  { key: "fiber_g", label: "Fiber", icon: FiberIcon, color: "#32CD32" },
  { key: "cholesterol_mg", label: "Cholesterol", icon: CholesterolIcon, color: "#8B4513" },
  { key: "sodium_mg", label: "Sodium", icon: SodiumIcon, color: "#1E90FF" },
] as const satisfies readonly { key: string; label: string; icon: React.FC<{ size?: number; color?: string }>; color: string }[];

// Payload Don't touch
export type PostPayload = {
    dish_name: string;
    description: string;
    difficulty: string;
    media_url: string;
    media_type: MediaType | null;
    upload_url?: string;
    user_sub?: string;
    ingredients: Ingredient[];
    steps: StepData[];
    nutrition: NutritionData[];
    dietary: DietaryData[];
};