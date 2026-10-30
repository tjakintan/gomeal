import db from "@/services/db";
import { PoolClient } from "pg";

import { is_user_blocked } from "../user/block";
import { get_conversation_other_user_sub } from "./conversation";

import {
    Message,
    MessageCursor,
    MessageInput,
    MessagePage,
    MessagePagination,
    MessageType,
} from "@/types/messages.types";

import { sanitize_voice_meta } from "@/utils/audio";


export const get_messages = async (
    conversation_id: number,
    current_user_sub: string,
    pagination: MessagePagination = {
        cursor: null,
        limit: 30,
    }
): Promise<MessagePage> => {
    const { cursor, limit } = pagination;

    const other_user_sub =
        await get_conversation_other_user_sub(
            conversation_id,
            current_user_sub,
        );

    if (!other_user_sub) {
        throw new Error("conversation_user_not_found");
    }

    if (await is_user_blocked(current_user_sub, other_user_sub)) {
        throw new Error("user_blocked");
    }

    await db.query(
        `UPDATE conversation_participants
         SET status = 'accepted'
         WHERE conversation_id = $1
           AND user_sub = $2
           AND status = 'left'`,
        [conversation_id, current_user_sub],
    );

    // Enforce a reasonable server-side page size.
    const pageSize = Math.min(
        Math.max(Math.floor(limit) || 40, 1),
        100,
    );

    const result = await db.query(
        `SELECT
            m.id,
            m.conversation_id,
            m.sender_sub,
            m.content,
            m.message_type,
            m.media_group_id,
            m.file_name,
            m.file_size,
            m.duration_ms,
            m.waveform,
            m.sent_at,
            m.is_read,
            m.status,
            m.status_created_on,
            m.reply_to_id,

            r.id AS reply_id,
            r.sender_sub AS reply_sender_sub,
            r.content AS reply_content,
            r.message_type AS reply_message_type,
            r.status AS reply_status

         FROM messages m

         LEFT JOIN messages r
            ON r.id = m.reply_to_id

         WHERE m.conversation_id = $1
           AND m.status = 'active'

           AND NOT EXISTS (
               SELECT 1
               FROM message_deletions md
               WHERE md.message_id = m.id
                 AND md.user_sub = $2
           )

           AND (
               $3::timestamptz IS NULL
               OR (m.sent_at, m.id) <
                  ($3::timestamptz, $4::bigint)
           )

         ORDER BY m.sent_at DESC, m.id DESC
         LIMIT $5`,
        [
            conversation_id,
            current_user_sub,
            cursor?.sent_at ?? null,
            cursor?.id ?? null,
            pageSize + 1,
        ],
    );

    // The extra row tells us whether an older page exists.
    const hasMore = result.rows.length > pageSize;
    const pageRows = result.rows.slice(0, pageSize);

    // Query newest-to-oldest; render oldest-to-newest.
    pageRows.reverse();

    const messages: Message[] = pageRows.map((row: any) => ({
        id: row.id,
        conversation_id: row.conversation_id,
        sender_sub: row.sender_sub,
        content: row.content,
        message_type: row.message_type,
        media_group_id: row.media_group_id,
        file_name: row.file_name,
        file_size: row.file_size,
        duration_ms: row.duration_ms,
        waveform: row.waveform,
        sent_at: row.sent_at,
        is_read: row.is_read,
        status: row.status,
        status_created_on: row.status_created_on,
        reply_to_id: row.reply_to_id,

        reply_to: row.reply_id
            ? {
                id: row.reply_id,
                sender_sub: row.reply_sender_sub,
                content:
                    row.reply_status === "active"
                        ? row.reply_content
                        : null,
                message_type: row.reply_message_type,
                status: row.reply_status,
            }
            : null,
    }));

    const oldest = messages[0];

    return {
        messages,
        hasMore,
        nextCursor:
            hasMore && oldest
                ? {
                    sent_at: new Date(oldest.sent_at).toISOString(),
                    id: oldest.id,
                }
                : null,
    };
};


export const assert_users_can_message = async (
    user_a_sub: string,
    user_b_sub: string
): Promise<void> => {

    const is_blocked =
        await is_user_blocked(
            user_a_sub,
            user_b_sub
        );

    if (is_blocked) {
        throw new Error("user_blocked");
    }
};


