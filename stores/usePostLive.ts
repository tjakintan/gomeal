import { create } from "zustand";
import { FeedActionType } from "@/types/feed.types";

type Live = {
    action_counts?: Record<string, number>;
    user_actions?: FeedActionType[];
};

type PostLiveState = {
    byId: Record<string, Live>;
    setLive: (id: string | number, live: Live) => void;
    seedLive: (id: string | number, live: Live) => void;
};

export const usePostLive = create<PostLiveState>((set) => ({
    byId: {},
    setLive: (id, live) =>
        set((s) => {
            const key = String(id);
            return { byId: { ...s.byId, [key]: { ...s.byId[key], ...live } } };
        }),
    seedLive: (id, live) =>
        set((s) => {
            const key = String(id);
            if (s.byId[key]) return s; // no-op, zustand skips the update
            return { byId: { ...s.byId, [key]: live } };
        }),
}));