import {
    getDirectConvo,
    sendMessageApi,
    sendMessagesBatchApi,
    markMessagesReadApi,
    getInboxApi,
    deleteConversationApi,
    deleteMessageApi
} from "@/api/messages.api";

import {
    Message,
    MessageType,
    DirectConversationData,
    InboxConversation,
    CONVERSATION_CACHE_TTL_MS,
} from "@/types/messages.types";

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


export const MAX_CHAIN_DEPTH = 10;


export const buildReplyChain = (
    messages: Message[],
    message: Message
): Message[] => {

    const byId = new Map(
        messages.map((m) => [m.id, m])
    );

    const chain: Message[] = [];
    let current = message;
    let depth = 0;

    while (
        current.reply_to_id &&
        depth < MAX_CHAIN_DEPTH
    ) {
        const ancestor = byId.get(current.reply_to_id);

        if (!ancestor) {
            // Not loaded locally — chain resolution stops here.
            break;
        }

        chain.unshift(ancestor);
        current = ancestor;
        depth++;
    }

    return chain;
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

    loadingOlderMessages: boolean;

    loadOlderMessages: () => Promise<void>;

    sendMessage: (
        conversation_id: number,
        content: string,
        message_type?: MessageType,
        media_group_id?: string | null,
        file_name?: string | null,
        file_size?: number | null,
        duration_ms?: number | null,
        waveform?: number[] | null,
        reply_to_id?: number | null 
    ) => Promise<Message | null>;

    sendMessages: (
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
    ) => Promise<Message[]>;

    viewingConversationId: number | null;
    setViewingConversation: (id: number | null) => void;

    replyingTo: Message | null;
    setReplyingTo: (message: Message | null) => void;

    markAsRead: (conversation_id: number) => Promise<void>;

    addMessageLocally: (message: Message) => void;

    markConversationMessagesReadLocally: (
        conversation_id: number,
        reader_sub: string
    ) => void;

    lastInteractedAt: Record<number, number>;
    touchConversation: (conversation_id: number) => void;

    deleteConversation: (conversation_id: number) => Promise<boolean>;
    removeConversationLocally: (conversation_id: number) => void;

    pendingConversation: InboxConversation | null;

    loadInbox: () => Promise<InboxConversation[]>;

    inboxOpen: boolean;
    openInbox: () => void;
    closeInbox: () => void;

    loadConversation: (
        post_id?: number,
        conversation_id?: number,
        receiver_sub?: string
    ) => Promise<DirectConversationData | null>;

    deleteMessage: (
        message_id: number,
        conversation_id: number
    ) => Promise<boolean>;

    typingUsers: Record<number, boolean>;
    setTyping: (conversation_id: number, isTyping: boolean) => void;

    setConversation: (convo: DirectConversationData | null) => void;
    clearConversation: () => void;

    removeMessage: (message_id: string | number) => void;
};