export const get_message_receiver_sub = async (
    conversation_id: number,
    sender_sub: string
): Promise<string> => {

    const receiver_sub =
        await get_conversation_other_user_sub(
            conversation_id,
            sender_sub
        );

    if (!receiver_sub) {
        throw new Error(
            "conversation_user_not_found"
        );
    }

    await assert_users_can_message(
        sender_sub,
        receiver_sub
    );

    return receiver_sub;
};


export const insert_message = async (
    sender_sub: string,
    conversation_id: number,
    content: string,
    message_type: MessageType = "text",
    media_group_id?: string | null,
    file_name?: string | null,
    file_size?: number | null,
    duration_ms?: number | null,
    waveform?: number[] | null,
    reply_to_id?: number | null,
    client?: PoolClient,
): Promise<Message> => {

    const receiver_sub =
        await get_conversation_other_user_sub(
            conversation_id,
            sender_sub
        );

    if (!receiver_sub) {
        throw new Error(
            "receiver_not_found"
        );
    }

    const is_blocked =
        await is_user_blocked(
            sender_sub,
            receiver_sub
        );

    if (is_blocked) {
        throw new Error("user_blocked");
    }

    const runner = client ?? db;

    await runner.query(
        `UPDATE conversation_participants
            SET status = 'accepted'
            WHERE conversation_id = $1
            AND user_sub = $2
            AND status = 'left'`,
        [
            conversation_id,
            receiver_sub,
        ]
    );

    if (reply_to_id) {
        const check = await runner.query(
            `SELECT 1 FROM messages
             WHERE id = $1 AND conversation_id = $2`,
            [reply_to_id, conversation_id]
        );

        if (check.rowCount === 0) {
            throw new Error("invalid_reply_target");
        }
    }


    const voice = sanitize_voice_meta(
        message_type,
        duration_ms,
        waveform
    );


    const result = await runner.query(
        `INSERT INTO messages (
            conversation_id, sender_sub, content, message_type,
            media_group_id, file_name, file_size, duration_ms, waveform,
            reply_to_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
            conversation_id, sender_sub, content, message_type,
            media_group_id ?? null, file_name ?? null, file_size ?? null,
            voice.duration_ms, voice.waveform,
            reply_to_id ?? null,
        ]
    );


    return result.rows[0];
};


export const insert_messages_transactionally = async (
    sender_sub: string,
    conversation_id: number,
    messages: MessageInput[],
): Promise<Message[]> => {
    if (messages.length === 0) {
        return [];
    }

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const insertedMessages: Message[] = [];

        /* Same connection for each client */
        for (const item of messages) {
            const message = await insert_message(
                sender_sub,
                conversation_id,
                item.content,
                item.message_type ?? "text",
                item.media_group_id ?? null,
                item.file_name ?? null,
                item.file_size ?? null,
                item.duration_ms ?? null,
                item.waveform ?? null,
                item.reply_to_id ?? null,
                client, 
            );

            insertedMessages.push(message);
        }

        await client.query("COMMIT");

        return insertedMessages;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "[messages:batch-rollback]_failed",
                rollbackError,
            );
        }

        throw error;
    } finally {
        client.release();
    }
};


export const delete_message_for_user = async (
    message_id: number,
    conversation_id: number,
    user_sub: string
): Promise<boolean> => {

    const result = await db.query(
        `INSERT INTO message_deletions (
            message_id,
            user_sub
        )
        SELECT
            m.id,
            $3
        FROM messages m
        WHERE m.id = $1
        AND m.conversation_id = $2
        AND m.status = 'active'
        ON CONFLICT (
            message_id,
            user_sub
        )
        DO NOTHING
        RETURNING message_id`,
        [
            message_id,
            conversation_id,
            user_sub,
        ]
    );

    return result.rowCount === 1;
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
        [
            conversation_id,
            reader_sub,
        ]
    );
};


export const get_message_group_image_urls = async (
    conversation_id: number,
    media_group_id: string,
    sender_sub: string,
): Promise<string[]> => {
    const result = await db.query(
        `
        SELECT content
        FROM messages
        WHERE conversation_id = $1
          AND media_group_id = $2
          AND sender_sub = $3
          AND message_type = 'image'
          AND status = 'active'
        ORDER BY sent_at ASC, id ASC
        `,
        [conversation_id, media_group_id, sender_sub],
    );

    return result.rows
        .map((row: { content: string }) => row.content)
        .filter(
            (url: string) =>
                typeof url === "string" &&
                /^https:\/\/\S+$/i.test(url),
        );
};