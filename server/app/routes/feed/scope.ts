import db from "@/services/db";
import { FeedScopeType } from "@/types/feed.types";

export const FEED_SCOPES: readonly FeedScopeType[] = [
    "dessert", "soup", "appetizer", "high_protein", "quick", "breakfast",
    "lunch", "dinner", "vegetarian", "vegan", "low_carb", "healthy",
    "meal_prep", "comfort_food", "family_friendly", "budget", "high_fiber",
];
const SCOPE_SET = new Set<string>(FEED_SCOPES);

export const pickScope = (tags: unknown): FeedScopeType | undefined => {
    if (!tags) return undefined;

    if (typeof tags === "string") {
        try {
            tags = JSON.parse(tags);
        } catch {
            return undefined;
        }
    }

    if (typeof tags !== "object") return undefined;

    const candidates: string[] = [];

    if (Array.isArray(tags)) {
        candidates.push(...tags.filter(
            (tag): tag is string => typeof tag === "string"
        ));
    } else {
        const data = tags as Record<string, unknown>;

        // Your actual database structure
        for (const key of ["dish_type", "lifestyle", "intent", "audience", "cuisine"]) {
            const values = data[key];

            if (Array.isArray(values)) {
                candidates.push(
                    ...values.filter(
                        (value): value is string => typeof value === "string"
                    )
                );
            }
        }

        // Backward compatibility with flat objects
        for (const [key, value] of Object.entries(data)) {
            if (SCOPE_SET.has(key) && (value === true || typeof value === "number")) {
                candidates.push(key);
            }
        }
    }

    return candidates.find(
        (candidate): candidate is FeedScopeType => SCOPE_SET.has(candidate)
    );
};

export const get_scope = async (post_id: number): Promise<FeedScopeType | undefined> => {
    const { rows } = await db.query(
        `SELECT scope_tags FROM post_embeddings WHERE post_id = $1`,
        [post_id]
    );
    return rows.length ? pickScope(rows[0].scope_tags) : undefined;
};