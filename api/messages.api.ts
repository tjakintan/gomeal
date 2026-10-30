import { socketEmit } from "./socket";

import {
    Message,
    MessageType,
    DirectConversationData,
    InboxConversation,
    MessageCursor,
} from "@/types/messages.types";


export async function getInboxApi(): Promise<InboxConversation[]> {

    try {

        const res =
            await socketEmit<{
                inbox: InboxConversation[];
            }>(
                "get-inbox",
                {}
            );

        return res?.inbox ?? [];

    } catch (err) {

        console.error(
            "Get inbox error:",
            err
        );

        return [];
    }
}


export const getDirectConvo = async (
    post_id?: number,
    conversation_id?: number,
    receiver_sub?: string,
    cursor: MessageCursor | null = null,
    limit = 30,
): Promise<DirectConversationData | null> => {
    if (!post_id && !conversation_id && !receiver_sub) {
        return null;
    }

    const payload = {
        ...(post_id ? { post_id } : {}),
        ...(conversation_id ? { conversation_id } : {}),
        ...(receiver_sub ? { receiver_sub } : {}),
        cursor,
        limit,
    };

    const res = await socketEmit<{
        convo?: DirectConversationData;
        error?: string;
    }>("get-messages", payload);

    if (res?.error) {
        throw new Error(res.error);
    }

    return res?.convo ?? null;
};

export const sendMessageApi = async (
    conversation_id: number,
    content: string,
    message_type: MessageType = "text",
    media_group_id?: string | null,
    file_name?: string | null,
    file_size?: number | null,
    duration_ms?: number | null,
    waveform?: number[] | null,
    reply_to_id?: number | null
): Promise<Message | null> => {

    if (!conversation_id || !content) {
        return null;
    }

    const res = await socketEmit<{
        message: Message;
    }>("send-message", {
        conversation_id,
        content,
        message_type,
        media_group_id: media_group_id ?? null,
        file_name: file_name ?? null,
        file_size: file_size ?? null,
        duration_ms: duration_ms ?? null,
        waveform: waveform ?? null,
        reply_to_id: reply_to_id ?? null,
    });

    return res?.message ?? null;
};

export const sendMessagesBatchApi = async (
    conversation_id: number,
    messages: {
        content: string;
        message_type: MessageType;
        media_group_id?: string | null;
        file_name?: string | null;
        file_size?: number | null;
        duration_ms?: number | null;
        waveform?: number[] | null;
        reply_to_id?: number | null;
    }[]
): Promise<Message[]> => {
    if (
        !conversation_id ||
        !Array.isArray(messages) ||
        messages.length === 0
    ) {
        return [];
    }

    const res = await socketEmit<{
        messages?: Message[];
        error?: string;
    }>(
        "send-messages",
        {
            conversation_id,
            messages: messages.map((item) => ({
                content: item.content,
                message_type: item.message_type,
                media_group_id: item.media_group_id ?? null,
                file_name: item.file_name ?? null,
                file_size: item.file_size ?? null,
                duration_ms: item.duration_ms ?? null,
                waveform: item.waveform ?? null,
                reply_to_id: item.reply_to_id ?? null,
            })),
        }
    );

    if (res?.error) {
        throw new Error(res.error);
    }

    return res?.messages ?? [];
};

export const markMessagesReadApi = async (
    conversation_id: number
): Promise<boolean> => {

    if (!conversation_id) {
        return false;
    }

    const res =
        await socketEmit<{
            success: boolean;
        }>(
            "read-message",
            {
                conversation_id,
            }
        );

    return res?.success ?? false;
};


export const emitTypingStart = (
    conversation_id: number
): void => {

    socketEmit(
        "typing-start",
        {
            conversation_id,
        }
    );
};


export const emitTypingStop = (
    conversation_id: number
): void => {

    socketEmit(
        "typing-stop",
        {
            conversation_id,
        }
    );
};


export const deleteConversationApi = async (
    conversation_id: number
): Promise<boolean> => {

    if (!conversation_id) {
        return false;
    }

    const res =
        await socketEmit<{
            success: boolean;
        }>(
            "delete-conversation",
            {
                conversation_id,
            }
        );

    return res?.success ?? false;
};


export const deleteMessageApi = async (
    message_id: number,
    conversation_id: number
): Promise<boolean> => {

    if (
        !message_id ||
        !conversation_id
    ) {
        return false;
    }

    const res =
        await socketEmit<{
            success: boolean;
        }>(
            "delete-message",
            {
                message_id,
                conversation_id,
            }
        );

    return res?.success ?? false;
};
