import React from "react";
import { create } from "zustand";
import { useReel } from "./useReel";

export type SlidingOverlayScope = "app" | "reel";

export type SlidingOverlayItem = {
    id: string;
    content: React.ReactNode;
    closing?: boolean;
    scope: SlidingOverlayScope;
    onDismiss?: () => void;
};

export type OpenSlidingOverlayOptions = {
    onDismiss?: () => void;
};

type SlidingOverlayState = {
    stack: SlidingOverlayItem[];
    isOpen: boolean;
    isOpening: boolean;
    isClosing: boolean;
    isSwiping: boolean;
    setSwiping: (v: boolean) => void;
    openSlidingOverlay: (
        content: React.ReactNode,
        options?: OpenSlidingOverlayOptions 
    ) => string | null;

    closeSlidingOverlay: (id?: string) => void;

    replaceSlidingOverlay: (content: React.ReactNode) => void;

    clearSlidingOverlay: () => void;
};

let id = 0;

export const useSlidingOverlay = create<SlidingOverlayState>((set, get) => ({
    stack: [],
    isOpen: false,
    isOpening: false,
    isClosing: false,
    isSwiping: false,
    setSwiping: (isSwiping) => set({ isSwiping }),

    openSlidingOverlay: (content, options) => {

        if (get().isOpening) {
            return null;
        }

        set({ isOpening: true, isClosing: false });

        const overlayId = String(++id);

        const scope: SlidingOverlayScope = useReel.getState().isVisible
            ? "reel"
            : "app";

        set((state) => ({
            isOpen: true,
            stack: [
                ...state.stack,
                { id: overlayId, content, scope, onDismiss: options?.onDismiss },
            ],
        }));

        requestAnimationFrame(() => {
            set({ isOpening: false });
        });

        return overlayId;
    },

    closeSlidingOverlay: () => {
        set((state) => ({
            isClosing: true,
            stack: state.stack.map((item, index) =>
                index === state.stack.length - 1
                    ? { ...item, closing: true }
                    : item
            ),
        }));
    },

    replaceSlidingOverlay: (content) =>
        set((state) => {
            const current = state.stack[state.stack.length - 1];

            return {
                isClosing: false,
                isOpen: true,
                stack: state.stack.length
                    ? [
                          ...state.stack.slice(0, -1),
                          {
                              id: String(++id),
                              content,
                              scope: current?.scope ?? "app",
                          },
                      ]
                    : [
                          {
                              id: String(++id),
                              content,
                              scope: "app",
                          },
                      ],
            };
        }),

        clearSlidingOverlay: () => {
            const items = get().stack;

        set({ stack: [], isOpen: false, isOpening: false, isClosing: false, isSwiping: false });

            items.forEach((item) => item.onDismiss?.());
        },
}));