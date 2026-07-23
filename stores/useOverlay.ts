import React from "react";
import { create } from "zustand";

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
};

type OverlayStatus = "closed" | "opening" | "open" | "closing";

type OverlayState = {
    isOpen: boolean;
    content: OverlayContent | null;
    status: OverlayStatus;
    openOverlay: (content: OverlayContent) => void;
    closeOverlay: () => void;
    // Called by the consumer (AuthenticatedApp's overlay effect) once the
    // open/close animation it kicked off has actually finished — not when
    // the request was made. This is the lock: nothing can open or close
    // while status is "opening"/"closing", so a second openOverlay() call
    // mid-animation is just dropped instead of restarting/racing it.
    notifyOpenComplete: () => void;
    notifyCloseComplete: () => void;
};

export const useOverlay = create<OverlayState>((set, get) => ({
    isOpen: false,
    content: null,
    status: "closed",

    openOverlay: (content) => {
        const { status } = get();

        // Locked mid-transition — drop the call rather than queue or stomp it.
        if (status === "opening" || status === "closing") return;

        if (status === "open") {
            // Already open — no animation needed, just swap content in place.
            set({ content });
            return;
        }

        set({ status: "opening", isOpen: true, content });
    },

    closeOverlay: () => {
        const { status } = get();

        if (status === "closed" || status === "closing") return; // nothing to do, or already closing
        if (status === "opening") return; // locked — let the open finish before allowing a close

        set({ status: "closing", isOpen: false });
    },

    notifyOpenComplete: () => set({ status: "open" }),
    notifyCloseComplete: () => set({ status: "closed", content: null }),
}));