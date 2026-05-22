import { User, Avatar, BadgeLevel } from "@/types/user.types";
import { UserActionedPostsType } from "@/types/feed.types";

export type Profile = {
    sub: string;
    email: string;
    age: number;
    profile_name: string;
    firstName?: string;
    lastName?: string;
    avatar?: Avatar;
    profile_img_url?: string | null;
    level: number;
    xp: number;
    badge: BadgeLevel;
    bread: number;
    date_joined: string;
};

export type UpdateUserProfile = {
    profile_name?: string;
    firstName?: string;
    lastName?: string;
    dob?: string | null;
};

export type MinimumProfile = {
    sub: string;
    badge: BadgeLevel;
    avatar: Avatar;
    profile_name: string;
    firstName?: string;
    lastName?: string;
    dob?: string | null;
};

export type ProfileStats = {
    num_posts: number;
    num_likes: number;
    num_cooks: number;
    num_stars: number;
    num_shares: number;
};

export type ProfileActivity = UserActionedPostsType;

export type ProfileCard = {
    sub: string;
    profile_name: string;
    avatar?: Avatar;
    profile_img_url?: string | null;
    level: number;
    badge: BadgeLevel;
    num_posts: number;
};

export type ProfileResponse = {
    profile: Profile;
    stats: ProfileStats;
    activity: ProfileActivity;
    global_rank?: number;
};


