import { DietaryData, FoodPreferences } from "@/types";
import { FeedCard } from "@/types/feed.types";

const getSelectedDiets = (diets: DietaryData) => {
    return (Object.keys(diets) as Array<keyof DietaryData>).filter((key) => {
        if (key === "other") return false;
        return diets[key] === true;
    });
};

const getCalories = (post: FeedCard): number | null => {
    return post.nutrition?.[0]?.per_serving?.calories ?? null;
};

export const matchesFoodPreferences = (
    post: FeedCard,
    preferences: FoodPreferences,
) => {
    const selectedDiets = getSelectedDiets(preferences.diets);

    const matchesDiets =
        selectedDiets.length === 0 ||
        selectedDiets.every((diet) => post.dietary[diet] === true);

    const calories = getCalories(post);

    const matchesMinCalories =
        preferences.calorieRange.min == null ||
        calories == null ||
        calories >= preferences.calorieRange.min;

    const matchesMaxCalories =
        preferences.calorieRange.max == null ||
        calories == null ||
        calories <= preferences.calorieRange.max;

    return matchesDiets && matchesMinCalories && matchesMaxCalories;
};

export const filterFeedByFoodPreferences = (
    posts: FeedCard[],
    preferences: FoodPreferences,
) => {
    return (posts ?? []).filter((post) => matchesFoodPreferences(post, preferences));
};
