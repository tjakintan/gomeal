import db from "@/services/db";
import { _create_ingredient } from "../cook/ingredient";
import { IngredientInput } from "@/types/food.types";

const upload = async (
    user_sub: string, 
    dish_name: string, 
    description: string,
    difficulty: string,
    image_url: string,
    media_type: string,
    ingredients: IngredientInput[],
    steps: unknown[],
    nutrition: unknown[],
    dietary: unknown[]
): Promise<{post_id: string}[]> => {

    const client = await db.connect();

    try {

        await client.query('BEGIN');

        {/** 
        const _ingredient_id =  await _create_ingredient(client, ingredients);
        const _ingredients: IngredientInput[] = ingredients.map((ingredient, index) => ({
            ...ingredient,
            ingredient_id: _ingredient_id[index]?.ingredient_id ?? ingredient.ingredient_id ?? null,
        }));
        */}

        const result = await client.query(`
            INSERT INTO post (
                user_sub,
                dish_name,
                description,
                difficulty,
                image_url,
                media_type,
                ingredients,
                steps,
                nutrition,
                dietary
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7::jsonb,
                $8::jsonb,
                $9::jsonb,
                $10::jsonb
            )
            RETURNING id AS post_id;
            `,
            [
                user_sub,
                dish_name,
                description,
                difficulty,
                image_url,
                media_type,
                JSON.stringify(ingredients),
                JSON.stringify(steps),
                JSON.stringify(nutrition),
                JSON.stringify(dietary),
            ]
        );

        const post_id = result.rows[0].post_id;

        await client.query('COMMIT');

        return [{ post_id }];

    } catch (err: any) {

        await client.query(`ROLLBACK`);
        console.error("Reward error", err.detail ?? err.message);
        throw err;

    } finally {
        client.release();
    }
};

export default upload;

