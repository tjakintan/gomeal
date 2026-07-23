import { UltraMinimumProfile } from "./profile.types";

export const CONVERSATION_CACHE_TTL_MS = 10_000;

export type MessageStatus = "active" | "deleted" | "archived";

export type ConversationType = "direct" | "group";

export interface Conversation {
    id: number;
    post_id: number | null;
    type: ConversationType;
    created_at: Date;
    capacity: number | null;       
    created_by: string;          
};

export interface InboxConversation {
    conversation: DirectConversation;
    other_user: UltraMinimumProfile;
    last_message?: Message;
    unread_count: number;
};

export interface DirectConversation {
    id: number;
    type: "direct";
    created_at: Date;
    created_by: string;
};

export interface Message {
    id: number;
    conversation_id: number;
    sender_sub: string;
    content: string;
    sent_at: Date;
    is_read: boolean;
    status: MessageStatus;
    status_created_on: Date;
};

export interface DirectConversationData {
    conversation: DirectConversation;
    receiver_sub: string;
    sender_sub: string;
    isNew: boolean;
    messages: Message[];
};