import { create } from "zustand";

export type PendingMedia = {
    uri: string;
    type: "image" | "video";
};

interface PendingMediaState {
    pendingMedia: PendingMedia[];
    setPendingMedia: (media: PendingMedia[]) => void;
    addPendingMedia: (media: PendingMedia) => void;
    removePendingMediaAt: (index: number) => void;
    clearPendingMedia: () => void;
}

export const usePendingMedia = create<PendingMediaState>((set) => ({
    pendingMedia: [],

    setPendingMedia: (media) => set({ pendingMedia: media }),

    addPendingMedia: (media) =>
        set((state) => ({ pendingMedia: [...state.pendingMedia, media] })),

    removePendingMediaAt: (index) =>
        set((state) => ({
            pendingMedia: state.pendingMedia.filter((_, i) => i !== index),
        })),

    clearPendingMedia: () => set({ pendingMedia: [] }),
}));