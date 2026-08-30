import { FeedActionCountsTypes } from "./feed.types";
import { MediaType } from "./food.types";
import { Avatar } from "./user.types";

export type MessageStatus = "active" | "deleted" | "archived";

export type NotificationSettings = {
    likes: boolean;
    messages: boolean;
    cook: boolean;
    cookingReminderTime: string | null;
    timezone: string;
};

export const defaultNotificationSettings: NotificationSettings = {
    likes: true,
    messages: true,
    cook: true,
    cookingReminderTime: null,
    timezone: "UTC",
};

export interface CreateNotificationParams {
    receiver_sub: string;
    actor_sub: string;
    action_type: NotificationActionType;
    post_id?: number | null;
    conversation_id?: number | null;
};

export type NotificationActionType =
    | "message"
    | "like"
    | "cook"
    | "trend"
    | "post";

export interface Notification {
    id: number;
    receiver_sub: string;
    actor_sub: string;
    action_type: NotificationActionType;
    post_id: number | null;
    created_at: Date;
    is_read: boolean;
    status: MessageStatus;
    status_created_on: Date | null;
    conversation_id: number | null;
};

export type TrendNotificationCard = {
    post_id: number;
    created_at: Date;
    is_read: boolean;
    actor_avatar: Avatar;
    actor_profile_name: string;
    dish_name: string;
    dish_media_url: string;
    dish_media_type: MediaType;
    trend_rank: number;
};

export type NotificationCard = {
    like: LikeNotificationCard[],
    message: MessageNotificationCard[],
    cook: CookNotificationCard[],
    trend: TrendNotificationCard[];
}

export type LikeNotificationCard = {
    post_id: number;
    created_at: Date;
    is_read: boolean;
    actor_avatar: Avatar;
    actor_profile_name: string;
    dish_name: string;
    dish_media_url: string; 
    dish_media_type: MediaType;
};

export type MessageNotificationCard = {
    conversation_id: number;
    created_at: Date;
    is_read: boolean;
    actor_avatar: Avatar;
    actor_profile_name: string;
    content: string;
    user_sub: string;
};

export type CookNotificationCard = {
    post_id: number;
    created_at: Date;
    is_read: boolean;
    actor_avatar: Avatar;
    actor_profile_name: string;
    dish_name: string;
    dish_media_url: string;
    dish_media_type: MediaType;
};

export type PushTokenPlatform = "ios" | "android" | "web";

export interface PushToken {
    id: number;
    user_sub: string;
    token: string;
    platform: PushTokenPlatform | null;
    native_token?: string | null;
    device_id: string | null;
    created_at: Date;
    updated_at: Date;
    last_used_at: Date | null;
}

export type PushTokenRow = Pick<PushToken, "token" | "platform" | "native_token">;


