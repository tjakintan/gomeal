import { Platform } from "react-native";
import { create } from "zustand";
import goMealLiveActivity from "@/modules/go-meal-live-activity";
import { FullPost } from "@/types/feed.types";
import { StepData } from "@/types";

type LiveActivityTimer = {
    timerEndsAt?: number;
    timerLabel?: string;
};

type LiveActivityState = {
    loading: boolean;
    startActivity: (post: FullPost, timer?: LiveActivityTimer) => Promise<void>;
    stopActivity: (postId: string) => Promise<void>;
    updateActivity: (
        postId: string,
        stepCurrent: number,
        stepDesc: string,
        timer?: LiveActivityTimer
    ) => Promise<void>;
};

export const useLiveActivity = create<LiveActivityState>((set) => ({
    loading: false,

    startActivity: async (post, timer) => {
        if (Platform.OS !== "ios") return;

        try {
            set({ loading: true });

            if (!goMealLiveActivity.isAvailable?.()) return;

            const firstStep = post.steps?.[0] as any;

            const stepsJson = JSON.stringify(
                post.steps?.map((s: StepData) => s.description) ?? []
            )

            await goMealLiveActivity.start(
                post.info?.dish_name ?? "",
                String(post.post_id),
                post.steps?.length || 1,
                1,
                firstStep?.step_desc ??
                    firstStep?.description ??
                    firstStep?.desc ??
                    "",
                stepsJson,
                timer?.timerEndsAt,
                timer?.timerLabel
            );
        } catch (error) {
            console.warn("failed_to_start_activity", error);
        } finally {
            set({ loading: false });
        }
    },

    stopActivity: async (postId) => {
        if (Platform.OS !== "ios") return;

        try {
            set({ loading: true });
            await goMealLiveActivity.stop(postId);
        } catch (error) {
            console.warn("failed_to_stop_activity", error);
        } finally {
            set({ loading: false });
        }
    },

    updateActivity: async (postId, stepCurrent, stepDesc, timer) => {
        if (Platform.OS !== "ios") return;

        try {
            await goMealLiveActivity.update(
                postId,
                stepCurrent,
                stepDesc,
                timer?.timerEndsAt,
                timer?.timerLabel
            );
        } catch (error) {
            console.warn("failed_to_update_activity", error);
        }
    },
}));