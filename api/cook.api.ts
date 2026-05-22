import { apiFetch } from "./api";
import { socketEmit } from "./socket";
import { API_BASE } from '../config';
import { Ingredient } from "@/types";
import { Cart, CartResponse, InsertCartResponse } from "@/types/cart.types";

export async function _get_ingredients_post_api(post_id: number): Promise<Ingredient[]> {

    const response = await apiFetch(`${API_BASE}/cook/${encodeURIComponent(post_id)}/ing`, {
        method: "GET",
    });

    return response as Ingredient[];

};

export async function _get_grocery_carts_api(name?: string): Promise<Cart[]> {
    
    const response: any = await apiFetch(`${API_BASE}/cook/grocery-carts`, {
        method: "POST",
        body: JSON.stringify({ name }),
    });

    return response as  Cart[];
}


export async function _get_grocery_cart_api(cart_id: number): Promise<Cart> {
    
    const response = await apiFetch(`${API_BASE}/cook/grocery-cart/${encodeURIComponent(cart_id)}`, {
        method: "GET",
    });

    return response as Cart;
};

export async function _create_grocery_cart_api(name?: string): Promise<Cart> {

    const response = await apiFetch(`${API_BASE}/cook/grocery-cart/create`, {
        method: "POST",
        body: JSON.stringify({ name }),
    });

    return response as Cart;
    
};

export async function _delete_grocery_cart_api(
    cart_id: number
): Promise<{ cart_id: number; deleted: boolean }> {

    const response = await apiFetch(`${API_BASE}/cook/grocery-cart/${encodeURIComponent(cart_id)}/delete`, {
        method: "POST",
    });

    return response as { cart_id: number; deleted: boolean };
};

export async function _get_ingredient_cart_status_api(
    ingredient_id: number
): Promise<CartResponse> {

    const response = await apiFetch(
        `${API_BASE}/cook/grocery/${encodeURIComponent(ingredient_id)}/status`,
        { method: "GET" }
    );

    return response as CartResponse;
};

export async function _insert_into_cart_api(params: {
    cart_id: number;
    ingredient_id: number;
    quantity?: number | null;
    unit?: string | null;
}): Promise<InsertCartResponse> {
    const { cart_id, ingredient_id, quantity, unit } = params;
    const response = await apiFetch(
        `${API_BASE}/cook/grocery/${encodeURIComponent(ingredient_id)}/add-ing`,
        {
            method: "POST",
            body: JSON.stringify({
                cart_id,
                quantity: quantity ?? null,
                unit: unit ?? null,
            }),
        }
    );
    return response as InsertCartResponse;
}

export async function _remove_from_cart_api(params: {
    cart_id: number;
    ingredient_id: number;
}): Promise<CartResponse> {

    const { cart_id, ingredient_id } = params;

    const response = await apiFetch(`${API_BASE}/cook/grocery/${encodeURIComponent(ingredient_id)}/delete-ing`, {
        method: "POST",
        body: JSON.stringify({
            cart_id,
        }),
    });

    return response as CartResponse;
};

export async function _update_cart_item_quantity_unit_api(params: {
    cart_id: number;
    ingredient_id: number;
    quantity?: number | null;
    unit?: string | null;
}): Promise<CartResponse> {
    const { cart_id, ingredient_id, quantity, unit } = params;

    const response = await apiFetch(
        `${API_BASE}/cook/grocery/${encodeURIComponent(ingredient_id)}/update-ing`,
        {
            method: "POST",
            body: JSON.stringify({
                cart_id,
                quantity: quantity ?? null,
                unit: unit ?? null,
            }),
        }
    );

    return response as CartResponse;
}
