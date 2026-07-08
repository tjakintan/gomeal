import db from "@/services/db";

type ReportTargetType = "post" | "message" | "user";

const REPORT_REVIEW_THRESHOLDS: Record<ReportTargetType, number> = {
    post: 3,
    message: 0,
    user: 5,
};

export async function report(
    reporter_sub: string,
    target_type: ReportTargetType,
    target_id: string,
    reason?: string,
    details?: string
) {
    if (target_type === "user" && reporter_sub === target_id) {
        throw new Error("cannot_report_self");
    }

    await db.query("BEGIN");

    try {
        await db.query(
            `
            INSERT INTO reports (
                reporter_sub,
                target_type,
                target_id,
                reason,
                details
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (reporter_sub, target_type, target_id) DO NOTHING
            `,
            [reporter_sub, target_type, target_id, reason ?? null, details ?? null]
        );

        const reportCountResult = await db.query(
            `
            SELECT COUNT(*)::int AS count
            FROM reports
            WHERE target_type = $1
            AND target_id = $2
            AND status = 'pending'
            `,
            [target_type, target_id]
        );

        const reportCount = reportCountResult.rows[0]?.count ?? 0;
        const shouldReview = reportCount >= REPORT_REVIEW_THRESHOLDS[target_type];

        if (shouldReview && target_type === "post") {
            await db.query(
                `
                UPDATE post
                SET status = 'pending_review',
                    status_created_on = now()
                WHERE id = $1
                AND status = 'active'
                `,
                [Number(target_id)]
            );
        }

        if (shouldReview && target_type === "message") {
            await db.query(
                `
                UPDATE messages
                SET status = 'pending_review',
                    status_created_on = now()
                WHERE id = $1
                AND status = 'active'
                `,
                [Number(target_id)]
            );
        }

        if (shouldReview && target_type === "user") {
            await db.query(
                `
                UPDATE users
                SET status = 'pending_review',
                    status_created_on = now()
                WHERE sub = $1
                AND status = 'active'
                `,
                [target_id]
            );
        }

        await db.query("COMMIT");

        return {
            ok: true,
            reportCount,
            pendingReview: shouldReview,
        };
    } catch (err) {
        await db.query("ROLLBACK");
        throw err;
    }
}
