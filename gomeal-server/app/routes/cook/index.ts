import express from "express";
import { AuthenticatedRequest, authenticate } from "@/middleware/authenticate";

import { _get_ingredients_by_id } from "./ingredient";
import {
    _get_cart,
    _get_carts,
    _insert_ingredient_into_user_cart,
    _update_ingredient_in_user_cart,
    _delete_ingredient_from_user_cart,
    _create_cart,
    _delete_cart,
    _get_ingredient_cart_status,
} from "../user/cart";

const cook_router = express.Router();

cook_router.get("/:post_id/ing", authenticate, async (req: AuthenticatedRequest, res) => {

    const post_id = Number(req.params.post_id);
    const user_sub = req.user?.sub;

    if (!user_sub || !Number.isNaN(post_id)) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const ingredients = await _get_ingredients_by_id({ post_id });
        return res.status(200).json(ingredients);

    } catch (err) {
        console.error("failed_to_fetch_post_ingredients", err);
        return res.status(500).json({ error: "failed_to_fetch_post_ingredients" });
    }
    
});

cook_router.get("/grocery-cart/:cart_id", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req.user?.sub;
    const cart_id = Number(req.params.cart_id);

    if (!user_sub || Number.isNaN(cart_id)) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {
        const cart = await _get_cart(user_sub, cart_id);
        return res.status(200).json(cart);
    } catch (err) {
        console.error("failed_to_get_grocery_cart", err);
        return res.status(500).json({ error: "failed_to_get_grocery_cart" });
    }

});

cook_router.post("/grocery-carts", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req.user?.sub;
    const name = req.body?.name;

    if (!user_sub) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const cart = await _get_carts(user_sub, name);
        return res.status(200).json(cart);

    } catch (err) {
        console.error("failed_to_get_grocery_cart", err);
        return res.status(500).json({ error: "failed_to_get_grocery_cart" });
    }

});

cook_router.post("/grocery-cart/create", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req.user?.sub;
    const name = req.body?.name;

    if (!user_sub) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const cart = await _create_cart(user_sub, name);
        return res.status(200).json(cart);

    } catch (err) {
        console.error("failed_to_get_grocery_cart", err);
        return res.status(500).json({ error: "failed_to_get_grocery_cart" });
    }

});

cook_router.post("/grocery-cart/:cart_id/delete", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req.user?.sub;
    const cart_id = Number(req.params?.cart_id);

    if (!user_sub || !Number.isFinite(cart_id)) {
        return res.status(400).json({ error: "request_failed_missing_cart_id" });
    }

    try {
        
        const result = await _delete_cart(cart_id, user_sub);
        return res.status(200).json(result);

    } catch (err) {
        console.error("failed_to_delete_cart", err);
        return res.status(500).json({ error: "failed_to_delete_cart" });
    }

});

cook_router.get("/grocery/:ingredient_id/status", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req.user?.sub;
    const ingredient_id = Number(req.params?.ingredient_id);

    if (!user_sub || !Number.isFinite(ingredient_id)) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const status = await _get_ingredient_cart_status(user_sub, ingredient_id);
        return res.status(200).json(status);

    } catch (err) {
        console.error("failed_to_get_ingredient_cart_status", err);
        return res.status(500).json({ error: "failed_to_get_ingredient_cart_status" });
    }
});

cook_router.post("/grocery/:ingredient_id/add-ing", authenticate, async (req: AuthenticatedRequest, res) => {

   //console.log(req)
    const user_sub = req.user?.sub;
    const cart_id = Number(req.body?.cart_id);
    const ingredient_id = Number(req.params?.ingredient_id);
    const quantity = req.body?.quantity;
    const unit = req.body?.unit;

    if (
        !user_sub ||
        !Number.isFinite(cart_id) ||
        !Number.isFinite(ingredient_id) 
    ) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const cart = await _insert_ingredient_into_user_cart(
            cart_id,
            ingredient_id,
            user_sub,
            quantity ?? null,
            unit ?? null,
        );

        return res.status(200).json(cart);

    } catch (err: any) {

        if (err.code === "INGREDIENT_ALREADY_IN_CART") {
            const existingCart = await _get_cart(user_sub, err.cart_id);

            return res.status(409).json({
                error: err.code,
                message: err.message,
                cart: existingCart,
            });
        }

        console.error("failed_to_add_ingredients_to_cart", err);
        return res.status(500).json({
            error: "failed_to_add_ingredients_to_cart",
        });
    }

});

cook_router.post("/grocery/:ingredient_id/update-ing", authenticate, async (req: AuthenticatedRequest, res) => {
    const user_sub = req.user?.sub;
    const cart_id = Number(req.body?.cart_id);
    const ingredient_id = Number(req.params?.ingredient_id);
    const quantity = req.body?.quantity;
    const unit = req.body?.unit;

    if (
        !user_sub ||
        !Number.isFinite(cart_id) ||
        !Number.isFinite(ingredient_id)
    ) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {
        const cart = await _update_ingredient_in_user_cart(
            cart_id,
            ingredient_id,
            user_sub,
            quantity ?? null,
            unit ?? null,
        );

        return res.status(200).json(cart);
    } catch (err) {
        console.error("failed_to_update_ingredient_in_cart", err);
        return res.status(500).json({
            error: "failed_to_update_ingredient_in_cart",
        });
    }
});

cook_router.post("/grocery/:ingredient_id/delete-ing", authenticate, async (req: AuthenticatedRequest, res) => {

    //console.log(req)
    const user_sub = req.user?.sub;
    const cart_id = req.body?.cart_id;
    const ingredient_id = Number(req.params?.ingredient_id);

    if (!user_sub || !ingredient_id || !cart_id) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {

        const cart = await _delete_ingredient_from_user_cart(
            cart_id,
            ingredient_id,
            user_sub,
        );

        return res.status(200).json(cart);

    } catch (err) {
        console.error("failed_to_add_ingredients_to_cart", err);
        return res.status(500).json({ error: "failed_to_add_ingredients_to_cart" });
    }

});

export default cook_router;
