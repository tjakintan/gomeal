import { FeedActionCountsTypes } from "../types/feed.types";
import { MediaType } from "../types/food.types";
import { Avatar } from "../types/user.types";

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

export type NotificationActionType =
    | "message"
    | "like"
    | "cook" // next
    | "post"; // delete

export type NotificationCard = {
    like: LikeNotificationCard[],
    message: MessageNotificationCard[],
    cook: CookNotificationCard[];
};

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

