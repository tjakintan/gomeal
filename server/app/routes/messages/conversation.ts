import db from "@/services/db";
import { is_user_blocked } from "../user/block";
import { get_minimal_profile } from "../user/getProfile";

/**
 * Returns the other active participant in a direct conversation,
 * but ONLY if the requesting user is an active participant.
 *
 * This is the central authorization check for direct conversations.
 */
export const get_conversation_other_user_sub = async (
    conversation_id: number,
    current_user_sub: string,
): Promise<string | null> => {

    const result = await db.query(
        `
        SELECT other_cp.user_sub
        FROM conversations c

        JOIN conversation_participants current_cp
            ON current_cp.conversation_id = c.id
           AND current_cp.user_sub = $2

        JOIN conversation_participants other_cp
            ON other_cp.conversation_id = c.id
           AND other_cp.user_sub != $2

        WHERE c.id = $1
          AND c.type = 'direct'
          AND current_cp.status != 'left'
          AND other_cp.status != 'left'

        LIMIT 1
        `,
        [
            conversation_id,
            current_user_sub,
        ]
    );

    return result.rows[0]?.user_sub ?? null;
};


/**
 * Get a direct conversation between two users.
 *
 * Both users must currently be active participants.
 */
export const get_direct_conversation = async (
    sender_sub: string,
    receiver_sub: string,
) => {

    if (!sender_sub || !receiver_sub) {
        return null;
    }

    if (sender_sub === receiver_sub) {
        return null;
    }

    const is_blocked = await is_user_blocked(
        sender_sub,
        receiver_sub
    );

    if (is_blocked) {
        throw new Error("user_blocked");
    }

    const result = await db.query(
        `
        SELECT
            c.id,
            c.type,
            c.created_at,
            c.created_by
        FROM conversations c

        JOIN conversation_participants sender_cp
            ON sender_cp.conversation_id = c.id
           AND sender_cp.user_sub = $1

        JOIN conversation_participants receiver_cp
            ON receiver_cp.conversation_id = c.id
           AND receiver_cp.user_sub = $2

        WHERE c.type = 'direct'
          AND sender_cp.status != 'left'
          AND receiver_cp.status != 'left'

        LIMIT 1
        `,
        [
            sender_sub,
            receiver_sub,
        ]
    );

    const conversation = result.rows[0] ?? null;

    if (!conversation) {
        return null;
    }

    const other_user = await get_minimal_profile(
        receiver_sub
    );

    if (!other_user) {
        throw new Error("receiver_not_found");
    }

    return {
        conversation,
        other_user,
    };
};


/**
 * Start a new direct conversation.
 *
 * Existing active conversation lookup should happen before
 * calling this function.
 */
export const start_direct_conversation = async (
    sender_sub: string,
    receiver_sub: string,
) => {

    if (!sender_sub || !receiver_sub) {
        throw new Error("request_failed_missing_body");
    }

    if (sender_sub === receiver_sub) {
        throw new Error("cannot_message_self");
    }

    const is_blocked = await is_user_blocked(
        sender_sub,
        receiver_sub
    );

    if (is_blocked) {
        throw new Error("user_blocked");
    }

    /*
     * Prevent creating a second active direct conversation
     * if one already exists.
     */
    const existing = await get_direct_conversation(
        sender_sub,
        receiver_sub
    );

    if (existing) {
        return existing;
    }

    const client = await db.connect();

    try {

        await client.query("BEGIN");

        const convoResult = await client.query(
            `
            INSERT INTO conversations (
                type,
                created_by
            )
            VALUES (
                'direct',
                $1
            )
            RETURNING
                id,
                type,
                created_at,
                created_by
            `,
            [
                sender_sub,
            ]
        );

        const conversation = convoResult.rows[0];

        await client.query(
            `
            INSERT INTO conversation_participants (
                conversation_id,
                user_sub,
                role,
                status
            )
            VALUES (
                $1,
                $2,
                'member',
                'accepted'
            )
            `,
            [
                conversation.id,
                sender_sub,
            ]
        );

        await client.query(
            `
            INSERT INTO conversation_participants (
                conversation_id,
                user_sub,
                role,
                status
            )
            VALUES (
                $1,
                $2,
                'member',
                'accepted'
            )
            `,
            [
                conversation.id,
                receiver_sub,
            ]
        );

        await client.query("COMMIT");

        const other_user = await get_minimal_profile(
            receiver_sub
        );

        if (!other_user) {
            throw new Error("receiver_not_found");
        }

        return {
            conversation,
            other_user,
        };

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }
};


/**
 * Mark the current user's participation as left.
 *
 * Authorization is performed first through
 * get_conversation_other_user_sub().
 */
export const delete_direct_conversation = async (
    conversation_id: number,
    user_sub: string
): Promise<string> => {

    const other_user_sub =
        await get_conversation_other_user_sub(
            conversation_id,
            user_sub
        );

    if (!other_user_sub) {
        throw new Error("conversation_not_found");
    }

    const result = await db.query(
        `
        UPDATE conversation_participants
        SET status = 'left'
        WHERE conversation_id = $1
          AND user_sub = $2
          AND status != 'left'
        RETURNING id
        `,
        [
            conversation_id,
            user_sub,
        ]
    );

    if (result.rowCount === 0) {
        throw new Error("conversation_participant_not_found");
    }

    return other_user_sub;
};