import db from "@/services/db";
import { InboxConversation } from "@/types/messages.types";

export const get_direct_inbox = async (
    current_user_sub: string
): Promise<InboxConversation[]> => {
    const result = await db.query(
        `
        SELECT
            c.id,
            c.type,
            c.created_at,
            c.created_by,
            u.sub AS other_user_sub,
            u.profile_name,
            u.first_name,
            u.last_name,
            u.profile_img_url,
            u.badge,
            u.avatar,
            lm.id AS last_message_id,
            lm.conversation_id AS last_message_conversation_id,
            lm.sender_sub AS last_message_sender_sub,
            lm.content AS last_message_content,
            lm.sent_at AS last_message_sent_at,
            lm.is_read AS last_message_is_read,
            lm.status AS last_message_status,
            lm.status_created_on AS last_message_status_created_on,
            COUNT(unread.id)::int AS unread_count
        FROM conversations c
        JOIN conversation_participants me
            ON me.conversation_id = c.id
           AND me.user_sub = $1
           AND me.status = 'accepted'
        JOIN conversation_participants other_cp
            ON other_cp.conversation_id = c.id
           AND other_cp.user_sub != $1
           AND other_cp.status IN ('accepted', 'left', 'pending')
        JOIN users u
            ON u.sub = other_cp.user_sub
        LEFT JOIN LATERAL (
            SELECT m.*
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.status = 'active'
            ORDER BY m.sent_at DESC
            LIMIT 1
        ) lm ON true
        LEFT JOIN messages unread
            ON unread.conversation_id = c.id
           AND unread.sender_sub != $1
           AND unread.is_read = false
           AND unread.status = 'active'
        WHERE c.type = 'direct'
          AND u.status = 'active'
          AND NOT EXISTS (
              SELECT 1
              FROM user_blocks ub
              WHERE
                  (ub.blocker_sub = $1 AND ub.blocked_sub = u.sub)
                  OR
                  (ub.blocker_sub = u.sub AND ub.blocked_sub = $1)
          )
        GROUP BY
            c.id,
            c.type,
            c.created_at,
            c.created_by,
            u.sub,
            u.profile_name,
            u.first_name,
            u.last_name,
            u.profile_img_url,
            u.badge,
            u.avatar,
            lm.id,
            lm.conversation_id,
            lm.sender_sub,
            lm.content,
            lm.sent_at,
            lm.is_read,
            lm.status,
            lm.status_created_on
        ORDER BY lm.sent_at DESC NULLS LAST, c.created_at DESC
        `,
        [current_user_sub]
    );

    return result.rows.map((row: any): InboxConversation => ({
        conversation: {
            id: row.id,
            type: "direct",
            created_at: row.created_at,
            created_by: row.created_by,
        },
        other_user: {
            sub: row.other_user_sub,
            badge: row.badge,
            avatar: row.avatar,
            profile_name: row.profile_name,
            firstName: row.first_name,
            lastName: row.last_name,
            profile_img_url: row.profile_img_url,
        },
        last_message: row.last_message_id
            ? {
                id: row.last_message_id,
                conversation_id: row.last_message_conversation_id,
                sender_sub: row.last_message_sender_sub,
                content: row.last_message_content,
                sent_at: row.last_message_sent_at,
                is_read: row.last_message_is_read,
                status: row.last_message_status,
                status_created_on: row.last_message_status_created_on,
            }
            : undefined,
        unread_count: Number(row.unread_count ?? 0),
    }));
};