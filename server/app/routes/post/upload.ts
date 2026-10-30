import db from "@/services/db";
import { _create_ingredient } from "../cook/ingredient";
import { DietaryData, IngredientInput, NutritionData, StepData } from "@/types/food.types";

const upload = async (
    user_sub: string,
    dish_name: string,
    description: string,
    difficulty: string,
    image_url: string,
    media_type: string,
    ingredients: IngredientInput[],
    steps: StepData[],
    nutrition: NutritionData[],
    dietary: DietaryData[],
    media_duration: number | null = null
): Promise<{ post_id: string }[]> => {

    const client = await db.connect();

    try {

        await client.query('BEGIN');

        const _dietary = dietary != null ? JSON.stringify(dietary) : null;

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
                dietary,
                media_duration
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7::jsonb,
                $8::jsonb,
                $9::jsonb,
                $10::jsonb,
                $11
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
                _dietary,
                media_duration,
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

