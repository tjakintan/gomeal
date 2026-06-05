import { useEffect } from "react";
import { getSocket } from "./socket";
import { useMessage } from "@/stores/useMessage";

export const useInboxListener = () => {

    useEffect(() => {

        let mounted = true;

        const setup = async () => {
            const sock = await getSocket();
            if (!mounted) return;

            useMessage.getState().loadInbox();

            const handleInboxUpdated = () => {
                useMessage.getState().loadInbox();
            };

            sock.on("inbox-updated", handleInboxUpdated);

            return () => {
                sock.off("inbox-updated", handleInboxUpdated);
            };
        };

        const cleanup = setup();

        return () => {
            mounted = false;
            cleanup.then((fn) => fn?.());
        };
    }, []);
};

export const useNewMessageListener = (conversation_id?: number | null) => {

    useEffect(() => {
        if (!conversation_id) return;

        let mounted = true;

        const setup = async () => {
            const sock = await getSocket();
            if (!mounted) return;

            const event = `new_message_${conversation_id}`;

            const handleNewMessage = ({ message }: { message: any }) => {
                useMessage.getState().addMessageLocally(message);
                useMessage.getState().loadInbox();

                if (message?.conversation_id) {
                    useMessage.getState().markAsRead(message.conversation_id);
                }
            };

            sock.on(event, handleNewMessage);

            return () => {
                sock.off(event, handleNewMessage);
            };
        };

        const cleanup = setup();

        return () => {
            mounted = false;
            cleanup.then((fn) => fn?.());
        };
    }, [conversation_id]);
};

export const useMessageReadListener = (conversation_id?: number | null) => {

    useEffect(() => {
        if (!conversation_id) return;

        let mounted = true;

        const setup = async () => {
            const sock = await getSocket();
            if (!mounted) return;

            const event = `messages-read-${conversation_id}`;

            const handleRead = ({ reader_sub }: { reader_sub: string }) => {
                useMessage.getState().markConversationMessagesReadLocally(
                    conversation_id,
                    reader_sub
                );
                useMessage.getState().loadInbox();
            };

            sock.on(event, handleRead);

            return () => {
                sock.off(event, handleRead);
            };
        };

        const cleanup = setup();

        return () => {
            mounted = false;
            cleanup.then((fn) => fn?.());
        };
    }, [conversation_id]);
};

export const useTypingListener = (conversation_id?: number | null) => {
    useEffect(() => {
        if (!conversation_id) return;
        let mounted = true;

        const setup = async () => {
            const sock = await getSocket();
            if (!mounted) return;

            const handleTypingStart = () => {
                useMessage.getState().setTyping(conversation_id, true);
            };

            const handleTypingStop = () => {
                useMessage.getState().setTyping(conversation_id, false);
            };

            sock.on(`typing-start_${conversation_id}`, handleTypingStart);
            sock.on(`typing-stop_${conversation_id}`, handleTypingStop);

            return () => {
                sock.off(`typing-start_${conversation_id}`, handleTypingStart);
                sock.off(`typing-stop_${conversation_id}`, handleTypingStop);
            };
        };

        const cleanup = setup();
        return () => {
            mounted = false;
            cleanup.then((fn) => fn?.());
        };
    }, [conversation_id]);
};
