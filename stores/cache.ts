import { FEED_CACHE_TTL_MS, REEL_CACHE_TTL_MS } from "@/types/feed.types";
import { useFeed } from "./useFeed";
import { useMessage } from "./useMessage";
import { CONVERSATION_CACHE_TTL_MS } from "@/types/messages.types";

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

export const sweepStaleCaches = () => {
    const now = Date.now();

    useFeed.setState((state) => {
        const feedCache = Object.fromEntries(
            Object.entries(state.feedCache).filter(
                ([, entry]) => now - entry.createdAt < FEED_CACHE_TTL_MS
            )
        );
        const reelCache = Object.fromEntries(
            Object.entries(state.reelCache).filter(
                ([, entry]) => now - entry.createdAt < REEL_CACHE_TTL_MS
            )
        );
        return { feedCache, reelCache };
    });

    useMessage.setState((state) => {
        const conversationCache = Object.fromEntries(
            Object.entries(state.conversationCache).filter(
                ([, entry]) => now - entry.createdAt < CONVERSATION_CACHE_TTL_MS
            )
        );
        return { conversationCache };
    });
};

export const startCacheSweep = () => {
    if (sweepTimer) return; 
    sweepTimer = setInterval(sweepStaleCaches, SWEEP_INTERVAL_MS);
};

export const stopCacheSweep = () => {
    if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = null;
    }
};