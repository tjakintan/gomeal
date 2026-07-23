import { socketEmit, getSocket } from "./socket";
import { ActionType, Avatar, BadgeLevel } from "@/types/user.types";
import { useEffect } from "react";

export type LeaderboardEntry = {
    sub: string;
    rank: number;
    avatar: Avatar;
    first_name: string;
    last_name: string;
    profile_name: string;
    xp: number;
    level: number;
    badge: BadgeLevel;
    bread: number;
};

export type LeaderboardPage = {
    rankings: LeaderboardEntry[];
    nextCursor: number;
    hasMore: boolean;
};

export async function get_user_action_reward(action: ActionType): Promise<{ xp: number; badge: BadgeLevel; bread: number; level: number; xpDelta: number; breadDelta: number; } | null> {
    try {
        const res = await socketEmit<{ reward: { xp: number; bread: number; badge: BadgeLevel; level: number; xpDelta: number; breadDelta: number; } }>("reward-action", { action });
        return res?.reward ?? null;
    } catch (err) {
        console.error("User action error:", err);
        return null;
    }
};

export async function get_leaderboard(limit = 10, cursor = 0): Promise<LeaderboardPage | null> {
    try {
        const res = await socketEmit<LeaderboardPage>("get-leaderboard", { limit, cursor });
        return res ?? null;
    } catch (err) {
        console.error("Leaderboard error:", err);
        return null;
    }
}

export const useLeaderboardListener = (onUpdate: () => void) => {
    useEffect(() => {
        let mounted = true;
        const setup = async () => {
            const sock = await getSocket();
            if (!mounted) return;
            sock.on("leaderboard-updated", onUpdate);
            return () => sock.off("leaderboard-updated", onUpdate);
        };
        const cleanup = setup();
        return () => {
            mounted = false;
            cleanup.then((fn) => fn?.());
        };
    }, [onUpdate]);
};