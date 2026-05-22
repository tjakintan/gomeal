import { create } from "zustand";
import { StepTimer } from "@/types/food.types";

export const TIMER_FIELDS: { label: string; key: keyof StepTimer; max: number }[] = [
    { label: "h", key: "hours",   max: 24 },
    { label: "m", key: "minutes", max: 60 },
    { label: "s", key: "seconds", max: 60 },
];

export const formatTimer = (t: StepTimer): string => {
    const parts: string[] = [];
    if (t.hours && t.hours > 0)     parts.push(`${t.hours}h`);
    if (t.minutes && t.minutes > 0) parts.push(`${t.minutes}m`);
    if (t.seconds && t.seconds > 0) parts.push(`${t.seconds}s`);
    return parts.join(" ") || "0s";
};

const EMPTY: StepTimer = { hours: 0, minutes: 0, seconds: 0 };

type TimerStore = {
    isOpen: boolean;
    draft: StepTimer;
    stepIndex: number | null;
    openTimer: (timer?: StepTimer | null, stepIndex?: number | null) => void;
    closeTimer: () => void;
    setDraft: (key: keyof StepTimer, val: number) => void;
    setDraftTimer: (timer: StepTimer) => void;
    resetDraft: () => void;
};

export const useTimer = create<TimerStore>((set) => ({
    isOpen: false,
    draft: EMPTY,
    stepIndex: null,

    openTimer: (timer = EMPTY, stepIndex = null) => {
        set({
            isOpen: true,
            draft: timer ?? EMPTY,
            stepIndex,
        });
    },

    closeTimer: () => {
        set({
            isOpen: false,
        });
    },

    setDraft: (key, val) =>
        set((s) => ({
            draft: {
                ...s.draft,
                [key]: val,
            },
        })),

    setDraftTimer: (timer) => {
        set({
            draft: timer,
        });
    },

    resetDraft: () => {
        set({
            draft: EMPTY,
        });
    },

}));