import db from "@/services/db";

export const create_bug_report = async (
    user_sub: string,
    section: string,
    message: string
): Promise<boolean> => {

    const result = await db.query(
        `INSERT INTO bug_reports (
        user_sub,
        section,
        message
        )
        VALUES ($1, $2, $3)`,
        [user_sub, section, message]
    );

    return result.rowCount === 1;
};
