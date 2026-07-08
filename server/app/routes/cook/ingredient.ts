import db from "@/services/db";
import { Ingredient, IngredientInput } from "@/types/food.types";

type DbClient = Awaited<ReturnType<typeof db.connect>>;

const normalizeIngredientName = (name: string) => {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/s$/, "");
};

export const _create_ingredient = async (
    client: DbClient,
    ingredients: IngredientInput[]
): Promise<{ ingredient_id: number }[]> => {
    if (!ingredients.length) {
        return [];
    }

    const ingredientIds: { ingredient_id: number }[] = [];

    for (const input of ingredients) {
        const name = input.name.trim();

        if (!name) {
            continue;
        }

        const source = input.source?.trim() || "manual";
        const normalizedName = normalizeIngredientName(name);

        const result = await client.query(
            `
            INSERT INTO ingredient (
                source,
                name,
                normalized_name,
                category,
                media_url
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (source, lower(name))
            DO UPDATE SET
                normalized_name = EXCLUDED.normalized_name,
                category = COALESCE(EXCLUDED.category, ingredient.category),
                media_url = COALESCE(EXCLUDED.media_url, ingredient.media_url),
                updated_at = now()
            RETURNING id AS ingredient_id;
            `,
            [
                source,
                name,
                normalizedName,
                input.category ?? null,
                input.media_url ?? null,
            ]
        );

        ingredientIds.push({
            ingredient_id: Number(result.rows[0].ingredient_id),
        });
    }

    return ingredientIds;
};

export const _find_ingredient = async (query: string): Promise<Ingredient[]> => {
    if (query.trim().length < 3) return [];

    const normalizedQuery = query.trim().toLowerCase();

    const result = await db.query(
        `SELECT
            id,
            name,
            normalized_name,
            source,
            category,
            media_url
         FROM ingredient
         WHERE
            normalized_name LIKE $1
            OR LOWER(name) LIKE $2
         ORDER BY
            CASE WHEN normalized_name LIKE $1 THEN 0 ELSE 1 END
         LIMIT 20`,
        [`${normalizedQuery}%`, `%${normalizedQuery}%`]
    );

    return result.rows.map((row: Ingredient & { id: number }) => ({
        id: row.id,
        name: row.name ?? "",
        normalized_name: row.normalized_name ?? null,
        source: row.source ?? null,
        category: row.category ?? null,
        media_url: row.media_url ?? null,
    }));
};

export const _get_ingredients_by_id = async ({
    post_id,
    ingredient_id,
}: { post_id?: number; ingredient_id?: number }): Promise<Ingredient[]> => {
    const client = await db.connect();

    try {

        if (post_id) {

            const result = await client.query(
                `
                SELECT ingredients
                FROM post
                WHERE id = $1;
                `,
                [post_id]
            );

            return result.rows[0]?.ingredients ?? [];
        }

        if (ingredient_id) {
            const result = await client.query(
                `
                SELECT
                    id,
                    source,
                    name,
                    normalized_name,
                    category,
                    media_url
                FROM ingredient
                WHERE id = $1;
                `,
                [ingredient_id]
            );

            return result.rows;
        }

        return [];
    } finally {
        client.release();
    }
};