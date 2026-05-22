import { create } from "zustand";
import {
    _get_grocery_cart_api,
    _get_grocery_carts_api,
    _create_grocery_cart_api,
    _delete_grocery_cart_api,
    _insert_into_cart_api,
    _update_cart_item_quantity_unit_api,
    _remove_from_cart_api,
    _get_ingredient_cart_status_api,
} from "@/api/cook.api";
import { Cart, CartResponse } from "@/types/cart.types";

type CartState = {
    loadingCart: boolean;
    carts: Cart[];
    activeCart: Cart | null;
    ingredientStatusById: Record<number, CartResponse>;

    loadCarts: (name?: string) => Promise<void>;
    loadCart: (cart_id: number) => Promise<void>;
    createCart: (name?: string) => Promise<void>;
    deleteCart: (cart_id: number) => Promise<void>;

    setActiveCart: (cart_id: number) => Promise<void>;
    clearActiveCart: () => void;

    loadIngredientStatus: (ingredient_id: number) => Promise<CartResponse>;
    isIngredientInAnyCart: (ingredient_id: number) => {
        in_cart: boolean;
        quantity: number | null;
        unit: string | null;
        price: number | null;
    };
    updateCartItemQuantityUnit: (
        ingredient_id: number,
        cart_id: number,
        quantity: number,
        unit: string | null,
    ) => Promise<CartResponse>;


    insertIntoCart: (ingredient_id: number, cart_id?: number, quantity?: number | null, unit?: string | null) => Promise<CartResponse>;
    removeFromCart: (ingredient_id: number, cart_id?: number) => Promise<void>;

    closeCart: () => void;
};

const normalizeCart = (cart: any): Cart => ({
    id: Number(cart.cart_id ?? cart.id),
    name: cart.name,
    num_ingredients: Number(cart.num_ingredients ?? cart.items?.length ?? 0),
    items: (cart.items ?? []).map((item: any) => ({
        ...item,
        id: Number(item.id),
        quantity: Number(item.quantity ?? 1),
        unit: item.unit ?? "",
        checked: Boolean(item.checked),
        price: item.price !== null && item.price !== undefined ? Number(item.price) : null,
        ingredient: item.ingredient
            ? {
                ...item.ingredient,
                id: Number(item.ingredient.id ?? item.ingredient.ingredient_id),
                ingredient_id: Number(item.ingredient.ingredient_id ?? item.ingredient.id),
            }
            : undefined,

    })),
});

const upsertCart = (carts: Cart[], cart: Cart) =>
    carts.some((existingCart) => existingCart.id === cart.id)
        ? carts.map((existingCart) => existingCart.id === cart.id ? cart : existingCart)
        : [...carts, cart];

