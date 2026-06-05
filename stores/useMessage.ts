import {
    getDirectConvo,
    sendMessageApi,
    markMessagesReadApi,
    getInboxApi,
} from "@/api/messages.api";

import {
    Message,
    DirectConversationData,
    InboxConversation,
} from "@/types/messages.types";
import { CONVERSATION_CACHE_TTL_MS } from "@/types/messages.types";
import { create } from "zustand";

type ConversationCacheEntry = {
    data: DirectConversationData;
    createdAt: number;
};


const getConversationKey = (
    post_id?: number,
    conversation_id?: number,
    receiver_sub?: string
) => {
    if (conversation_id != null) return `conversation:${conversation_id}`;
    if (post_id != null) return `post:${post_id}`;
    if (receiver_sub) return `receiver:${receiver_sub}`;
    return "unknown";
};

type MessageState = {
    inbox: InboxConversation[];
    conversations: DirectConversationData | null;

    conversationCache: Record<string, ConversationCacheEntry>;
    conversationRequests: Record<string, Promise<DirectConversationData | null>>;
    activeConversationKey: string | null;

    loadingInbox: boolean;
    loadingConversation: boolean;
    sendingMessage: boolean;

    sendMessage: (conversation_id: number, content: string) => Promise<Message | null>;
    markAsRead: (conversation_id: number) => Promise<void>;

    addMessageLocally: (message: Message) => void;
    markConversationMessagesReadLocally: (
        conversation_id: number,
        reader_sub: string
    ) => void;

    pendingConversation: InboxConversation | null;
    loadInbox: () => Promise<InboxConversation[]>;
    inboxOpen: boolean;
    openInbox: () => void;
    closeInbox: () => void;

    loadConversation: (post_id?: number, conversation_id?: number, receiver_sub?: string) => Promise<DirectConversationData | null>;

    typingUsers: Record<number, boolean>;
    setTyping: (conversation_id: number, isTyping: boolean) => void;

    setConversation: (convo: DirectConversationData | null) => void;
    clearConversation: () => void;
    removeMessage: (message_id: string | number) => void;
};

export const useMessage = create<MessageState>((set, get) => ({

    inbox: [],
    conversations: null,

    conversationCache: {},
    conversationRequests: {},
    activeConversationKey: null,

    inboxOpen: false,
    loadingInbox: false,
    pendingConversation: null,

    typingUsers: {},

    openInbox: () => set({ inboxOpen: true }),
    closeInbox: () => set({ inboxOpen: false }),

    loadingConversation: false,
    sendingMessage: false,

    loadInbox: async (): Promise<InboxConversation[]> => {
        set({ loadingInbox: true });

        try {
            const inbox = await getInboxApi();
            set({ inbox });
            return inbox;
        } catch (err) {
            console.error("Error loading inbox:", err);
            return [];
        } finally {
            set({ loadingInbox: false });
        }
    },

    sendMessage: async (conversation_id: number, content: string): Promise<Message | null> => {

        set({ sendingMessage: true });

        try {
            const message = await sendMessageApi(conversation_id, content);

            if (!message) return null;

            set((state) => {
                if (!state.conversations) return state;

                const nextConversation = {
                    ...state.conversations,
                    messages: [...state.conversations.messages, message],
                };

                return {
                    conversations: nextConversation,
                    conversationCache: state.activeConversationKey
                        ? {
                            ...state.conversationCache,
                            [state.activeConversationKey]: {
                                data: nextConversation,
                                createdAt: Date.now(),
                            },
                        }
                        : state.conversationCache,
                };
            });

            get().loadInbox();

            return message;
        } catch (err) {
            console.error("Error sending message:", err);
            return null;
        } finally {
            set({ sendingMessage: false });
        }
    },

    loadConversation: async (
        post_id?: number,
        conversation_id?: number,
        receiver_sub?: string
    ): Promise<DirectConversationData | null> => {
        const conversationKey = getConversationKey(post_id, conversation_id, receiver_sub);
        const cached = get().conversationCache[conversationKey];

        set({
            activeConversationKey: conversationKey,
            loadingConversation: true,
        });

        if (
            cached &&
            Date.now() - cached.createdAt < CONVERSATION_CACHE_TTL_MS
        ) {
            set({
                conversations: cached.data,
                loadingConversation: false,
            });

            return cached.data;
        }

        const existingRequest = get().conversationRequests[conversationKey];

        if (existingRequest) {
            return existingRequest;
        }

        const request = getDirectConvo(post_id, conversation_id, receiver_sub);

        set({
            conversationRequests: {
                ...get().conversationRequests,
                [conversationKey]: request,
            },
        });

        try {
            const data = await request;

            if (get().activeConversationKey !== conversationKey) {
                return data;
            }

            set({
                conversations: data,
                conversationCache: data
                    ? {
                        ...get().conversationCache,
                        [conversationKey]: {
                            data,
                            createdAt: Date.now(),
                        },
                    }
                    : get().conversationCache,
            });

            return data;
        } catch (err) {
            console.error("Error loading conversation:", err);
            return null;
        } finally {
            const { [conversationKey]: _, ...remainingRequests } =
                get().conversationRequests;

            if (get().activeConversationKey === conversationKey) {
                set({
                    loadingConversation: false,
                    conversationRequests: remainingRequests,
                });
            } else {
                set({
                    conversationRequests: remainingRequests,
                });
            }
        }
    },

    addMessageLocally: (message) => {
        set((state) => {
            if (!state.conversations) return state;

            if (state.conversations.conversation.id !== message.conversation_id) {
                return state;
            }

            const alreadyExists = state.conversations.messages.some(
                (item) => String(item.id) === String(message.id)
            );

            if (alreadyExists) return state;

            return {
                conversations: {
                    ...state.conversations,
                    messages: [...state.conversations.messages, message],
                },
            };
        });
    },

    markAsRead: async (conversation_id: number): Promise<void> => {

        try {
            await markMessagesReadApi(conversation_id);

            set((state) => ({
                inbox: state.inbox.map((item) =>
                    item.conversation.id === conversation_id
                        ? { ...item, unread_count: 0 }
                        : item
                ),
                conversations:
                    state.conversations?.conversation.id === conversation_id
                        ? {
                            ...state.conversations,
                            messages: state.conversations.messages.map((message) => ({
                                ...message,
                                is_read: true,
                            })),
                        }
                        : state.conversations,
            }));
        } catch (err) {
            console.error("Error marking messages as read:", err);
        }
    },

    markConversationMessagesReadLocally: (conversation_id, reader_sub) => {
        set((state) => ({
            conversations:
                state.conversations?.conversation.id === conversation_id
                    ? {
                        ...state.conversations,
                        messages: state.conversations.messages.map((message) =>
                            message.sender_sub !== reader_sub
                                ? { ...message, is_read: true }
                                : message
                        ),
                    }
                    : state.conversations,
        }));
    },

    setTyping: (conversation_id, isTyping) =>
        set((state) => ({
            typingUsers: {
                ...state.typingUsers,
                [conversation_id]: isTyping,
            },
        })),

    removeMessage: (message_id) => {
        set((state) => ({
            conversations: state.conversations
                ? {
                    ...state.conversations,
                    messages: state.conversations.messages.filter(
                        (message) => String(message.id) !== String(message_id)
                    ),
                }
                : null,
        }));
    },

    setConversation: (convo) => set({ conversations: convo }),

    clearConversation: () =>
        set({
            conversations: null,
            activeConversationKey: null,
            loadingConversation: false,
        }),

}));
