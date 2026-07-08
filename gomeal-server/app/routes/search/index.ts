import express from "express";
import { getTrend } from "@/services/ml";
import { AuthenticatedRequest, authenticate } from "@/middleware/authenticate";
import {
    get_search,
    get_search_users,
} from "./action";

export const search_router = express.Router();

search_router.get("/:query", authenticate, async (req: AuthenticatedRequest, res) => {

    const query = String(req.params.query || "").trim();

    try {

        if (!query) {
            return res.status(400).json({ error: "missing_field" });
        }

        const result = await get_search(query, 20);
        const { users, posts } = result;

        return res.status(200).json({
            users,
            posts,
        });

    } catch (err) {
        return res.status(500).json({ error: `failed_to_fetch_search_${err}` });
    }
});



search_router.get('/user/:query', authenticate, async (req: AuthenticatedRequest, res) => {

    const query = req.params.query;
    const user_Sub = req?.user?.sub;

    try {

        if(!query || !user_Sub) {
            res.status(400).json({error: "missing_field"})        
        }

        const result = await get_search_users(String(query), 20);
        res.status(200).json(result);

    } catch (err) {
        res.status(500).json({ error: `failed_to_fetch_post_${err}` });   
    }

});