export const useCart = create<CartState>((set, get) => ({
    loadingCart: false,
    carts: [],
    activeCart: null,
    ingredientStatusById: {},

    loadCarts: async (name) => {
        set({ loadingCart: true });

        try {
            const carts = (await _get_grocery_carts_api(name)).map(normalizeCart);
            set({ carts, loadingCart: false });
        } catch (err) {
            console.error("Failed to open carts:", err);
            set({ loadingCart: false });
        }
    },

    loadCart: async (cart_id) => {
        set({ loadingCart: true });

        try {
            const cart = normalizeCart(await _get_grocery_cart_api(cart_id));

            set((state) => ({
                activeCart: cart,
                carts: upsertCart(state.carts, cart),
                loadingCart: false,
            }));
        } catch (err) {
            console.error("Failed to load cart:", err);
            set({ loadingCart: false });
        }
    },

    setActiveCart: async (cart_id) => {
        await get().loadCart(cart_id);
    },

    createCart: async (name) => {
        set({ loadingCart: true });

        try {
            const cart = normalizeCart(await _create_grocery_cart_api(name));

            set((state) => ({
                carts: upsertCart(state.carts, cart),
                loadingCart: false,
            }));
        } catch (err) {
            console.error("Failed to create cart:", err);
            set({ loadingCart: false });
        }
    },

    deleteCart: async (cart_id) => {
        set({ loadingCart: true });

        try {
            const response = await _delete_grocery_cart_api(cart_id);

            set((state) => ({
                carts: state.carts.filter((cart) => cart.id !== response.cart_id),
                activeCart: state.activeCart?.id === response.cart_id ? null : state.activeCart,
                loadingCart: false,
            }));
        } catch (err) {
            console.error("Failed to delete cart:", err);
            set({ loadingCart: false });
            throw err;
        }
    },

    updateCartItemQuantityUnit: async (ingredient_id, cart_id, quantity, unit) => {
        const targetCartId = cart_id ?? get().activeCart?.id;

        if (!targetCartId) {
            throw new Error("no_active_cart_selected");
        }

        const nextQuantity = Number(quantity) || 1;
        const nextUnit = unit ?? null;

        set((state) => {
            const updateCart = (cart: Cart) => {
                if (cart.id !== targetCartId) return cart;

                return {
                    ...cart,
                    items: cart.items?.map((item) => {
                        const itemIngredientId = Number(item.ingredient?.id);

                        if (itemIngredientId !== ingredient_id) return item;

                        return {
                            ...item,
                            quantity: nextQuantity,
                            unit: nextUnit ?? "",
                        };
                    }) ?? [],
                };
            };

            return {
                activeCart: state.activeCart ? updateCart(state.activeCart) : state.activeCart,
                carts: state.carts.map(updateCart),
                ingredientStatusById: {
                    ...state.ingredientStatusById,
                    [ingredient_id]: {
                        ...(state.ingredientStatusById[ingredient_id] ?? {}),
                        cart_id: targetCartId,
                        ingredient_id,
                        in_cart: true,
                        checked: state.ingredientStatusById[ingredient_id]?.checked ?? false,
                        quantity: nextQuantity,
                        unit: nextUnit,
                        price: state.ingredientStatusById[ingredient_id]?.price ?? null,
                    },
                },
            };
        });

        try {
            const status = await _update_cart_item_quantity_unit_api({
                cart_id: targetCartId,
                ingredient_id,
                quantity: nextQuantity,
                unit: nextUnit,
            });

            const cart = normalizeCart(await _get_grocery_cart_api(targetCartId));

            set((state) => ({
                activeCart: state.activeCart?.id === targetCartId ? cart : state.activeCart,
                carts: upsertCart(state.carts, cart),
                ingredientStatusById: {
                    ...state.ingredientStatusById,
                    [ingredient_id]: status,
                },
                loadingCart: false,
            }));

            return status;
        } catch (err) {
            await get().loadCart(targetCartId);
            set({ loadingCart: false });
            throw err;
        }
    },

    loadIngredientStatus: async (ingredient_id) => {
        const status = await _get_ingredient_cart_status_api(ingredient_id);

        set((state) => ({
            ingredientStatusById: {
                ...state.ingredientStatusById,
                [ingredient_id]: status,
            },
        }));

        return status;
    },

    isIngredientInAnyCart: (ingredient_id) => {
        const status = get().ingredientStatusById[ingredient_id];

        return {
            in_cart: Boolean(status?.in_cart),
            quantity: status?.quantity ?? null,
            unit: status?.unit ?? null,
            price: status?.price ?? null,
        };
    },

    insertIntoCart: async (ingredient_id, cart_id, quantity, unit) => {
        const targetCartId = cart_id ?? get().activeCart?.id;

        if (!targetCartId) {
            throw new Error("no_active_cart_selected");
        }

        set({ loadingCart: true });

        try {
            const result = await _insert_into_cart_api({
                cart_id: targetCartId,
                ingredient_id,
                quantity: quantity ?? null,
                unit: unit ?? null,
            });

            const status: CartResponse = {
                cart_id:       Number((result as any).cart_id ?? targetCartId),
                ingredient_id,
                in_cart:       true,
                checked:       Boolean((result as any).checked),
                quantity:      (result as any).quantity !== undefined ? Number((result as any).quantity) : quantity ?? null,
                unit:          (result as any).unit ?? unit ?? null,
                price:         (result as any).price !== null && (result as any).price !== undefined
                    ? Number((result as any).price)
                    : null,
            };

            const cart = normalizeCart(await _get_grocery_cart_api(targetCartId));

            set((state) => ({
                activeCart: state.activeCart?.id === targetCartId ? cart : state.activeCart,
                carts: upsertCart(state.carts, cart),
                ingredientStatusById: {
                    ...state.ingredientStatusById,
                    [ingredient_id]: status,
                },
                loadingCart: false,
            }));

            return status;
        } catch (err) {
            console.error("Failed to insert into cart:", err);
            set({ loadingCart: false });
            throw err;
        }
    },

    removeFromCart: async (ingredient_id, cart_id) => {
        const targetCartId = cart_id ?? get().activeCart?.id;

        if (!targetCartId) {
            throw new Error("no_active_cart_selected");
        }

        set({ loadingCart: true });

        try {
            await _remove_from_cart_api({
                cart_id: targetCartId,
                ingredient_id,
            });

            const [cart, status] = await Promise.all([
                _get_grocery_cart_api(targetCartId),
                _get_ingredient_cart_status_api(ingredient_id),
            ]);

            const normalizedCart = normalizeCart(cart);

            set((state) => ({
                activeCart: state.activeCart?.id === targetCartId ? normalizedCart : state.activeCart,
                carts: upsertCart(state.carts, normalizedCart),
                ingredientStatusById: {
                    ...state.ingredientStatusById,
                    [ingredient_id]: status,
                },
                loadingCart: false,
            }));
        } catch (err) {
            console.error("Failed to remove from cart:", err);
            set({ loadingCart: false });
            throw err;
        }
    },

    clearActiveCart: () => {
        set({ activeCart: null, loadingCart: false });
    },

    closeCart: () => {
        set({
            carts: [],
            activeCart: null,
            ingredientStatusById: {},
            loadingCart: false,
        });
    },

}));
