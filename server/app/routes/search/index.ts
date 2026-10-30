import express from "express";
import { getTrend } from "@/services/ml";
import { AuthenticatedRequest, authenticate } from "@/middleware/authenticate";
import {
    get_search,
    get_search_users,
} from "./action";

export const search_router = express.Router();

search_router.get("/user/:query", authenticate, async (req: AuthenticatedRequest, res) => {
    const query = String(req.params.query || "").trim();
    const requester_sub = req.user?.sub;

    if (!query || !requester_sub) {
        return res.status(400).json({ error: "missing_field" });  
    }

    try {
        const result = await get_search_users(query, 20, requester_sub);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: "failed_to_fetch_users" });
    }
});

search_router.get("/:query", authenticate, async (req: AuthenticatedRequest, res) => {
    const query = String(req.params.query || "").trim();
    const requester_sub = req.user?.sub;

    if (!query || !requester_sub) {
        return res.status(400).json({ error: "missing_field" });
    }

    try {
        const { users, posts } = await get_search(query, 20, requester_sub);
        return res.status(200).json({ users, posts });
    } catch (err) {
        return res.status(500).json({ error: "failed_to_fetch_search" });
    }
});