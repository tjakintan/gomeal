import db from "@/services/db";
import { Cart, CartItem, CartItemRow, CartResponse } from "@/types/cart.types";
import { _get_ingredients_by_id } from "@/routes/cook/ingredient";

const calculateCartItemPrice = (
    basePricePer100g: number | null,
    quantity?: number | null,
    unit?: string | null
): number | null => {
    if (basePricePer100g === null || basePricePer100g === undefined) return null;
    if (quantity === null || quantity === undefined) return null;

    const grams = (() => {
        switch (unit) {
            case "kg": return quantity * 1000;
            case "g":  return quantity;
            case "oz": return quantity * 28.3495;
            case "lb": return quantity * 453.592;
            case "l":  return quantity * 1000;
            case "ml": return quantity;
            default:   return quantity * 100; 
        }
    })();

    return Number((basePricePer100g * (grams / 100)).toFixed(2));
};

export const _get_cart = async (
    user_sub: string,
    cart_id: number
): Promise<Cart | null> => {
    const cartResult = await db.query(
        `
        SELECT
            c.id AS cart_id,
            c.name,
            COUNT(i.id)::int AS num_ingredients
        FROM user_cart c
        LEFT JOIN user_cart i
          ON i.cart_id = c.id
         AND i.user_sub = c.user_sub
         AND i.ingredient_id IS NOT NULL
        WHERE c.id = $1
          AND c.user_sub = $2
          AND c.ingredient_id IS NULL
        GROUP BY c.id, c.name;
        `,
        [cart_id, user_sub]
    );

    const cart = cartResult.rows[0];

    if (!cart) return null;

    const itemResult = await db.query(
        `
        SELECT
            uc.id,
            uc.ingredient_id,
            uc.quantity,
            uc.unit,
            uc.checked,
            uc.price
        FROM user_cart uc
        WHERE uc.cart_id = $1
        AND uc.user_sub = $2
        AND uc.ingredient_id IS NOT NULL
        ORDER BY uc.id ASC;
        `,
        [cart_id, user_sub]
    );

    const items: CartItem[] = await Promise.all(
        itemResult.rows.map(async (item: CartItemRow) => {
            const ingredients = await _get_ingredients_by_id({
                ingredient_id: Number(item.ingredient_id),
            });

            return {
                id: item.id,
                quantity: Number(item.quantity ?? 0),
                unit: item.unit ?? "",
                checked: Boolean(item.checked),
                price: item.price !== null ? Number(item.price) : null,
                ingredient: ingredients[0],
            };
        })
    );

    return {
        id: Number(cart.cart_id),
        name: cart.name,
        num_ingredients: Number(cart.num_ingredients ?? 0),
        items,
    };
};

export const _get_carts = async (
    user_sub: string,
    name?: string
): Promise<Cart[]> => {

    const result = await db.query(
        `
        SELECT
            c.id AS cart_id,
            c.name,
            COUNT(i.id)::int AS num_ingredients
        FROM user_cart c
        LEFT JOIN user_cart i
          ON i.cart_id = c.id
         AND i.user_sub = c.user_sub
         AND i.ingredient_id IS NOT NULL
        WHERE c.user_sub = $1
          AND c.ingredient_id IS NULL
          AND c.cart_id IS NULL
          AND (
                $2::varchar IS NULL
                OR c.name = $2
              )
        GROUP BY c.id, c.name
        ORDER BY c.id ASC;
        `,
        [user_sub, name ?? null]
    );

    return result.rows;
};

export const _create_cart = async (
    user_sub: string,
    name = "Cart"
): Promise<Cart> => {

    const result = await db.query(
        `
        INSERT INTO user_cart (
            user_sub,
            name
        )
        VALUES ($1, $2)
        RETURNING
            id AS cart_id,
            name,
            0::int AS num_ingredients;
        `,
        [user_sub, name]
    );

    return result.rows[0];
};

