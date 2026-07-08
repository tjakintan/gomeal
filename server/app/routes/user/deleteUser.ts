import db from "@/services/db";

export async function delete_account(
    user_sub: string
): Promise<boolean> {

    const result = await db.query(
        `
        UPDATE users
        SET
            status = 'pending_delete',
            status_created_on = NOW()
        WHERE sub = $1
        RETURNING sub
        `,
        [user_sub]
    );

    return (result.rowCount ?? 0) > 0;
}