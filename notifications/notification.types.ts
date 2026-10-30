
import { MediaType } from "@/types/media.types";
import { Avatar } from "../types/user.types";

export type NotificationActionType =
    | "message"
    | "like"
    | "cook"
    | "trend"
    | "recommendation"
    | "star"
    | "post"; // delete

export type GroupedActor = {
    avatar: Avatar;
    profile_name: string;
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

export type LikeNotificationCard = GroupedPostNotificationCard;
export type CookNotificationCard = GroupedPostNotificationCard;
export type StarNotificationCard = GroupedPostNotificationCard;

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
    similarity?: number | null;
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

export type NotificationCard = {
    like: LikeNotificationCard[];
    message: MessageNotificationCard[];
    cook: CookNotificationCard[];
    trend: TrendNotificationCard[];
    recommendation: RecommendationNotificationCard[];
    star: StarNotificationCard[];
};


export type DeleteNotificationParams =
    | {
        action_type: "message";
        conversation_id: number;
    }
    | {
        action_type:
            | "like"
            | "cook"
            | "star"
            | "trend"
            | "recommendation"
            | "post";
        post_id: number;
    };