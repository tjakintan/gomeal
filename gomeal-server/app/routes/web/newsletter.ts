import db from "@/services/db";
import { PoolClient } from "pg";

export const add_newsletter_subscriber = async (
    email: string,
    options?: { source?: string; topic?: string },
    client?: PoolClient
): Promise<boolean> => {
    const runner = client ?? db;

    const result = await runner.query(
        `INSERT INTO newsletter_subscriptions (
                email,
                is_subscribed,
                source,
                topic,
                created_at,
                updated_at,
                unsubscribed_at
            )
            VALUES ($1, true, $2, $3, NOW(), NOW(), NULL)
            ON CONFLICT (lower(email))
            DO UPDATE SET
                is_subscribed = true,
                source = COALESCE(EXCLUDED.source, newsletter_subscriptions.source),
                topic = COALESCE(EXCLUDED.topic, newsletter_subscriptions.topic),
                updated_at = NOW(),
                unsubscribed_at = NULL
            RETURNING is_subscribed`,
        [email, options?.source ?? null, options?.topic ?? null]
    );

    return result.rows[0]?.is_subscribed ?? false;
};

export const remove_newsletter_subscriber = async (
    email: string,
    client?: PoolClient
): Promise<boolean> => {
    const runner = client ?? db;

    const result = await runner.query(
        `UPDATE newsletter_subscriptions
            SET
                is_subscribed = false,
                unsubscribed_at = NOW(),
                updated_at = NOW()
            WHERE lower(email) = lower($1)
            RETURNING is_subscribed`,
        [email]
    );

    return result.rows.length > 0;
};

export const is_newsletter_subscribed = async (
    email: string,
    client?: PoolClient
): Promise<boolean> => {
    const runner = client ?? db;

    const result = await runner.query(
        `SELECT is_subscribed
            FROM newsletter_subscriptions
            WHERE lower(email) = lower($1)`,
        [email]
    );

    return result.rows[0]?.is_subscribed ?? false;
};