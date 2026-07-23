import { FeedActionCountsTypes } from "../types/feed.types";
import { MediaType } from "../types/food.types";
import { Avatar } from "../types/user.types";

export type NotificationActionType =
    | "message"
    | "like"
    | "cook"
    | "trend"
    | "post"; // delete

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

