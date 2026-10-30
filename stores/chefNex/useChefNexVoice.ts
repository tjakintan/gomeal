import { create } from "zustand";
import { Socket } from "socket.io-client";
import { getChefNexSocket, resetChefNexSocket } from "@/api/chefNex.socket";
import { ChefNexMessage, ChefNexStatus } from "@/types/chefNex.types";

type ChefNexVoiceState = {
    socket: Socket | null;
    status: ChefNexStatus;
    isConnected: boolean;

    sessionId: string | null;
    contextPostId: number | null; 

    messages: ChefNexMessage[];

    isRecording: boolean;
    isChefNexSpeaking: boolean;
    audioQueue: ArrayBuffer[];

    error: string | null;

    // lifecycle
    connect: (contextPostId?: number) => Promise<void>;
    disconnect: () => void;

    // voice pipeline
    startListening: () => void;
    stopListening: () => void;
    sendPcmChunk: (chunk: ArrayBuffer) => void;

    // incoming
    pushChefNexMessage: (msg: ChefNexMessage) => void;
    pushUserMessage: (msg: ChefNexMessage) => void;
    enqueueAudioChunk: (chunk: ArrayBuffer) => void;
    clearAudioQueue: () => void;

    setStatus: (status: ChefNexStatus) => void;
    setContextPostId: (postId: number | null) => void;
    reset: () => void;
};

export const useChefNexVoice = create<ChefNexVoiceState>((set, get) => ({
    socket: null,
    status: "idle",
    isConnected: false,

    sessionId: null,
    contextPostId: null,

    messages: [],

    isRecording: false,
    isChefNexSpeaking: false,
    audioQueue: [],

    error: null,

    connect: async (contextPostId) => {
        if (get().socket) return;

        set({ status: "connecting", contextPostId: contextPostId ?? null });

        try {
            const socket = await getChefNexSocket(); 

            socket.on("connect", () => {
                set({ isConnected: true, status: "idle", sessionId: socket.id ?? null });
            });

            socket.on("disconnect", () => {
                set({ isConnected: false, status: "idle" });
            });

            socket.on("chefNex_message", (msg: ChefNexMessage) => {
                get().pushChefNexMessage(msg);
            });

            socket.on("audio_chunk", (chunk: ArrayBuffer) => {
                get().enqueueAudioChunk(chunk);
            });

            set({ socket });
        } catch (err) {
            console.error("Failed to connect chefNex socket:", err);
            set({ status: "error", error: "connection_failed" });
        }
    },

    disconnect: () => {
        resetChefNexSocket();
        set({ socket: null, isConnected: false, status: "idle" });
    },

    startListening: () => {
        if (!get().isConnected) return;
        set({ isRecording: true, status: "listening" });
        // actual mic capture + PCM chunking driven from the component via expo-audio,
        // calling sendPcmChunk() per chunk
    },

    stopListening: () => {
        set({ isRecording: false, status: "thinking" });
        get().socket?.emit("stop_listening");
    },

    sendPcmChunk: (chunk) => {
        const { socket, isRecording } = get();
        if (!socket || !isRecording) return;
        socket.emit("pcm_chunk", chunk);
    },

    pushChefNexMessage: (msg) => {
        set((state) => ({
            messages: [...state.messages, msg],
            status: "speaking",
        }));
    },

    pushUserMessage: (msg) => {
        set((state) => ({ messages: [...state.messages, msg] }));
    },

    enqueueAudioChunk: (chunk) => {
        set((state) => ({
            audioQueue: [...state.audioQueue, chunk],
            isChefNexSpeaking: true,
        }));
        // actual playback consumption happens in the component via expo-audio,
        // draining audioQueue and calling clearAudioQueue/shift as chunks finish
    },

    clearAudioQueue: () => {
        set({ audioQueue: [], isChefNexSpeaking: false, status: "idle" });
    },

    setStatus: (status) => set({ status }),
    setContextPostId: (postId) => set({ contextPostId: postId }),

    reset: () => {
        get().disconnect();
        set({
            messages: [],
            audioQueue: [],
            isRecording: false,
            isChefNexSpeaking: false,
            error: null,
            status: "idle",
        });
    },

}));