import { create } from "zustand";
import { Avatar } from "@/types";
import { MinimumProfile, Profile, ProfileResponse, UpdateUserProfile } from "@/types/profile.types";
import {
    delete_post_api,
    get_profile_api,
    update_user_avatar_api,
    update_user_profile_api,
    update_user_profile_image_api,
} from "@/api/profile.api";
import { useUser } from "./useUser";
import { useFeed } from "./useFeed";

type ProfileState = {
    data: ProfileResponse | null;
    loading: boolean;
    loadProfile: () => Promise<void>;
    deletePost: (post_id: number) => Promise<boolean>;
    updateProfile: (profile: UpdateUserProfile) => Promise<MinimumProfile | null>;
    updateAvatar: (avatar: Avatar) => Promise<MinimumProfile | null>;
    updateProfileImage: (profile_img_url: string | null) => Promise<Profile["profile_img_url"] | null>;
    setProfile: (data: ProfileResponse) => void;
    clearProfile: () => void;
};

export const useProfile = create<ProfileState>((set) => ({

    data: null,
    loading: false,

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
                            profile_name: nextProfile.profile_name,
                            firstName: nextProfile.firstName,
                            lastName: nextProfile.lastName,
                            dob: nextProfile.dob,
                        },
                    },
                };
            });

            useUser.getState().updateUser({
                profile_name: nextProfile.profile_name,
                firstName: nextProfile.firstName,
                lastName: nextProfile.lastName,
                dob: String(nextProfile.dob),
            });

            return nextProfile;
        } catch (err) {
            console.error("Failed to update profile:", err);
            return null;
        } finally {
            set({ loading: false });
        }
    },

    updateAvatar: async (avatar) => {
        try {
            const res = await update_user_avatar_api(avatar);
            set((state) => {
                if (!state.data) return state;

                return {
                    data: {
                        ...state.data,
                        profile: {
                            ...state.data.profile,
                            avatar: res.profile.avatar,
                        },
                    },
                };
            });

            useUser.getState().setAvatar(res.profile.avatar);

            return res.profile;
        } catch (err) {
            console.error("Failed to update avatar:", err);
            return null;
        }
    },

    updateProfileImage: async (profile_img_url) => {
        try {
            const res = await update_user_profile_image_api(profile_img_url);
            const nextUrl = res.profile_image.profile_img_url;

            set((state) => {
                if (!state.data) return state;

                return {
                    data: {
                        ...state.data,
                        profile: {
                            ...state.data.profile,
                            profile_img_url: nextUrl,
                        },
                    },
                };
            });

            useUser.getState().updateUser({
                profile_img_url: nextUrl,
            });

            return nextUrl;
        } catch (err) {
            console.error("Failed to update profile image:", err);
            return null;
        }
    },

    setProfile: (data) => {
        set({ data });

        useUser.getState().updateUser({
            avatar: data.profile.avatar,
            profile_img_url: data.profile.profile_img_url,
        });
    },

    clearProfile: () => set({ data: null }),

}));
