import { create } from "zustand";
import { block_user_api, get_blocked_users_api, get_report_api, remove_blocked_user_api } from "@/api/profile.api";
import { MinimumProfile } from "@/types/profile.types";

export type BlockedUserType = {
    blocked_sub: string;
    created_at: string;
};
export type ReportTargetType = "post" | "message" | "user";

type BlockUserState = {
    blockedUsers: MinimumProfile[];
    loadingBlockUser: boolean;
    loadingBlockedUsers: boolean;
    blockUser: (blocked_sub: string) => Promise<void>;
    getBlockedUsers: () => Promise<void>;
    removeBlockedUser: (blocked_sub: string) => Promise<void>;
};

type ReportState = {
    loadingReport: boolean;
    reportTarget: (
        target_id: string | number,
        target_type: ReportTargetType
    ) => Promise<void>;
};

export const useReport = create<ReportState>((set) => ({
    
    loadingReport: false,

    reportTarget: async (target_id, target_type) => {
        set({ loadingReport: true });

        try {
            await get_report_api(String(target_id), target_type);
            set({ loadingReport: false });
        } catch (err) {
            console.error("Failed to report:", err);
            set({ loadingReport: false });
            throw err;
        }
    },

}));

export const useBlockUser = create<BlockUserState>((set) => ({
    blockedUsers: [],
    loadingBlockUser: false,
    loadingBlockedUsers: false,

    blockUser: async (blocked_sub) => {
        set({ loadingBlockUser: true });

        try {
            const res = await block_user_api(blocked_sub);

            if (!res.ok) {
                throw new Error("failed_to_block_user");
            }

            const blockedUsers = await get_blocked_users_api();

            set({
                blockedUsers,
                loadingBlockUser: false,
            });
        } catch (err) {
            console.error("Failed to block user:", err);
            set({ loadingBlockUser: false });
            throw err;
        }
    },

    getBlockedUsers: async () => {
        set({ loadingBlockedUsers: true });

        try {
            const blockedUsers = await get_blocked_users_api();
            set({
                blockedUsers,
                loadingBlockedUsers: false,
            });
        } catch (err) {
            console.error("Failed to get blocked users:", err);
            set({ loadingBlockedUsers: false });
            throw err;
        }
    },

    removeBlockedUser: async (blocked_sub) => {
        set({ loadingBlockUser: true });

        try {
            const res = await remove_blocked_user_api(blocked_sub);

            if (!res.ok) {
                throw new Error("failed_to_remove_blocked_user");
            }

            set((state) => ({
                loadingBlockUser: false,
                blockedUsers: state.blockedUsers.filter(
                    (user) => user.sub!== blocked_sub
                ),
            }));
        } catch (err) {
            console.error("Failed to remove blocked user:", err);
            set({ loadingBlockUser: false });
            throw err;
        }
    },

}));



