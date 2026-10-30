import { Server, Socket } from "socket.io";
import { create_notification } from "../user/notification";
import {
    delete_direct_conversation,
    get_conversation_other_user_sub
} from "./conversation";
import {
    getDirectMessagesFromPostId,
    getDirectMessagesFromConversationId,
    getDirectMessagesFromReceiverSub
} from "../feed/feedMessages";
import {
    delete_message_for_user,
    get_message_group_image_urls,
    insert_message,
    insert_messages_transactionally,
    mark_message_read
} from "./messages";
import {
    push_alert_user_device
} from "../../services/push";
import {
    get_user_profile_name,
    get_user_profile_image
} from "../user/getProfile";
import { MessageType } from "@/types/messages.types";

export function message_sockets(io: Server) {

    io.on("connection", (socket: Socket) => {

        const user_sub = socket.data.user?.sub;

        if (user_sub) {
            socket.join(user_sub);
        }

        socket.data.appState = "background"; 

        socket.on("app-state", (data, callback) => {
            const state = data?.state;
            if (["active", "inactive", "background"].includes(state)) {
                socket.data.appState = state;
            }
            callback?.({ success: true });
        });

        socket.on("get-messages", async (data, callback) => {
            const {
                post_id,
                conversation_id,
                receiver_sub,
                cursor = null,
                limit = 30,
            } = data ?? {};

            if (
                !user_sub ||
                (!post_id && !conversation_id && !receiver_sub)
            ) {
                return callback?.({
                    error: "request_failed_missing_body",
                });
            }

            const pageLimit = Number(limit);

            if (
                !Number.isInteger(pageLimit) ||
                pageLimit < 1 ||
                pageLimit > 100
            ) {
                return callback?.({
                    error: "invalid_pagination",
                });
            }

            if (
                cursor !== null &&
                (
                    typeof cursor !== "object" ||
                    typeof cursor.sent_at !== "string" ||
                    !Number.isFinite(Date.parse(cursor.sent_at)) ||
                    !/^\d+$/.test(String(cursor.id)) ||
                    !Number.isSafeInteger(Number(cursor.id)) ||
                    Number(cursor.id) <= 0
                )
            ) {
                return callback?.({
                    error: "invalid_cursor",
                });
            }

            try {
                const pagination = {
                    cursor,
                    limit: pageLimit,
                };

                const convo = post_id
                    ? await getDirectMessagesFromPostId(
                        user_sub,
                        Number(post_id),
                        pagination,
                    )
                    : conversation_id
                    ? await getDirectMessagesFromConversationId(
                        user_sub,
                        Number(conversation_id),
                        pagination,
                    )
                    : await getDirectMessagesFromReceiverSub(
                        user_sub,
                        receiver_sub,
                        pagination,
                    );

                callback?.({ convo });
            } catch (err) {
                console.error("[socket:get-messages]_failed", {
                    user_sub,
                    post_id,
                    conversation_id,
                    receiver_sub,
                    cursor,
                    err,
                });

                callback?.({
                    error: "failed_to_get_convo",
                });
            }
        });

        socket.on("delete-message", async (data, callback) => {
            const {
                message_id,
                conversation_id,
            } = data;

            if (
                !user_sub ||
                !message_id ||
                !conversation_id
            ) {
                return callback?.({
                    success: false,
                    error: "request_failed_missing_body",
                });
            }

            try {
                const deleted =
                    await delete_message_for_user(
                        message_id,
                        conversation_id,
                        user_sub
                    );

                if (!deleted) {
                    return callback?.({
                        success: false,
                        error: "message_not_deleted",
                    });
                }

                callback?.({
                    success: true,
                });

                const other_user_sub =
                    await get_conversation_other_user_sub(
                        conversation_id,
                        user_sub
                    );

                io.to(user_sub).emit(
                    "message-deleted",
                    {
                        message_id,
                        conversation_id,
                    }
                );

                if (other_user_sub) {
                    io.to(other_user_sub).emit(
                        "message-deleted",
                        {
                            message_id,
                            conversation_id,
                        }
                    );

                    io.to(other_user_sub).emit(
                        "inbox-updated",
                        {
                            conversation_id,
                        }
                    );
                }

            } catch (err) {
                console.error(
                    "[socket:delete-message]_failed",
                    err
                );

                callback?.({
                    success: false,
                    error: "failed_to_delete_message",
                });
            }
        });

        socket.on("send-message", async (data, callback) => {

            const {
                conversation_id,
                content,
                message_type = "text",
                media_group_id = null,
                file_name = null,
                file_size = null,
                duration_ms = null,
                waveform = null,
                reply_to_id = null,
            } = data;

            if (
                !user_sub ||
                !conversation_id ||
                !content
            ) {
                return callback?.({
                    error: "request_failed_missing_body",
                });
            }

            /*
            * Voice-specific validation (metadata is optional)
            */
            if (message_type === "voice") {

                if (
                    duration_ms !== null &&
                    (typeof duration_ms !== "number" || !Number.isFinite(duration_ms))
                ) {
                    return callback?.({
                        error: "invalid_voice_metadata",
                    });
                }

                if (
                    waveform !== null &&
                    (!Array.isArray(waveform) ||
                        waveform.length > 64 ||
                        waveform.some((v) => typeof v !== "number"))
                ) {
                    return callback?.({
                        error: "invalid_voice_metadata",
                    });
                }
            }

            const validMessageTypes: MessageType[] = [
                "text",
                "gif",
                "image",
                "video",
                "voice",
                "file",
                "link",
            ];

            if (!validMessageTypes.includes(message_type)) {
                return callback?.({
                    error: "invalid_message_type",
                });
            }

            /*
            * File-specific validation
            */
            if (message_type === "file") {

                if (
                    !file_name ||
                    typeof file_name !== "string" ||
                    typeof file_size !== "number"
                ) {
                    return callback?.({
                        error: "invalid_file_metadata",
                    });
                }
            }

            try {

                const message = await insert_message(
                    user_sub,
                    Number(conversation_id),
                    content,
                    message_type,
                    media_group_id,
                    file_name,
                    file_size,
                    duration_ms,
                    waveform,
                    reply_to_id ? Number(reply_to_id) : null
                );

                callback?.({
                    message,
                });

                const receiver_sub =
                    await get_conversation_other_user_sub(
                        Number(conversation_id),
                        user_sub
                    );

                /*
                * Notify sender
                */
                io.to(user_sub).emit(
                    `new_message_${conversation_id}`,
                    { message }
                );

                io.to(user_sub).emit(
                    "inbox-updated",
                    { conversation_id }
                );

                /*
                * Notify receiver
                */
                if (receiver_sub) {

                    io.to(receiver_sub).emit(
                        `new_message_${conversation_id}`,
                        { message }
                    );

                    io.to(receiver_sub).emit(
                        "inbox-updated",
                        { conversation_id }
                    );

                    const notification =
                        await create_notification({
                            receiver_sub,
                            actor_sub: user_sub,
                            action_type: "message",
                            conversation_id,
                        });

                    if (notification) {

                        io.to(receiver_sub).emit(
                            "new-notification"
                        );

                        const sender_name = await get_user_profile_name(user_sub);
                        const profile_image_url = await get_user_profile_image(user_sub);

                        let body: string;

                        switch (message_type) {
                            case "image":
                                body = "Sent you an image";
                                break;
                            case "gif":
                                body = "Sent you a GIF";
                                break;
                            case "video":
                                body = "Sent you a video";
                                break;
                            case "voice":
                                body = "Sent you a voice message";
                                break;
                            case "file":
                                body = "Sent you a file";
                                break;
                            case "link":
                                body = "Sent you a link";
                                break;
                            default:
                                body = content.slice(0, 80);
                                break;
                        }

                        let image_urls: string[] = [];

                        if (message_type === "image") {
                            image_urls = media_group_id
                                ? await get_message_group_image_urls(
                                    Number(conversation_id),
                                    media_group_id,
                                    user_sub,
                                )
                                : [content];
                        }

                        await push_alert_user_device(io, {
                            receiver_sub,
                            title: sender_name,
                            body,
                            message_type,
                            content,
                            count: 1,
                            image_urls,
                            data: {
                                type: "message",
                                sender_id: user_sub,
                                conversation_id: String(conversation_id),
                                message_id: String(message.id),
                                profile_image_url,
                                ...(media_group_id
                                    ? { media_group_id }
                                    : {}),
                            },
                        });

                    }
                }

            } catch (err) {

                console.error(
                    "[socket:send-message]_failed",
                    {
                        user_sub,
                        conversation_id,
                        message_type,
                        media_group_id,
                        file_name,
                        file_size,
                        err,
                    }
                );

                callback?.({
                    error: "failed_to_send_message",
                });
            }
        });

        socket.on("send-messages", async (data, callback) => {
            const { conversation_id, messages } = data ?? {};

            if (
                !user_sub ||
                !Number.isInteger(Number(conversation_id)) ||
                Number(conversation_id) <= 0 ||
                !Array.isArray(messages) ||
                messages.length === 0 ||
                messages.length > 20
            ) {
                return callback?.({
                    error: "request_failed_missing_body",
                });
            }

            const conversationId = Number(conversation_id);

            const validMessageTypes: MessageType[] = [
                "text",
                "gif",
                "image",
                "video",
                "voice",
                "file",
            ];

            try {
                /*
                * Validate every message before inserting any messages.
                */
                for (const item of messages) {
                    if (
                        !item ||
                        typeof item.content !== "string" ||
                        !item.content.trim() ||
                        !validMessageTypes.includes(item.message_type ?? "text")
                    ) {
                        return callback?.({
                            error: "invalid_message",
                        });
                    }

                    if (item.message_type === "voice") {
                        if (
                            item.duration_ms != null &&
                            (
                                typeof item.duration_ms !== "number" ||
                                !Number.isFinite(item.duration_ms)
                            )
                        ) {
                            return callback?.({
                                error: "invalid_voice_metadata",
                            });
                        }

                        if (
                            item.waveform != null &&
                            (
                                !Array.isArray(item.waveform) ||
                                item.waveform.length > 64 ||
                                item.waveform.some(
                                    (value: unknown) =>
                                        typeof value !== "number" ||
                                        !Number.isFinite(value)
                                )
                            )
                        ) {
                            return callback?.({
                                error: "invalid_voice_metadata",
                            });
                        }
                    }

                    if (
                        item.message_type === "file" &&
                        (
                            typeof item.file_name !== "string" ||
                            !item.file_name ||
                            typeof item.file_size !== "number" ||
                            !Number.isFinite(item.file_size) ||
                            item.file_size < 0
                        )
                    ) {
                        return callback?.({
                            error: "invalid_file_metadata",
                        });
                    }

                    if (
                        item.reply_to_id != null &&
                        (
                            !Number.isInteger(Number(item.reply_to_id)) ||
                            Number(item.reply_to_id) <= 0
                        )
                    ) {
                        return callback?.({
                            error: "invalid_reply_to_id",
                        });
                    }
                }

                /*
                * Resolve the recipient BEFORE inserting messages.
                * This also helps ensure the sender belongs to the conversation,
                * provided get_conversation_other_user_sub enforces membership.
                */
                const receiver_sub =
                    await get_conversation_other_user_sub(
                        conversationId,
                        user_sub,
                    );

                if (!receiver_sub) {
                    return callback?.({
                        error: "conversation_not_found",
                    });
                }

                /*
                * Insert every message before dispatching any notification.
                */
                const insertedMessages = await insert_messages_transactionally(
                    user_sub,
                    conversationId,
                    messages.map((item: any) => ({
                        content: item.content,
                        message_type: item.message_type ?? "text",
                        media_group_id: item.media_group_id ?? null,
                        file_name: item.file_name ?? null,
                        file_size: item.file_size ?? null,
                        duration_ms: item.duration_ms ?? null,
                        waveform: item.waveform ?? null,
                        reply_to_id: item.reply_to_id != null
                            ? Number(item.reply_to_id)
                            : null,
                    })),
                );

                /*
                * Acknowledge the batch after all inserts succeed.
                */
                callback?.({
                    messages: insertedMessages,
                });

                /*
                * Notify sender and recipient using your existing event names.
                */
                for (const message of insertedMessages) {
                    io.to(user_sub).emit(
                        `new_message_${conversationId}`,
                        { message },
                    );

                    io.to(receiver_sub).emit(
                        `new_message_${conversationId}`,
                        { message },
                    );
                }

                io.to(user_sub).emit("inbox-updated", {
                    conversation_id: conversationId,
                });

                io.to(receiver_sub).emit("inbox-updated", {
                    conversation_id: conversationId,
                });

                /*
                * Collect the complete image group from the inserted batch.
                * No additional database query is needed.
                */
                const image_urls = insertedMessages
                    .filter(
                        (message) => message.message_type === "image",
                    )
                    .map((message) => message.content)
                    .filter(
                        (url): url is string =>
                            typeof url === "string" &&
                            /^https:\/\/\S+$/i.test(url),
                    );

                /*
                * Create ONE in-app notification for the batch.
                */
                const notification = await create_notification({
                    receiver_sub,
                    actor_sub: user_sub,
                    action_type: "message",
                    conversation_id: conversationId,
                });

                if (notification) {
                    io.to(receiver_sub).emit("new-notification");

                    const sender_name = await get_user_profile_name(user_sub);
                    const profile_image_url = await get_user_profile_image(user_sub);

                    let body: string;

                    if (image_urls.length > 1) {
                        body = `Sent you ${image_urls.length} images`;
                    } else if (image_urls.length === 1) {
                        body = "Sent you an image";
                    } else {
                        const firstMessage = insertedMessages[0];

                        switch (firstMessage.message_type) {
                            case "gif":
                                body = "Sent you a GIF";
                                break;
                            case "video":
                                body = "Sent you a video";
                                break;
                            case "voice":
                                body = "Sent you a voice message";
                                break;
                            case "file":
                                body = "Sent you a file";
                                break;
                            default:
                                body = firstMessage.content.slice(0, 80);
                                break;
                        }
                    }

                    await push_alert_user_device(io, {
                        receiver_sub,
                        title: sender_name,
                        body,
                        message_type: insertedMessages[0].message_type,
                        content: insertedMessages[0].content,
                        count: insertedMessages.filter(m => m.message_type === insertedMessages[0].message_type).length,
                        image_urls,
                        data: {
                            type: "message",
                            sender_id: user_sub,
                            conversation_id: String(conversationId),
                            message_id: String(
                                insertedMessages[0].id,
                            ),
                            profile_image_url,
                            ...(insertedMessages[0].media_group_id
                                ? {
                                    media_group_id:
                                        insertedMessages[0].media_group_id,
                                }
                                : {}),
                        },
                    });
                }
            } catch (err) {
                console.error(
                    "[socket:send-message-batch]_failed",
                    {
                        user_sub,
                        conversation_id,
                        message_count: messages.length,
                        err,
                    },
                );

                callback?.({
                    error: "failed_to_send_message_batch",
                });
            }
        });

        socket.on("read-message", async (data, callback) => {
                    
            const { conversation_id } = data;

            if (!user_sub || !conversation_id) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                await mark_message_read(conversation_id, user_sub);

                callback?.({ success: true });

                const other_user_sub = await get_conversation_other_user_sub(
                    conversation_id,
                    user_sub
                );

                io.to(user_sub).emit("inbox-updated", { conversation_id });

                if (other_user_sub) {
                    io.to(other_user_sub).emit(`messages-read-${conversation_id}`, {
                        conversation_id,
                        reader_sub: user_sub,
                    });

                    io.to(other_user_sub).emit("inbox-updated", { conversation_id });
                }
            } catch {
                callback?.({ error: "failed_to_mark_as_read" });
            }
        });
        
        socket.on("typing-start", async (data) => {
            const { conversation_id } = data;
            if (!user_sub || !conversation_id) return;

            const receiver_sub = await get_conversation_other_user_sub(conversation_id, user_sub);
            if (receiver_sub) {
                io.to(receiver_sub).emit(`typing-start_${conversation_id}`, { user_sub });
            }
        });

        socket.on("typing-stop", async (data) => {
            const { conversation_id } = data;
            if (!user_sub || !conversation_id) return;

            const receiver_sub = await get_conversation_other_user_sub(conversation_id, user_sub);
            if (receiver_sub) {
                io.to(receiver_sub).emit(`typing-stop_${conversation_id}`, { user_sub });
            }
        });

        // convo 
        socket.on("delete-conversation", async (data, callback) => {

            const { conversation_id } = data;

            if (!user_sub || !conversation_id) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                const other_user_sub = await delete_direct_conversation(conversation_id, user_sub);

                callback?.({ success: true });

                io.to(user_sub).emit("conversation-deleted", { conversation_id });

                if (other_user_sub) {
                    io.to(other_user_sub).emit("conversation-deleted", { conversation_id });
                    io.to(other_user_sub).emit("inbox-updated", { conversation_id });
                }

            } catch (err) {
                console.error("[socket:delete-conversation]_failed", {
                    user_sub,
                    conversation_id,
                    err,
                });
                callback?.({ error: "failed_to_delete_conversation" });
            }
        });

    });

}