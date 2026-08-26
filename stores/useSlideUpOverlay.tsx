import React from "react";
import { create } from "zustand";

export type SlideUpOverlayItem = {
    id: string;
    content: React.ReactNode;
    closing?: boolean;
};

type SlideUpOverlayState = {
    stack: SlideUpOverlayItem[];

    openSlideUpOverlay: (content: React.ReactNode) => string;
    closeSlideUpOverlay: (id?: string) => void;
    replaceSlideUpOverlay: (content: React.ReactNode) => void;
    clearSlideUpOverlay: () => void;
};

let id = 0;

export const useSlideUpOverlay = create<SlideUpOverlayState>((set, get) => ({
    stack: [],

    openSlideUpOverlay: (content) => {
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

    closeSlideUpOverlay: () =>
        set(state => ({
        stack: state.stack.map((item, index) =>
            index === state.stack.length - 1
            ? { ...item, closing: true }
            : item
        ),
        })),

    replaceSlideUpOverlay: (content) =>
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

    clearSlideUpOverlay: () =>
        set({
        stack: [],
        }),
}));