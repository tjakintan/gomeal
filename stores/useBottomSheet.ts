
import { ReactNode } from "react";
import { create } from "zustand";

export type BottomSheetSource = "input" | "other";

export type BottomSheetEntry = {
    id: string;
    content: ReactNode;
    source: BottomSheetSource;
    snapPoints: (string | number)[];
    index: number;
    backdropOpacity: number;
    enableDynamicSizing: boolean;
    dark: boolean;
    isLandscape: boolean;
};


type BottomSheetState = {
    
    stack: BottomSheetEntry[];
    closingId: string | null;

    content: React.ReactNode | null;
    snapPoints: (string | number)[];
    isOpen: boolean;
    index: number;
    isLandscape: boolean;
    dark: boolean;
    sheetHeight: number;
    backdropOpacity: number;
    enableDynamicSizing: boolean;

    openBottomSheet: (
        content: React.ReactNode,
        snapPoints?: (string | number)[],
        index?: number,
        backdropOpacity?: number,
        enableDynamicSizing?: boolean,
        dark?: boolean,
        isLandscape?: boolean,
        source?: BottomSheetSource,
    ) => void;

    closeBottomSheet: () => void;
    clearBottomSheet: () => void;
    removeBottomSheet: (id: string) => void;
    closeAllBottomSheets: () => void;
};

let nextSheetId = 0;

const getSheetHeight = (snapPoints: (string | number)[]) =>
    typeof snapPoints[0] === "number" ? snapPoints[0] : 0;

export const useBottomSheet = create<BottomSheetState>((set, get) => ({
    stack: [],
    closingId: null,

    content: null,
    snapPoints: [250],
    isOpen: false,
    index: -1,
    isLandscape: false,
    dark: false,
    sheetHeight: 0,
    backdropOpacity: 0.5,
    enableDynamicSizing: true,

    openBottomSheet: (
        content,
        snapPoints = [250],
        index = 0,
        backdropOpacity = 0.5,
        enableDynamicSizing = true,
        dark = false,
        isLandscape = false,
        source = "other",
    ) => {
        const entry: BottomSheetEntry = {
            id: `bottom-sheet-${++nextSheetId}`,
            source,
            content,
            snapPoints,
            index,
            backdropOpacity,
            enableDynamicSizing,
            dark,
            isLandscape,
        };

        set((state) => ({
            stack: [...state.stack, entry],
            closingId: null,

            content,
            snapPoints,
            isOpen: true,
            index,
            backdropOpacity,
            enableDynamicSizing,
            dark,
            isLandscape,
            sheetHeight: getSheetHeight(snapPoints),
        }));
    },

    closeBottomSheet: () => {
        const { stack } = get();
        const top = stack[stack.length - 1];

        if (top) {
            set({ closingId: top.id });
        } else {
            set({ isOpen: false, sheetHeight: 0 });
        }
    },

    clearBottomSheet: () => {
        const stack = get().stack.slice(0, -1);
        const top = stack[stack.length - 1];

        set({
            stack,
            closingId: null,
            content: top?.content ?? null,
            snapPoints: top?.snapPoints ?? [250],
            isOpen: stack.length > 0,
            index: top?.index ?? -1,
            backdropOpacity: top?.backdropOpacity ?? 0.5,
            enableDynamicSizing: top?.enableDynamicSizing ?? true,
            dark: top?.dark ?? false,
            isLandscape: top?.isLandscape ?? false,
            sheetHeight: top ? getSheetHeight(top.snapPoints) : 0,
        });
    },

    removeBottomSheet: (id) => {
        set((state) => {
            const stack = state.stack.filter((sheet) => sheet.id !== id);
            const top = stack[stack.length - 1];

            return {
                stack,
                closingId: state.closingId === id ? null : state.closingId,
                content: top?.content ?? null,
                snapPoints: top?.snapPoints ?? [250],
                isOpen: stack.length > 0,
                index: top?.index ?? -1,
                backdropOpacity: top?.backdropOpacity ?? 0.5,
                enableDynamicSizing: top?.enableDynamicSizing ?? true,
                dark: top?.dark ?? false,
                isLandscape: top?.isLandscape ?? false,
                sheetHeight: top ? getSheetHeight(top.snapPoints) : 0,
            };
        });
    },

    closeAllBottomSheets: () => {
        set({
            stack: [],
            closingId: null,
            content: null,
            snapPoints: [250],
            isOpen: false,
            index: -1,
            isLandscape: false,
            dark: false,
            sheetHeight: 0,
            backdropOpacity: 0.5,
            enableDynamicSizing: true,
        });
    },
}));
