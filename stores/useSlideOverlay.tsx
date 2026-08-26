import React from "react";
import { create } from "zustand";

export type SlidingOverlayItem = {
    id: string;
    content: React.ReactNode;
    closing?: boolean;
};

type SlidingOverlayState = {
    stack: SlidingOverlayItem[];

    openSlidingOverlay: (content: React.ReactNode) => string;
    closeSlidingOverlay: (id?: string) => void;
    replaceSlidingOverlay: (content: React.ReactNode) => void;
    clearSlidingOverlay: () => void;
};

let id = 0;

export const useSlidingOverlay = create<SlidingOverlayState>((set, get) => ({
    stack: [],

    openSlidingOverlay: (content) => {
        const overlayId = String(++id);

        set(state => ({
            stack: [
                ...state.stack,
                {
                    id: overlayId,
                    content,
                },
            ],
        }));

        return overlayId;
    },

    closeSlidingOverlay: () =>
        set(state => ({
            stack: state.stack.map((item, index) =>
                index === state.stack.length - 1
                    ? { ...item, closing: true }
                    : item
            ),
        })),

    replaceSlidingOverlay: (content) =>
        set(state => ({
            stack: state.stack.length
                ? [
                      ...state.stack.slice(0, -1),
                      {
                          id: String(++id),
                          content,
                      },
                  ]
                : [
                      {
                          id: String(++id),
                          content,
                      },
                  ],
        })),

    clearSlidingOverlay: () =>
        set({
            stack: [],
        }),
}));