import { create } from "zustand";

export type PendingFile = {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
};

interface PendingFileState {
    pendingFile: PendingFile | null;

    setPendingFile: (file: PendingFile | null) => void;
    clearPendingFile: () => void;
}

export const usePendingFile = create<PendingFileState>((set) => ({
    pendingFile: null,

    setPendingFile: (file) =>
        set({
            pendingFile: file,
        }),

    clearPendingFile: () =>
        set({
            pendingFile: null,
        }),
}));