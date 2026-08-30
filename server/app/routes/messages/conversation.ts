import db from "@/services/db";
import { is_user_blocked } from "../user/block";
import { get_minimal_profile } from "../user/getProfile";

export const get_conversation_other_user_sub = async (
    conversation_id: number,
    current_user_sub: string,
): Promise<string | null> => {
    const result = await db.query(
        `SELECT cp.user_sub
        FROM conversation_participants cp
        WHERE cp.conversation_id = $1
        AND cp.user_sub != $2
        LIMIT 1`,
        [conversation_id, current_user_sub]
    );

    return result.rows[0]?.user_sub ?? null;
};

export const get_direct_conversation = async (
    sender_sub: string,
    receiver_sub: string,
) => {

    const is_blocked = await is_user_blocked(sender_sub, receiver_sub);

    if (is_blocked) {
        throw new Error("user_blocked");
    }

    const result = await db.query(
        `SELECT c.id, c.type, c.created_at
        FROM conversations c
        JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
        JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
        WHERE c.type = 'direct' 
        AND cp1.user_sub = $1
        AND cp2.user_sub = $2
        LIMIT 1`,
        [sender_sub, receiver_sub]
    );

    const conversation = result.rows[0] ?? null;
    if (!conversation) return null;

    const other_user = await get_minimal_profile(receiver_sub);
    if (!other_user) throw new Error("receiver_not_found");

    return { conversation, other_user };
};

export const start_direct_conversation = async (
    sender_sub: string,
    receiver_sub: string,
) => {

    const client = await db.connect();
    try {

        await client.query("BEGIN");

        const convoResult = await client.query(
            `INSERT INTO conversations (type, created_by) 
            VALUES ('direct', $1) RETURNING *`,
            [sender_sub]
        );
        const conversation = convoResult.rows[0];

        await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_sub, role, status) 
            VALUES ($1, $2, 'member', 'accepted')`,
            [conversation.id, sender_sub]
        );

        await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_sub, role, status) 
            VALUES ($1, $2, 'member', 'accepted')`,
            [conversation.id, receiver_sub]
        );

        await client.query("COMMIT");

        const other_user = await get_minimal_profile(receiver_sub);
        if (!other_user) throw new Error("receiver_not_found");

        return { conversation, other_user };

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();
    }
};

export const delete_direct_conversation = async (
    conversation_id: number,
    user_sub: string
): Promise<string> => {

    const other_user_sub = await get_conversation_other_user_sub(conversation_id, user_sub);

    if (!other_user_sub) {
        throw new Error("conversation_user_not_found");
    }

    const result = await db.query(
        `UPDATE conversation_participants
            SET status = 'left'
            WHERE conversation_id = $1
            AND user_sub = $2
            RETURNING id`,
        [conversation_id, user_sub]
    );

    if (result.rowCount === 0) {
        throw new Error("conversation_participant_not_found");
    }

    return other_user_sub;
};