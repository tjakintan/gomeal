import { IngredientInput } from "./food.types";

export type CartItemRow = {
    id: number;
    ingredient_id: number;
    quantity: number | null;
    unit: string | null;
    checked: boolean;
    price: number | string | null;
};

export type CartItem = {
    id: number;
    quantity: number;
    unit: string;
    checked: boolean;
    price: number | null;
    ingredient?: IngredientInput;
};


export interface CartResponse {
    cart_id:          number;
    ingredient_id:    number;
    in_cart:          boolean;
    checked:          boolean;
    quantity:         number | null;
    unit:             string | null;
    price: number | null;

}

export type Cart = {
    id: number;
    name: string;
    num_ingredients: number;
    items?: CartItem[];
};