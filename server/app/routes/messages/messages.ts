import db from "@/services/db";
import { is_user_blocked } from "../user/block";
import { get_conversation_other_user_sub } from "./conversation";
import { Message } from "@/types/messages.types";

export const get_messages = async (
    conversation_id: number,
    current_user_sub: string,
): Promise<Message[]> => {

    const other_user_sub = await get_conversation_other_user_sub(
        conversation_id,
        current_user_sub
    );

    if (!other_user_sub) {
        throw new Error("conversation_user_not_found");
    }

    const is_blocked = await is_user_blocked(current_user_sub, other_user_sub);
    if (is_blocked) {
        throw new Error("user_blocked");
    }

    await db.query(
        `UPDATE conversation_participants
            SET status = 'accepted'
            WHERE conversation_id = $1
            AND user_sub = $2
            AND status = 'left'`,
        [conversation_id, current_user_sub]
    );

    const result = await db.query(
        `SELECT m.id, m.conversation_id, m.sender_sub, m.content, 
                m.sent_at, m.is_read, m.status, m.status_created_on
        FROM messages m
        WHERE m.conversation_id = $1
        AND m.status = 'active'
        ORDER BY m.sent_at ASC`,
        [conversation_id]
    );

    return result.rows;
};

export const assert_users_can_message = async (
    user_a_sub: string,
    user_b_sub: string
): Promise<void> => {

    const is_blocked = await is_user_blocked(user_a_sub, user_b_sub);

    if (is_blocked) {
        throw new Error("user_blocked");
    }
};

export const get_message_receiver_sub = async (
    conversation_id: number,
    sender_sub: string
): Promise<string> => {

    const receiver_sub = await get_conversation_other_user_sub(conversation_id, sender_sub);

    if (!receiver_sub) {
        throw new Error("conversation_user_not_found");
    }

    await assert_users_can_message(sender_sub, receiver_sub);

    return receiver_sub;
};

export const insert_message = async (
    sender_sub: string,
    conversation_id: number,
    content: string
): Promise<Message> => {
    const receiver_sub = await get_conversation_other_user_sub(
        conversation_id,
        sender_sub
    );

    if (!receiver_sub) {
        throw new Error("receiver_not_found");
    }

    const is_blocked = await is_user_blocked(sender_sub, receiver_sub);
    if (is_blocked) {
        throw new Error("user_blocked");
    }

    await db.query(
        `UPDATE conversation_participants
            SET status = 'accepted'
            WHERE conversation_id = $1
            AND user_sub = $2
            AND status = 'left'`,
        [conversation_id, receiver_sub]
    );

    const result = await db.query(
        `INSERT INTO messages (conversation_id, sender_sub, content)
        VALUES ($1, $2, $3) 
        RETURNING *`,
        [conversation_id, sender_sub, content]
    );

    return result.rows[0];
};

export const delete_message = async (
    message_id: number,
    user_sub: string
): Promise<void> => {

    // only allow sender to delete their own message
    await db.query(
        `UPDATE messages
         SET status = 'deleted',
             status_created_on = NOW()
         WHERE id = $1
         AND sender_sub = $2
         AND status = 'active'`,
        [message_id, user_sub]
    );
};

export const mark_message_read = async (
    conversation_id: number,
    reader_sub: string
): Promise<void> => {
    
    await db.query(
        `UPDATE messages
        SET is_read = true
        WHERE conversation_id = $1
        AND sender_sub != $2
        AND is_read = false
        AND status = 'active'`,
        [conversation_id, reader_sub]
    );
};