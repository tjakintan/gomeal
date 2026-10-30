import React, { useMemo } from "react";
import { create } from "zustand";
import { RewardItem } from "./useReward";

export type BannerType = "error" | "success" | "custom" | "reward";

export type BannerItem = {
    id: string;
    type: BannerType;
    text: string;
    title?: string;
    icon?: React.ReactNode;
    duration: number;
    rewards?: RewardItem[];
    onPress?: () => void;
};


type BannerStatus = "closed" | "opening" | "open" | "closing";

type ShowRewardArgs = {
  rewards: RewardItem[];
  duration?: number;
};

type ShowCustomArgs = {
    icon: React.ReactNode;
    title: string;
    text: string;
    duration?: number;
    onPress?: () => void;
};


type BannerState = {
    current: BannerItem | null;
    queue: BannerItem[];
    status: BannerStatus;

    showError: (text: string, duration?: number) => void;
    showSuccess: (text: string, duration?: number) => void;
    showReward: (args: ShowRewardArgs) => void;
    showCustom: (args: ShowCustomArgs) => void;

    dismiss: () => void;

    notifyOpenComplete: () => void;
    notifyCloseComplete: () => void;
};

let id = 0;
const DEFAULT_DURATION = 3500;

/**
 * If nothing is currently showing, the new banner becomes `current`
 * immediately. Otherwise it's queued — this mirrors why `useOverlay`
 * guards on `status === "opening" | "closing"` before accepting a new
 * open: we don't want a fast `error()` → `success()` in a row to stomp
 * on an in-flight animation.
 */
function enqueue(state: BannerState, item: BannerItem): Partial<BannerState> {
    if (!state.current || state.status === "closed") {
        return { current: item, status: "opening" };
    }
    return { queue: [...state.queue, item] };
}

export const useBannerStore = create<BannerState>((set, get) => ({
    current: null,
    queue: [],
    status: "closed",

    showError: (text, duration = DEFAULT_DURATION) =>
        set((state) => enqueue(state, { id: String(++id), type: "error", text, duration })),

    showSuccess: (text, duration = DEFAULT_DURATION) =>
        set((state) => enqueue(state, { id: String(++id), type: "success", text, duration })),

    showCustom: ({ icon, title, text, duration = DEFAULT_DURATION, onPress }) =>
        set((state) =>
            enqueue(state, { id: String(++id), type: "custom", text, title, icon, duration, onPress })
        ),

    showReward: ({ rewards, duration = DEFAULT_DURATION }) =>
        set((state) =>
            enqueue(state, {
            id: String(++id),
            type: "reward",
            text: "",
            rewards,
            duration,
            })
        ),

    dismiss: () => {
        const { status } = get();
        if (status !== "open" && status !== "opening") return;
        set({ status: "closing" });
    },

    notifyOpenComplete: () => set({ status: "open" }),

    notifyCloseComplete: () =>
        set((state) => {
            const [next, ...rest] = state.queue;
            if (!next) return { current: null, status: "closed", queue: [] };
            return { current: next, status: "opening", queue: rest };
        }),
}));

export function useBanner() {
    return useMemo(
        () => ({
            error: (text: string, duration?: number) =>
                useBannerStore.getState().showError(text, duration),

            success: (text: string, duration?: number) =>
                useBannerStore.getState().showSuccess(text, duration),

            custom: (args: ShowCustomArgs) => useBannerStore.getState().showCustom(args),

            reward: (args: { rewards: RewardItem[]; duration?: number }) =>
                useBannerStore.getState().showReward(args),
        }),
        []
    );
}