import React from "react";
import { create } from "zustand";

export type OverlayItem = {
    label: string;
    value: string | number |boolean | object | null;
};

export type OverlayContent = {
    title?: string;
    body?: string;
    items?: OverlayItem[];
    custom?: React.ReactNode;
    showX?: boolean;
};

type OverlayStatus = "closed" | "opening" | "open" | "closing";

type OverlayState = {
    isOpen: boolean;
    content: OverlayContent | null;
    children: React.ReactNode | null;
    status: OverlayStatus;
    openOverlay: (
        content?: OverlayContent,
        children?: React.ReactNode
    ) => void;
    closeOverlay: () => void;
    notifyOpenComplete: () => void;
    notifyCloseComplete: () => void;
};

export const useOverlay = create<OverlayState>((set, get) => ({
    isOpen: false,
    content: null,
    children: null,
    status: "closed",

    openOverlay: (content, children) => {
        const { status } = get();

        if (status === "opening" || status === "closing") return;

        if (status === "open") {
            set({ content, children: children ?? null });
            return;
        }

        set({
            status: "opening",
            isOpen: true,
            content,
            children: children ?? null,
        });
    },

    closeOverlay: () => {
        const { status } = get();

        if (status === "closed" || status === "closing") return;
        if (status === "opening") return;

        set({ status: "closing", isOpen: false });
    },

    notifyOpenComplete: () => set({ status: "open" }),
    notifyCloseComplete: () =>
        set({
            status: "closed",
            content: null,
            children: null,
        }),
}));