import { NutritionData, Unit } from "@/types/food.types";

const FDC_API_KEY = process.env.FDC_API_KEY;

const NUTRITION_FIELDS = [
    "calories", "protein_g", "carbs_g", "sugar_g",
    "fat_g", "saturated_fat_g", "fiber_g", "cholesterol_mg", "sodium_mg"
] as const;

type NutrientRow = Record<typeof NUTRITION_FIELDS[number], number>;

const mapUSDANutrients = (nutrients: any[]): NutrientRow =>
    Object.fromEntries(
        NUTRITION_FIELDS.map((field) => {
            const match = nutrients.find((n) => {
                const name = n.nutrientName ?? n.nutrient?.name ?? "";
                switch (field) {
                    case "calories":        return name.includes("Energy");
                    case "protein_g":       return name.includes("Protein");
                    case "carbs_g":         return name.includes("Carbohydrate");
                    case "sugar_g":         return name.includes("Sugar");
                    case "fat_g":           return name.includes("Total lipid");
                    case "saturated_fat_g": return name.includes("Saturated");
                    case "fiber_g":         return name.includes("Fiber");
                    case "cholesterol_mg":  return name.includes("Cholesterol");
                    case "sodium_mg":       return name.includes("Sodium");
                    default:                return false;
                }
            });
            return [field, match?.value ?? match?.amount ?? 0];
        })
    ) as NutrientRow;

const toGrams = (quantity: number, unit: Unit): number => {
    switch (unit) {
        case "kg":  return quantity * 1000;
        case "oz":  return quantity * 28.3495;
        case "lb":  return quantity * 453.592;
        case "l":   return quantity * 1000;
        case "ml":  return quantity;
        case "g":   return quantity;
        default:    return quantity;
    }
};

const getScaleFactor = (quantity: number, unit: Unit, servingSize: number): number => {
    switch (unit) {
        case "whole":
        case "piece":
            return quantity;                            // 1 egg = 1x serving, 2 eggs = 2x
        case "":
            return 1;                                   // no unit, assume 1 serving
        default:
            return toGrams(quantity, unit) / servingSize; // weight-based
    }
};

const calculateNutrition = async (
    name: string,
    quantity: number = 1,
    unit: Unit = ""
): Promise<NutritionData | null> => {
    try {
        const searchRes = await fetch(
            `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(name)}&pageSize=1&api_key=${FDC_API_KEY}`
        );
        const searchData = await searchRes.json() as { foods?: { fdcId: number }[] };
        const food = searchData.foods?.[0];

        if (!food?.fdcId) {
            console.warn(`[calculateNutrition] No USDA match for: ${name}`);
            return null;
        }

        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${food.fdcId}?api_key=${FDC_API_KEY}`);
        const data = await res.json() as { foodNutrients: any[]; servingSize?: number };

        if (!data.foodNutrients) return null;

        const servingSize: number = data.servingSize ?? 100;
        const scaleFactor = getScaleFactor(quantity, unit, servingSize);

        //console.log(`[calculateNutrition] "${name}" | unit: ${unit} | qty: ${quantity} | servingSize: ${servingSize}g | scaleFactor: ${scaleFactor}`);

        const per_serving = mapUSDANutrients(data.foodNutrients);
        const scaled: NutrientRow = Object.fromEntries(
            Object.entries(per_serving).map(([k, v]) => [k, +((v as number) * scaleFactor).toFixed(2)])
        ) as NutrientRow;

        //console.log(`[calculateNutrition] result:`, JSON.stringify(scaled));

        return { servings: quantity, per_serving: scaled };

    } catch (err) {
        console.error(`[calculateNutrition] error for "${name}":`, err);
        return null;
    }
};

export default calculateNutrition;