export const _delete_cart = async (
    cart_id: number,
    user_sub: string
): Promise<{ cart_id: number; deleted: boolean }> => {

    const result = await db.query(
        `
        DELETE FROM user_cart
        WHERE id = $1
          AND user_sub = $2
          AND ingredient_id IS NULL
          AND cart_id IS NULL
        RETURNING
            id AS cart_id;
        `,
        [cart_id, user_sub]
    );

    return {
        cart_id,
        deleted: Boolean(result.rows[0]),
    };
};

export const _get_ingredient_cart_status = async (
    user_sub: string,
    ingredient_id: number
): Promise<CartResponse> => {
    const result = await db.query(
        `
        WITH target AS (
            SELECT normalized_name
            FROM ingredient
            WHERE id = $2
        )
        SELECT 
            uc.cart_id,
            uc.ingredient_id,
            uc.quantity,
            uc.unit,
            COALESCE(uc.checked, false) AS checked,
            uc.price,
            true AS in_cart
        FROM user_cart uc
        JOIN ingredient i
          ON i.id = uc.ingredient_id
        JOIN target t
          ON t.normalized_name = i.normalized_name
        WHERE uc.user_sub = $1
          AND uc.ingredient_id IS NOT NULL
        LIMIT 1;
        `,
        [user_sub, ingredient_id]
    );

    if (!result.rows[0]) {
        return {
            cart_id:          0,
            ingredient_id,
            in_cart:          false,
            checked:          false,
            quantity:         null,
            unit:             null,
            price: null,
        };
    }

    const row = result.rows[0];
    return {
        cart_id:          Number(row.cart_id),
        ingredient_id:    Number(row.ingredient_id),
        in_cart:          Boolean(row.in_cart),
        checked:          Boolean(row.checked),
        quantity:         row.quantity !== null ? Number(row.quantity) : null,
        unit:             row.unit ?? null,
        price: row.price !== null ? Number(row.price) : null,
    };
};

export const _update_ingredient_in_user_cart = async (
    cart_id: number,
    ingredient_id: number,
    user_sub: string,
    quantity?: number | null,
    unit?: string | null,
): Promise<CartResponse> => {
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const ingredient = await _get_ingredients_by_id({ ingredient_id });
        if (!ingredient.length) {
            throw new Error("Ingredient not found");
        }

        const priceResult = await client.query(
            `
            SELECT price
            FROM ingredient
            WHERE id = $1;
            `,
            [ingredient_id]
        );

        const basePrice =
            priceResult.rows[0]?.price !== null &&
            priceResult.rows[0]?.price !== undefined
                ? Number(priceResult.rows[0].price)
                : null;

        const nextQuantity = quantity ?? null;
        const nextUnit = unit ?? null;
        const price = calculateCartItemPrice(basePrice, nextQuantity, nextUnit);

        const result = await client.query(
            `
            UPDATE user_cart
            SET
                quantity = $4,
                unit = $5,
                price = $6
            WHERE cart_id = $1
              AND ingredient_id = $2
              AND user_sub = $3
            RETURNING
                cart_id,
                ingredient_id,
                quantity,
                unit,
                checked,
                price,
                true AS in_cart;
            `,
            [cart_id, ingredient_id, user_sub, nextQuantity, nextUnit, price]
        );

        if (!result.rows[0]) {
            throw new Error("Ingredient not found in cart");
        }

        await client.query("COMMIT");

        const row = result.rows[0];

        return {
            cart_id: Number(row.cart_id),
            ingredient_id: Number(row.ingredient_id),
            in_cart: Boolean(row.in_cart),
            checked: Boolean(row.checked),
            quantity: row.quantity !== null ? Number(row.quantity) : null,
            unit: row.unit ?? null,
            price: row.price !== null ? Number(row.price) : null,
        };
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Update ingredient in user cart error:", err.detail ?? err.message);
        throw err;
    } finally {
        client.release();
    }
};

