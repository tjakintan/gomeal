import { Server, Socket } from "socket.io";
import { create_notification } from "../user/notification";
import { delete_direct_conversation, get_conversation_other_user_sub } from "./conversation";
import { getDirectMessagesFromPostId, getDirectMessagesFromConversationId, getDirectMessagesFromReceiverSub} from "../feed/feedMessages";
import { delete_message, insert_message, mark_message_read } from "./messages";
import { send_push_notification_to_user_devices } from "../../services/push";
import { get_user_profile_name } from "../user/getProfile";

export function message_sockets(io: Server) {

    io.on("connection", (socket: Socket) => {

        const user_sub = socket.data.user?.sub;

        if (user_sub) {
            socket.join(user_sub);
        }

        socket.on("get-messages", async (data, callback) => {

            const { post_id, conversation_id, receiver_sub } = data;

            if (!user_sub || (!post_id && !conversation_id && !receiver_sub)) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                const convo = post_id
                    ? await getDirectMessagesFromPostId(user_sub, Number(post_id))
                    : conversation_id
                    ? await getDirectMessagesFromConversationId(user_sub, conversation_id)
                    : await getDirectMessagesFromReceiverSub(user_sub, receiver_sub);
                callback?.({ convo });

            } catch (err) {
                
                console.error("[socket:get-messages]_failed", {
                    user_sub,
                    post_id,
                    conversation_id,
                    receiver_sub,
                    err,
                });
                callback?.({ error: "failed_to_get_convo" });
            }
        });

        socket.on("delete-message", async (data, callback) => {
            const { message_id, conversation_id } = data;

            if (!user_sub || !message_id || !conversation_id) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                await delete_message(message_id, user_sub);

                callback?.({ success: true });

                const other_user_sub = await get_conversation_other_user_sub(
                    conversation_id,
                    user_sub
                );

                io.to(user_sub).emit("message-deleted", {
                    message_id,
                    conversation_id,
                });

                if (other_user_sub) {
                    io.to(other_user_sub).emit("message-deleted", {
                        message_id,
                        conversation_id,
                    });

                    io.to(other_user_sub).emit("inbox-updated", { conversation_id });
                }

            } catch (err) {
                console.error("[socket:delete-message]_failed", err);
                callback?.({ error: "failed_to_delete_message" });
            }
        });

        socket.on("send-message", async (data, callback) => {
                    
            const { conversation_id, content } = data;
            
            if (!user_sub || !conversation_id || !content) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                const message = await insert_message(user_sub, conversation_id, content);
                callback?.({ message });

                const receiver_sub = await get_conversation_other_user_sub(conversation_id, user_sub);

                socket.broadcast.emit(`new_message_${conversation_id}`, { message });

                io.to(user_sub).emit("inbox-updated", { conversation_id });
                
                if (receiver_sub) {
                    io.to(receiver_sub).emit(`new_message_${conversation_id}`, { message });
                    io.to(receiver_sub).emit("inbox-updated", { conversation_id });

                    const notification = await create_notification({
                        receiver_sub,
                        actor_sub: user_sub,
                        action_type: "message",
                        conversation_id,
                    });

                    if (notification) {
                        io.to(receiver_sub).emit("new-notification");
                        
                        const sender_name = await get_user_profile_name(user_sub);
                        await send_push_notification_to_user_devices({
                            receiver_sub,
                            title: sender_name,
                            body: content.slice(0, 80),
                            data: {
                                type: "message",
                                conversation_id: String(conversation_id)
                            },
                        });
                    }
                }

            } catch {
                callback?.({ error: "failed_to_send_message" });
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