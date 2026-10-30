import { UltraMinimumProfile } from "./profile.types";

export const CONVERSATION_CACHE_TTL_MS = 10_000;

export type MessageStatus = "active" | "deleted" | "archived";

export type ConversationType = "direct" | "group";

export type MessageType =
    | "text"
    | "gif"
    | "image"
    | "video"
    | "voice"
    | "file"
    | "link";

export type MessageCursor = {
    sent_at: string;
    id: number | string;
};

export type MessagePage = {
    messages: Message[];
    nextCursor: MessageCursor | null;
    hasMore: boolean;
};

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


export interface Reply {

    id: number;

    sender_sub: string;

    content: string;

    message_type: MessageType;

    status: MessageStatus;

};

export interface Message {

    id: number;

    conversation_id: number;

    sender_sub: string;

    content: string;

    message_type: MessageType;

    media_group_id: string | null;

    file_name?: string | null;

    file_size?: number | null;

    duration_ms?: number | null;

    waveform?: number[] | null;

    reply_to_id: number | null;
    
    reply_to?: Reply | null;

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
    other_user: UltraMinimumProfile;

    hasMore: boolean;
    nextCursor: MessageCursor | null;
}