import { socketEmit } from "./socket";
import { Message, DirectConversationData, InboxConversation } from "@/types/messages.types";

export async function getInboxApi(): Promise<InboxConversation[]> {
    try {
        const res = await socketEmit<{ inbox: InboxConversation[] }>(
            "get-inbox",
            {}
        );

        return res?.inbox ?? [];
    } catch (err) {
        console.error("Get inbox error:", err);
        return [];
    }
};

export const getDirectConvo = async (
    post_id?: number,
    conversation_id?: number,
    receiver_sub?: string
): Promise<DirectConversationData | null> => {

    if (!post_id && !conversation_id && !receiver_sub) return null;

    const payload = post_id
        ? { post_id }
        : conversation_id
        ? { conversation_id }
        : { receiver_sub };

    const res = await socketEmit<{ convo: DirectConversationData }>(
        "get-messages",
        payload
    );

    return res?.convo ?? null;
};

export const sendMessageApi = async (conversation_id: number, content: string): Promise<Message | null> => {
    if (!conversation_id || !content) return null;
    const res = await socketEmit<{ message: Message }>("send-message", { conversation_id, content });
    return res?.message ?? null;
};

export const markMessagesReadApi = async (conversation_id: number): Promise<boolean> => {
    if (!conversation_id) return false;
    const res = await socketEmit<{ success: boolean }>("read-message", { conversation_id });
    return res?.success ?? false;
};

export const emitTypingStart = (conversation_id: number): void => {
    socketEmit("typing-start", { conversation_id });
};

export const emitTypingStop = (conversation_id: number): void => {
    socketEmit("typing-stop", { conversation_id });
};