import { Ingredient } from "./food.types";

export type Retailer = "instacart" | "walmart" | "amazon" | "target" | "weis" | "kroger" | "costco";

export type CartItem = {
    id: number;
    quantity: number;
    unit: string;
    checked: boolean;
    price: number | null;
    ingredient?: Ingredient;
};

export type InsertCartResponse =
    | CartResponse
    | {
        status: number;
        ok: boolean;
        error: string;
        message: string;
        cart: Cart;
    };

export type Cart = {
    id: number;
    name: string;
    num_ingredients: number;
    items?: CartItem[];
};

export type CartResponse = {
    cart_id: number;
    ingredient_id: number;
    in_cart: boolean;
    quantity: number | null;
    unit: string | null;
    checked: boolean;
    price: number | null;
};
