import { FeedActionCountsTypes } from "../types/feed.types";
import { MediaType } from "../types/food.types";
import { Avatar } from "../types/user.types";

export type NotificationSettings = {
    likes: boolean;
    messages: boolean;
    cookingReminderTime: string | null;
};

export const defaultNotificationSettings: NotificationSettings = {
    likes: true,
    messages: true,
    cookingReminderTime: null,
};

export type NotificationActionType =
    | "message"
    | "like"
    | "cook" // next
    | "post"; // delete

export type NotificationCard = {
    like: LikeNotificationCard[],
    message: MessageNotificationCard[],
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

