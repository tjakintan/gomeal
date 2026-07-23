import { create } from "zustand";
import { Avatar } from "@/types";
import { MinimumFeedCard } from "@/types/feed.types";
import { MinimumProfile, Profile, ProfileResponse, UpdateUserProfile } from "@/types/profile.types";
import {
    delete_post_api,
    get_profile_api,
    update_user_profile_api,
} from "@/api/profile.api";
import { useUser } from "./useUser";
import { useFeed } from "./useFeed";

type ProfileState = {
    data: ProfileResponse | null;
    loading: boolean;
    refreshingPosts: boolean;
    refreshPosts: () => Promise<void>;
    loadProfile: () => Promise<void>;
    deletePost: (post_id: number) => Promise<boolean>;
    updateProfile: (profile: UpdateUserProfile) => Promise<MinimumProfile | null>;
    setProfile: (data: ProfileResponse) => void;
    clearProfile: () => void;
};

export const useProfile = create<ProfileState>((set) => ({

    data: null,
    loading: false,
    refreshingPosts: false,

    refreshPosts: async () => {
        set({ refreshingPosts: true });
        try {
            const profile = await get_profile_api();
            set((state) => ({
                data: state.data
                    ? { ...state.data, activity: profile.activity }
                    : profile,
            }));
        } catch (err) {
            console.error("Failed to refresh posts:", err);
        } finally {
            set({ refreshingPosts: false });
        }
    },

    loadProfile: async () => {
        set({ loading: true });

        try {
            const profile = await get_profile_api();
            set({ data: profile });

            useUser.getState().updateUser({
                avatar: profile.profile.avatar,
                profile_img_url: profile.profile.profile_img_url,
            });
        } catch (err) {
            console.error("Failed to load profile:", err);
        } finally {
            set({ loading: false });
        }
    },

    deletePost: async (post_id) => {
        set({ loading: true });

        try {
            const res = await delete_post_api(post_id);

            if (!res.ok) return false;

            useFeed.getState().removePost(post_id);

            return true;
        } catch (err) {
            console.error("Failed to delete post:", err);
            return false;
        }finally {
            set({ loading: false });
        }
    },

    updateProfile: async (profile) => {
        set({ loading: true });

        try {

            const res = await update_user_profile_api(profile);
            const nextProfile = res.profile;

            set((state) => {

                if (!state.data) return state;

                return {
                    data: {
                        ...state.data,
                        profile: {
                            ...state.data.profile,
                            ...nextProfile,
                        },
                    },
                };
            });

            useUser.getState().updateUser({
                avatar: nextProfile.avatar,
                profile_name: nextProfile.profile_name,
                firstName: nextProfile.firstName,
                lastName: nextProfile.lastName,
                dob: nextProfile.dob
                    ? String(nextProfile.dob)
                    : undefined,
                bio: nextProfile.bio,
                website: nextProfile.website,
                profile_img_url: nextProfile.profile_img_url,
                tag_color: nextProfile.tag_color
            });

            return nextProfile;

        } catch (err) {

            console.error("Failed to update profile:", err);
            return null;

        } finally {

            set({ loading: false });

        }
    },

    setProfile: (data) => {
        set({ data });
        useUser.getState().updateUser({
            avatar: data.profile.avatar,
            profile_name: data.profile.profile_name,
            firstName: data.profile.firstName,
            lastName: data.profile.lastName,
            bio: data.profile.bio,
            website: data.profile.website,
            profile_img_url: data.profile.profile_img_url,
            tag_color: data.profile.tag_color
        });
    },

    clearProfile: () => set({ data: null }),

}));
