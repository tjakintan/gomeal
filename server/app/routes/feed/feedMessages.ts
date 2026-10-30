
import { get_messages } from "../messages/messages";
import { get_post_user_sub } from "./actions";
import {
    start_direct_conversation,
    get_direct_conversation,
    get_conversation_other_user_sub,
} from "@/routes/messages/conversation";
import {
    DirectConversationData,
    MessageCursor,
    MessagePagination,
} from "@/types/messages.types";

const DEFAULT_PAGINATION: MessagePagination = {
    cursor: null,
    limit: 30,
};

export const getDirectMessagesFromPostId = async (
    sender_sub: string,
    post_id: number,
    pagination: MessagePagination = DEFAULT_PAGINATION,
): Promise<DirectConversationData | void> => {
    try {
        const receiver_sub = await get_post_user_sub(post_id);

        if (!receiver_sub) {
            throw new Error("post_not_found_or_not_active");
        }

        if (sender_sub === receiver_sub) {
            return;
        }

        let result = await get_direct_conversation(
            sender_sub,
            receiver_sub,
        );

        let isNew = false;

        if (!result) {
            result = await start_direct_conversation(
                sender_sub,
                receiver_sub,
            );
            isNew = true;
        }

        const { conversation, other_user } = result;

        const messagePage = await get_messages(
            conversation.id,
            sender_sub,
            pagination,
        );

        return {
            conversation,
            other_user,
            receiver_sub,
            sender_sub,
            isNew,
            messages: messagePage.messages,
            hasMore: messagePage.hasMore,
            nextCursor: messagePage.nextCursor,
        };
    } catch (err) {
        console.error("[getDirectMessagesFromPostId]_failed", {
            sender_sub,
            post_id,
            err,
        });
        throw err;
    }
};

export const getDirectMessagesFromConversationId = async (
    sender_sub: string,
    conversation_id: number,
    pagination: MessagePagination = DEFAULT_PAGINATION,
): Promise<DirectConversationData | void> => {
    try {
        const receiver_sub = await get_conversation_other_user_sub(
            conversation_id,
            sender_sub,
        );

        if (!receiver_sub) {
            throw new Error("conversation_not_found");
        }

        const result = await get_direct_conversation(
            sender_sub,
            receiver_sub,
        );

        if (!result || Number(result.conversation.id) !== Number(conversation_id)) {
            throw new Error("conversation_not_found");
        }

        const { conversation, other_user } = result;

        const messagePage = await get_messages(
            conversation.id,
            sender_sub,
            pagination,
        );

        return {
            conversation,
            other_user,
            receiver_sub,
            sender_sub,
            isNew: false,
            messages: messagePage.messages,
            hasMore: messagePage.hasMore,
            nextCursor: messagePage.nextCursor,
        };
    } catch (err) {
        console.error("[getDirectMessagesFromConversationId]_failed", {
            sender_sub,
            conversation_id,
            err,
        });
        throw err;
    }
};

export const getDirectMessagesFromReceiverSub = async (
    sender_sub: string,
    receiver_sub: string,
    pagination: MessagePagination = DEFAULT_PAGINATION,
): Promise<DirectConversationData | void> => {
    try {
        if (!receiver_sub) {
            throw new Error("receiver_not_found");
        }

        if (sender_sub === receiver_sub) {
            return;
        }

        let result = await get_direct_conversation(
            sender_sub,
            receiver_sub,
        );

        let isNew = false;

        if (!result) {
            result = await start_direct_conversation(
                sender_sub,
                receiver_sub,
            );
            isNew = true;
        }

        const { conversation, other_user } = result;

        const messagePage = await get_messages(
            conversation.id,
            sender_sub,
            pagination,
        );

        return {
            conversation,
            other_user,
            receiver_sub,
            sender_sub,
            isNew,
            messages: messagePage.messages,
            hasMore: messagePage.hasMore,
            nextCursor: messagePage.nextCursor,
        };
    } catch (err) {
        console.error("[getDirectMessagesFromReceiverSub]_failed", {
            sender_sub,
            receiver_sub,
            err,
        });
        throw err;
    }
};
