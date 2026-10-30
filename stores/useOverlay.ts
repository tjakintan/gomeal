import React from "react";
import { create } from "zustand";
import { useReel } from "./useReel";

export type OverlayItem = {
    label: string;
    value: string | number | boolean | object | null;
};

export type OverlayContent = {
    title?: string;
    body?: string;
    items?: OverlayItem[];
    custom?: React.ReactNode;
    showX?: boolean;
    onDismiss?: () => void;
};

export type OverlayScope = "app" | "reel";

export type OverlayStackItem = {
    id: string;
    content: OverlayContent | null;
    children: React.ReactNode | null;
    scope: OverlayScope;
    closing?: boolean;
};

type OverlayState = {
    stack: OverlayStackItem[];
    isOpen: boolean;

    openOverlay: (
        content?: OverlayContent,
        children?: React.ReactNode
    ) => void;

    requestClose: (id?: string) => void;

    closeOverlay: (id?: string) => void;

    removeOverlay: (id: string) => void;
};

const createOverlayId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useOverlay = create<OverlayState>((set, get) => ({
    stack: [],
    isOpen: false,

    openOverlay: (content, children) => {
        const scope: OverlayScope = useReel.getState().isVisible
            ? "reel"
            : "app";

        const overlay: OverlayStackItem = {
            id: createOverlayId(),
            content: content ?? null,
            children: children ?? null,
            scope,
        };

        set((state) => ({
            stack: [...state.stack, overlay],
            isOpen: true
        }));
    },

    requestClose: (id) =>
        set((state) => {
            const targetId =
                id ?? [...state.stack].reverse().find((o) => !o.closing)?.id;
            if (!targetId) return state;

            return {
                stack: state.stack.map((o) =>
                o.id === targetId ? { ...o, closing: true } : o
                ),
            };
        }),

    closeOverlay: (id) => get().requestClose(id),

    removeOverlay: (id) => {
        const overlay = get().stack.find((o) => o.id === id);

        if (!overlay) return;

        set((state) => {
            const stack = state.stack.filter((o) => o.id !== id);

            return {
                stack,
                isOpen: stack.length > 0,
            };
        });

        overlay.content?.onDismiss?.();
    },
}));