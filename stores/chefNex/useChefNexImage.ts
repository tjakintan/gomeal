import { create } from "zustand";
import { Socket } from "socket.io-client";
import { chefNexSocketEmit, getChefNexSocket, resetChefNexSocket } from "@/api/chefNex.socket";
import {
    ChefNexDetectedItem,
    ChefNexImageStatus,
    ChefNexFrameResults,
    ChefNexFeedbackRating,
    ChefNexFeedbackReason,
    ChefNexFeedbackPayload,
    ChefNexFeedbackAck,
} from "@/types/chefNex.types";


type ChefNexImageState = {
    socket: Socket | null;
    status: ChefNexImageStatus;
    isConnected: boolean;

    isStreaming: boolean;
    awaitingResult: boolean;

    results: ChefNexDetectedItem[];
    similar_post_ids: number[];

    error: string | null;

    connect: () => Promise<void>;
    disconnect: () => void;

    startStreaming: () => void;
    stopStreaming: () => void;

    submitFrame: (
        bytes: ArrayBuffer,
        width: number,
        height: number,
    ) => void;

    pushFrameResults: (results: ChefNexFrameResults) => void;

    feedback: Record<string, ChefNexFeedbackRating>;

    sendFeedback: (
        item: ChefNexDetectedItem,
        rating: ChefNexFeedbackRating,
        reason?: ChefNexFeedbackReason,
    ) => Promise<boolean>;

    clearError: () => void;
    reset: () => void;
};


export const useChefNexImage = create<ChefNexImageState>((set, get) => ({
    socket: null,
    status: "idle",
    isConnected: false,

    isStreaming: false,
    awaitingResult: false,

    results: [],
    similar_post_ids: [],
    error: null,

    feedback: {},

    connect: async () => {
        if (get().socket?.connected) {
            set({ isConnected: true });
            return;
        }

        set({
            status: "connecting",
            error: null,
        });

        try {
            const socket = await getChefNexSocket();

            socket.on("connect", () => {
                set({
                    isConnected: true,
                    error: null,
                });
            });

            socket.on("disconnect", () => {
                set({
                    isConnected: false,
                    isStreaming: false,
                    awaitingResult: false,
                });
            });

            socket.on(
                "frame_results",
                (results: ChefNexFrameResults) => {
                    get().pushFrameResults(results);
                },
            );

            socket.on(
                "detect_error",
                (err: { message?: string }) => {
                    set({
                        status: "error",
                        error: err?.message ?? "detect_failed",
                        awaitingResult: false,
                    });
                },
            );

            set({ socket });

            if (socket.connected) {
                set({ isConnected: true });
                return;
            }

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("socket_connection_timeout"));
                }, 10_000);

                socket.once("connect", () => {
                    clearTimeout(timeout);
                    resolve();
                });

                socket.once("connect_error", (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

        } catch (err) {
            console.error(
                "Failed to connect chefNex image socket:",
                err,
            );

            set({
                socket: null,
                isConnected: false,
                status: "error",
                error: "connection_failed",
            });
        }
    },

    disconnect: () => {
        resetChefNexSocket();

        set({
            socket: null,
            isConnected: false,
            isStreaming: false,
            status: "idle",
        });
    },

    startStreaming: () => {
        if (!get().isConnected) return;

        set({
            isStreaming: true,
            status: "streaming",
            results: [],
            similar_post_ids: [],
            feedback: {},
            awaitingResult: false,
        });
    },

    stopStreaming: () => {
        set({
            isStreaming: false,
            status: "idle",
            awaitingResult: false,
        });
    },

    submitFrame: (bytes, width, height) => {
        const { socket, isStreaming, awaitingResult } = get();

        if (!socket || !isStreaming || awaitingResult) return;

        set({
            awaitingResult: true,
            status: "analyzing",
        });

        socket.emit(
            "image_frame",
            {
                data: bytes,
                width,
                height,
                pixel_format: "jpeg",
            },
        );
    },

    pushFrameResults: (results) => {
        set({
            results: results.items,
            similar_post_ids: results.similar_post_ids,
            isStreaming: false,
            awaitingResult: false,
            status: "idle",
            error: null,
        });
    },

    sendFeedback: async (item, rating, reason) => {
        const key = `${item.frameId}:${item.id}`;
        const prev = get().feedback[key];

        // re-tapping the same thumb does nothing, unless a reason is being added
        if (prev === rating && !reason) return true;

        set((s) => ({ feedback: { ...s.feedback, [key]: rating } })); // optimistic

        const payload: ChefNexFeedbackPayload = {
            frame_id: item.frameId,
            item_id: item.id,
            rating,
            reason,
        };

        const res = await chefNexSocketEmit<ChefNexFeedbackAck>("feedback", payload);

        if (!res?.ok) {
            set((s) => {
                const { [key]: _, ...rest } = s.feedback;
                return { feedback: prev ? { ...rest, [key]: prev } : rest };
            });
            return false;
        }

        return true;
    },

    reset: () => {
        get().disconnect();

        set({
            isStreaming: false,
            awaitingResult: false,
            results: [],
            similar_post_ids: [],
            feedback: {},
            error: null,
            status: "idle",
        });
    },

    clearError: () => set({ error: null }),
}));


export function errorMessage(code: string): string {
    switch (code) {
        case "connection_failed":
        case "socket_connection_timeout":
            return "Couldn't connect — check your connection and try again.";
        case "detect_failed":
            return "Couldn't identify ingredients from that frame.";
        default:
            return "Something went wrong.";
    }
}