import db from "@/services/db";
import { get_messages } from "../messages/messages";
import { get_post_user_sub } from "./actions";
import { start_direct_conversation, get_direct_conversation } from "@/routes/messages/conversation";
import { DirectConversationData } from "@/types/messages.types";

export const getDirectMessagesFromPostId = async (
    sender_sub: string,
    post_id: number
):  Promise<DirectConversationData | void>=> {

    try {

        const receiver_sub = await get_post_user_sub(post_id);

        if (!receiver_sub) throw new Error("post_not_found_or_not_active");

        if (sender_sub === receiver_sub) return

        let result = await get_direct_conversation(sender_sub, receiver_sub);
        let isNew = false;

        if (!result) {
            result = await start_direct_conversation(sender_sub, receiver_sub);
            isNew = true;
        }

        const { conversation, other_user } = result;

        const messages = await get_messages(conversation.id, sender_sub)

        return {
            conversation,
            other_user,
            receiver_sub,
            sender_sub,
            isNew,
            messages
        };

    } catch (err) {
        console.error('[getDirectMessagesFromPostId]_failed', { sender_sub, post_id, err });
        throw err;
    }   

};

export const getDirectMessagesFromConversationId = async (
    sender_sub: string,
    conversation_id: string
): Promise<DirectConversationData | void> => {

    try {

        const { rows } = await db.query(
            `SELECT user_sub FROM conversation_participants 
             WHERE conversation_id = $1 AND user_sub != $2`,
            [conversation_id, sender_sub]
        );

        const receiver_sub = rows[0]?.user_sub;

        const result = await get_direct_conversation(sender_sub, receiver_sub);

        if (!result) throw new Error("conversation_not_found");

        const { conversation, other_user } = result;

        const messages = await get_messages(conversation.id, sender_sub);

        return { conversation, other_user, receiver_sub, sender_sub, isNew: false, messages };
    } catch (err) {
        console.error('[getDirectMessagesFromConversationId]_failed', { sender_sub, conversation_id, err });
        throw err;
    }
};

export const getDirectMessagesFromReceiverSub = async (
    sender_sub: string,
    receiver_sub: string
): Promise<DirectConversationData | void> => {

    try {
        if (!receiver_sub) throw new Error("receiver_not_found");
        if (sender_sub === receiver_sub) return;

        let result = await get_direct_conversation(sender_sub, receiver_sub);
        let isNew = false;

        if (!result) {
            result = await start_direct_conversation(sender_sub, receiver_sub);
            isNew = true;
        }

        const { conversation, other_user } = result;

        const messages = await get_messages(conversation.id, sender_sub);

        return {
            conversation,
            other_user,
            receiver_sub,
            sender_sub,
            isNew,
            messages
        };

    } catch (err) {
        console.error("[getDirectMessagesFromReceiverSub]_failed", { sender_sub, receiver_sub, err });
        throw err;
    }
};