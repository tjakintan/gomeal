import { NutritionData } from "@/types/food.types";

/**
 * Safely parses nutrition from DB (json string | object | null)
 */
export const parseNutrition = (input: unknown): NutritionData => {
    if (!input) {
        return {
            servings: 0,
            per_serving: {
                calories: 0,
                protein_g: 0,
                carbs_g: 0,
                sugar_g: 0,
                fat_g: 0,
                saturated_fat_g: 0,
                fiber_g: 0,
                cholesterol_mg: 0,
                sodium_mg: 0,
            },
        };
    }

    const data =
        typeof input === "string"
            ? safeJsonParse(input)
            : input;

    const n = data as any;

    return {
        servings: n?.servings ?? 0,
        per_serving: {
            calories: n?.calories_per_serving ?? 0,
            protein_g: n?.protein_g ?? 0,
            carbs_g: n?.carbs_g ?? 0,
            sugar_g: n?.sugar_g ?? 0,
            fat_g: n?.fat_g ?? 0,
            saturated_fat_g: n?.saturated_fat_g ?? 0,
            fiber_g: n?.fiber_g ?? 0,
            cholesterol_mg: n?.cholesterol_mg ?? 0,
            sodium_mg: n?.sodium_mg ?? 0,
        },
    };
};

/**
 * Safe JSON parse (prevents runtime crash on bad DB data)
 */
const safeJsonParse = (value: string) => {
    try {
        return JSON.parse(value);
    } catch (e) {
        console.warn("[parseNutrition] Invalid JSON:", value);
        return null;
    }
};