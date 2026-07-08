import db from "@/services/db";

export const findUserExistByEmail = async (
    email: string
): Promise<{
    exists: boolean;
    sub: string;
    firstName: string;
    lastName: string;
} | null> => {
    const result = await db.query(
        `SELECT sub, first_name, last_name
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND status = 'active'`,
        [email]
    );

    if (!result.rowCount) return null;

    const { sub, first_name, last_name } = result.rows[0];

    return {
        exists: true,
        sub,
        firstName: first_name,
        lastName: last_name,
    };
};

export const findUserExistByProvider = async (
    provider: string,
    provider_sub: string
): Promise<{
    exists: boolean;
    sub: string;
    firstName: string;
    lastName: string;
    email: string;
} | null> => {
    const result = await db.query(
        `SELECT sub, first_name, last_name, email
         FROM users
         WHERE provider = $1
           AND provider_sub = $2
           AND status = 'active'
         LIMIT 1`,
        [provider, provider_sub]
    );

    if (!result.rowCount) return null;

    const { sub, first_name, last_name, email } = result.rows[0];

    return {
        exists: true,
        sub,
        firstName: first_name,
        lastName: last_name,
        email,
    };
};

export const linkUserProvider = async ({
    sub,
    provider,
    provider_sub,
}: {
    sub: string;
    provider: string;
    provider_sub: string;
}): Promise<void> => {
    await db.query(
        `UPDATE users
         SET provider = $1,
             provider_sub = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE sub = $3
           AND status = 'active'`,
        [provider, provider_sub, sub]
    );
};
