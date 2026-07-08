import s3 from '@/services/s3';
import express from 'express';
import { Server, Socket } from "socket.io";
import log_user_actions from '../user/log';
import { _find_ingredient } from '../cook/ingredient';
import upload from './upload';
import { embedPost } from '@/services/ml';
import { authenticate, AuthenticatedRequest } from "@/middleware/authenticate";
import { ActionWeights } from '@/types/user.types';
import calculateNutrition from './calculateNutrition';

const post_router = express.Router();

post_router.post('/live-ingredients-search', async (req, res) => {

    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    if (query.trim().length < 3) {
        return res.status(400).json({ error: 'query_too_short' });
    }

    try {

        const ingredients = await _find_ingredient(query);
        return res.status(200).json(ingredients);

    } catch (err) {
        console.error('Ingredient search error:', err);
        return res.status(500).json({ error: 'failed_to_fetch_ingredients' });
    }

});

post_router.post('/calculate-nutrition', async (req, res) => {
    const { name, quantity, unit } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        const nutrition = await calculateNutrition(name, quantity, unit);

        if (!nutrition) {
            return res.status(404).json({ error: 'nutrition_not_found' });
        }

        return res.status(200).json(nutrition);

    } catch (err) {
        console.error('Nutrition calculation error:', err);
        return res.status(500).json({ error: 'failed_to_calculate_nutrition' });
    }
});

post_router.post('/upload-media', async (req, res) => {

    const { mediaType, folder } = req.body;

    if (!mediaType || !folder) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {
        const contentType = mediaType === "video" ? "video/mp4" : "image/jpeg";

        const { presignedUrl, s3Url } = await s3(folder, contentType);

        return res.json({ presignedUrl, s3Url });

    } catch (err) {
        
        console.error("upload media error", err);
        return res.status(500).json({ error: "failed_to_get_presigned_url" });
    }
});

post_router.post('/upload', authenticate, async (req: AuthenticatedRequest, res) => {

    //console.log(req)
    const user_sub = req.user?.sub;

    const { dish_name, description, difficulty, image_url, dietary, nutrition, ingredients, steps, media_type } = req.body;

    if (!user_sub || !dish_name || !image_url || !media_type) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        
        const result = await upload(
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
        );

        const post_id = Number(result[0].post_id);

        await log_user_actions({
            user_sub,
            action_type: "CREATE_POST",
            target_type: "POST",
            target_id: post_id,
            metadata: {
                dish_name,
                media_type,
                difficulty: difficulty ?? null,
            },
            context: {
                source: "post_upload",
            },
            action_weight: ActionWeights.CREATE_POST,
        });

        await embedPost(Number(result[0].post_id));
        
    
        return res.status(200).json({ success: true, post_id: result[0].post_id });

    } catch (err) {
        
        return res.status(500).json({ error: 'failed_to_upload_post' });
    }

});

export default post_router