export const _insert_ingredient_into_user_cart = async (
    cart_id: number,
    ingredient_id: number,
    user_sub: string,
    quantity?: number | null,
    unit?: string | null,
): Promise<CartResponse> => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const ingredient = await _get_ingredients_by_id({ ingredient_id });
        if (!ingredient.length) {
            throw new Error("Ingredient not found");
        }

        const existing = await client.query(
            `
            WITH target AS (
                SELECT normalized_name
                FROM ingredient
                WHERE id = $2
            )
            SELECT 
                uc.cart_id,
                uc.ingredient_id,
                uc.quantity,
                uc.unit,
                COALESCE(uc.checked, false) AS checked,
                uc.price
            FROM user_cart uc
            JOIN ingredient i
                ON i.id = uc.ingredient_id
            JOIN target t
                ON t.normalized_name = i.normalized_name
            WHERE uc.user_sub = $1 
                AND uc.ingredient_id IS NOT NULL
            LIMIT 1;
            `,
            [user_sub, ingredient_id]
        );

        if (existing.rows[0]) {
            const err: any = new Error("Ingredient already exists in cart");
            err.status = 409;
            err.code = "INGREDIENT_ALREADY_IN_CART";
            err.cart_id = existing.rows[0].cart_id;
            err.ingredient_id = existing.rows[0].ingredient_id;
            err.checked = existing.rows[0].checked;
            err.quantity = existing.rows[0].quantity;
            err.unit = existing.rows[0].unit;
            err.price = existing.rows[0].price !== null
                ? Number(existing.rows[0].price)
                : null;
            throw err;
        }

        const priceResult = await client.query(
            `
            SELECT price
            FROM ingredient
            WHERE id = $1;
            `,
            [ingredient_id]
        );

        const basePrice = priceResult.rows[0]?.price !== null &&
            priceResult.rows[0]?.price !== undefined
                ? Number(priceResult.rows[0].price)
                : null;

        const price = calculateCartItemPrice(basePrice, quantity ?? null, unit ?? null);

        const result = await client.query(
            `
            INSERT INTO user_cart (
                user_sub,
                cart_id,
                ingredient_id,
                quantity,
                unit,
                checked,
                price
            )
            VALUES ($1, $2, $3, $4, $5, false, $6)
            RETURNING
                cart_id,
                ingredient_id,
                quantity,
                unit,
                checked,
                price,
                true AS in_cart;
            `,
            [user_sub, cart_id, ingredient_id, quantity ?? null, unit ?? null, price]
        );

        await client.query("COMMIT");

        const row = result.rows[0];
        return {
            cart_id:          Number(row.cart_id),
            ingredient_id:    Number(row.ingredient_id),
            in_cart:          Boolean(row.in_cart),
            checked:          Boolean(row.checked),
            quantity:         row.quantity !== null ? Number(row.quantity) : null,
            unit:             row.unit ?? null,
            price:         row.price !== null ? Number(row.price) : null,
        };

    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Insert ingredient into user cart error:", err.detail ?? err.message);
        throw err;
    } finally {
        client.release();
    }
};

export const _delete_ingredient_from_user_cart = async (
    cart_id: number,
    ingredient_id: number,
    user_sub: string
): Promise<CartResponse> => {

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
            DELETE FROM user_cart
            WHERE cart_id = $1
              AND ingredient_id = $2
              AND user_sub = $3
            RETURNING
                cart_id,
                ingredient_id,
                false AS in_cart,
                false AS checked,
                NULL::numeric AS quantity,
                NULL::varchar AS unit,
                NULL::numeric AS price;
            `,
            [cart_id, ingredient_id, user_sub]
        );

        await client.query("COMMIT");

        return result.rows[0] ?? {
            cart_id,
            ingredient_id,
            in_cart: false,
            checked: false,
            quantity: null,
            unit: null,
            price: null,
        };

    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Delete ingredient from user cart error:", err.detail ?? err.message);
        throw err;
    } finally {
        client.release();
    }
};