export const useMessage = create<MessageState>((set, get) => ({

    inbox: [],
    conversations: null,

    loadingOlderMessages: false,

    conversationCache: {},
    conversationRequests: {},
    activeConversationKey: null,

    viewingConversationId: null,
    setViewingConversation: (id) => set({ viewingConversationId: id }),

    inboxOpen: false,
    loadingInbox: false,
    pendingConversation: null,

    typingUsers: {},

    replyingTo: null,

    setReplyingTo: (message) => set({ replyingTo: message }),

    openInbox: () => set({ inboxOpen: true }),
    closeInbox: () => set({ inboxOpen: false }),

    loadingConversation: false,
    sendingMessage: false,

    lastInteractedAt: {},

    touchConversation: (conversation_id: number) => {
        set((state) => ({
            lastInteractedAt: {
                ...state.lastInteractedAt,
                [conversation_id]: Date.now(),
            },
        }));
    },

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

    sendMessage: async (
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

        set({ sendingMessage: true });

        try {

            const message =
                await sendMessageApi(
                    conversation_id,
                    content,
                    message_type,
                    media_group_id,
                    file_name,
                    file_size,
                    duration_ms,
                    waveform,
                    reply_to_id
                );

            if (!message) {
                return null;
            }

            set((state) => {

                if (!state.conversations) {
                    return state;
                }

                const nextConversation = {
                    ...state.conversations,

                    messages: [
                        ...state.conversations.messages,
                        message,
                    ],
                };

                return {
                    conversations: nextConversation,

                    conversationCache:
                        state.activeConversationKey
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

            console.error(
                "Error sending message:",
                err
            );

            return null;

        } finally {

            set({
                sendingMessage: false,
            });

        }
    },

    sendMessages: async (
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
        if (messages.length === 0) {
            return [];
        }

        set({ sendingMessage: true });

        try {
            // One socket request for the entire batch.
            const sentMessages = await sendMessagesBatchApi(
                conversation_id,
                messages,
            );

            if (!sentMessages?.length) {
                return [];
            }

            set((state) => {
                if (
                    !state.conversations ||
                    state.conversations.conversation.id !== conversation_id
                ) {
                    return state;
                }

                const existingIds = new Set(
                    state.conversations.messages.map(
                        (message) => String(message.id),
                    ),
                );

                const newMessages = sentMessages.filter(
                    (message) => !existingIds.has(String(message.id)),
                );

                const nextConversation = {
                    ...state.conversations,
                    messages: [
                        ...state.conversations.messages,
                        ...newMessages,
                    ],
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

            await get().loadInbox();

            return sentMessages;
        } catch (err) {
            console.error("Error sending message batch:", err);
            return [];
        } finally {
            set({ sendingMessage: false });
        }
    },

    loadOlderMessages: async (): Promise<void> => {
        const state = get();
        const convo = state.conversations;

        if (
            !convo ||
            !convo.hasMore ||
            !convo.nextCursor ||
            state.loadingOlderMessages
        ) {
            return;
        }

        const conversationId = convo.conversation.id;
        const conversationKey = state.activeConversationKey;
        const cursor = convo.nextCursor;

        set({ loadingOlderMessages: true });

        try {
            const olderPage = await getDirectConvo(
                undefined,
                conversationId,
                undefined,
                cursor,
                30,
            );

            if (!olderPage) {
                return;
            }

            set((current) => {
                // The user may have switched conversations during the request.
                if (
                    current.activeConversationKey !== conversationKey ||
                    current.conversations?.conversation.id !== conversationId
                ) {
                    return current;
                }

                const existingMessages = current.conversations.messages;
                const existingIds = new Set(
                    existingMessages.map((message) => String(message.id)),
                );

                const olderMessages = olderPage.messages.filter(
                    (message) => !existingIds.has(String(message.id)),
                );

                // Keep messages in chronological order, oldest first.
                const messages = [...olderMessages, ...existingMessages].sort(
                    (a, b) =>
                        new Date(a.sent_at).getTime() -
                            new Date(b.sent_at).getTime() ||
                        Number(a.id) - Number(b.id),
                );

                const nextConversation: DirectConversationData = {
                    ...current.conversations,
                    messages,
                    hasMore: olderPage.hasMore,
                    nextCursor: olderPage.nextCursor,
                };

                return {
                    conversations: nextConversation,
                    conversationCache: conversationKey
                        ? {
                            ...current.conversationCache,
                            [conversationKey]: {
                                data: nextConversation,
                                createdAt: Date.now(),
                            },
                        }
                        : current.conversationCache,
                };
            });
        } catch (err) {
            console.error("Error loading older messages:", err);
        } finally {
            set({ loadingOlderMessages: false });
        }
    },
    
    loadConversation: async (
        post_id?: number,
        conversation_id?: number,
        receiver_sub?: string
    ): Promise<DirectConversationData | null> => {

        const conversationKey = getConversationKey(
            post_id,
            conversation_id,
            receiver_sub
        );

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

        const existingRequest =
            get().conversationRequests[conversationKey];

        if (existingRequest) {
            return existingRequest;
        }

        const request = getDirectConvo(
            post_id,
            conversation_id,
            receiver_sub
        );

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

            const {
                [conversationKey]: _,
                ...remainingRequests
            } = get().conversationRequests;

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

            if (!state.conversations) {
                return state;
            }

            if (
                state.conversations.conversation.id !==
                message.conversation_id
            ) {
                return state;
            }

            const alreadyExists =
                state.conversations.messages.some(
                    (item) =>
                        String(item.id) === String(message.id)
                );

            if (alreadyExists) {
                return state;
            }

            return {
                conversations: {
                    ...state.conversations,
                    messages: [
                        ...state.conversations.messages,
                        message,
                    ],
                },
            };
        });
    },

    markAsRead: async (
        conversation_id: number
    ): Promise<void> => {

        try {

            await markMessagesReadApi(conversation_id);

            set((state) => ({
                inbox: state.inbox.map((item) =>
                    item.conversation.id === conversation_id
                        ? {
                            ...item,
                            unread_count: 0,
                        }
                        : item
                ),

                conversations:
                    state.conversations?.conversation.id ===
                    conversation_id
                        ? {
                            ...state.conversations,

                            messages:
                                state.conversations.messages.map(
                                    (message) => ({
                                        ...message,

                                        is_read:
                                            message.sender_sub ===
                                            state.conversations?.sender_sub
                                                ? message.is_read
                                                : true,
                                    })
                                ),
                        }
                        : state.conversations,
            }));

        } catch (err) {

            console.error(
                "Error marking messages as read:",
                err
            );

        }
    },

    markConversationMessagesReadLocally: (
        conversation_id,
        reader_sub
    ) => {

        set((state) => ({
            conversations:
                state.conversations?.conversation.id ===
                conversation_id
                    ? {
                        ...state.conversations,

                        messages:
                            state.conversations.messages.map(
                                (message) =>
                                    message.sender_sub !== reader_sub
                                        ? {
                                            ...message,
                                            is_read: true,
                                        }
                                        : message
                            ),
                    }
                    : state.conversations,
        }));
    },

    setTyping: (
        conversation_id,
        isTyping
    ) =>
        set((state) => ({
            typingUsers: {
                ...state.typingUsers,
                [conversation_id]: isTyping,
            },
        })),

    deleteConversation: async (
        conversation_id: number
    ): Promise<boolean> => {

        try {

            await deleteConversationApi(
                conversation_id
            );

            get().removeConversationLocally(
                conversation_id
            );

            return true;

        } catch (err) {

            console.error(
                "Error deleting conversation:",
                err
            );

            return false;
        }
    },

    removeConversationLocally: (
        conversation_id: number
    ) => {

        set((state) => {

            const isActive =
                state.conversations?.conversation.id ===
                conversation_id;

            const nextCache =
                Object.fromEntries(
                    Object.entries(
                        state.conversationCache
                    ).filter(
                        ([, entry]) =>
                            entry.data.conversation.id !==
                            conversation_id
                    )
                );

            return {

                inbox: state.inbox.filter(
                    (item) =>
                        item.conversation.id !==
                        conversation_id
                ),

                conversationCache: nextCache,

                conversations:
                    isActive
                        ? null
                        : state.conversations,

                activeConversationKey:
                    isActive
                        ? null
                        : state.activeConversationKey,
            };
        });
    },

    deleteMessage: async (
        message_id,
        conversation_id
    ) => {

        // Optimistically remove it locally.
        get().removeMessage(message_id);

        const success =
            await deleteMessageApi(
                message_id,
                conversation_id
            );

        if (!success) {

            // Server did not record the deletion.
            // Reload so the message comes back.
            await get().loadConversation(
                undefined,
                conversation_id
            );

            return false;
        }

        return true;
    },

    removeMessage: (message_id) => {

        set((state) => {

            if (!state.conversations) {
                return state;
            }

            const nextMessages =
                state.conversations.messages.filter(
                    (message) =>
                        String(message.id) !==
                        String(message_id)
                );

            const nextConversation = {
                ...state.conversations,
                messages: nextMessages,
            };

            const activeKey =
                state.activeConversationKey;

            return {
                conversations:
                    nextConversation,

                conversationCache:
                    activeKey
                        ? {
                            ...state.conversationCache,

                            [activeKey]: {
                                data:
                                    nextConversation,
                                createdAt:
                                    Date.now(),
                            },
                        }
                        : state.conversationCache,
            };
        });
    },

    setConversation: (convo) =>
        set({
            conversations: convo,
        }),

    clearConversation: () =>
        set({
            conversations: null,
            activeConversationKey: null,
            loadingConversation: false,
        }),

}));
