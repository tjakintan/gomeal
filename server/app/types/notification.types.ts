import { MediaType } from "./food.types";
import { Avatar } from "./user.types";

export type MessageStatus = "active" | "deleted" | "archived";

export const POST_NOTIF_TYPES = [
    "like",
    "star",
    "cook",
    "trend",
    "recommendation",
] as const;

export type NotificationActionType =
    | "message"
    | "like"
    | "cook"
    | "trend"
    | "recommendation"
    | "star"
    | "post";

export type PostNotifType = (typeof POST_NOTIF_TYPES)[number];

export type GroupedActor = { avatar: Avatar; profile_name: string };

export type NotificationSettings = {
    likes: boolean;
    messages: boolean;
    cook: boolean;
    stars: boolean; 
    cookingReminderTime: string | null;
    timezone: string;
};

export const defaultNotificationSettings: NotificationSettings = {
    likes: true,
    messages: true,
    cook: true,
    stars: true,
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

export type GroupedPostNotificationCard = {
    post_id: number;
    created_at: Date;  
    is_read: boolean;  
    actor_count: number;
    actors: GroupedActor[]; 
    dish_name: string;
    dish_media_url: string;
    dish_media_type: MediaType;
};

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

export type RecommendationNotificationCard = {
    post_id: number;
    created_at: Date;
    is_read: boolean;
    dish_name: string;
    dish_media_url: string;
    dish_media_type: MediaType;
    similarity?: number;
};

export type NotificationCard = {
    like: LikeNotificationCard[],
    message: MessageNotificationCard[],
    cook: CookNotificationCard[],
    trend: TrendNotificationCard[];
    star: StarNotificationCard[];
    recommendation: RecommendationNotificationCard[];
}

export type LikeNotificationCard = GroupedPostNotificationCard;
export type CookNotificationCard = GroupedPostNotificationCard;
export type StarNotificationCard = GroupedPostNotificationCard;

export type MessageNotificationCard = {
    conversation_id: number;
    created_at: Date;
    is_read: boolean;
    actor_avatar: Avatar;
    actor_profile_name: string;
    content: string;
    user_sub: string;
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


