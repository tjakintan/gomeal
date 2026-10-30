import { create } from "zustand";

type PendingLinkState = {
    pendingLinkUrl: string;
    setPendingLinkUrl: (url: string) => void;
};

export const usePendingLink = create<PendingLinkState>((set) => ({
    pendingLinkUrl: "",
    setPendingLinkUrl: (pendingLinkUrl) => set({ pendingLinkUrl }),
}));