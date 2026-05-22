import { socketEmit, getSocket } from "./socket";
import { ActionType, Avatar, BadgeLevel } from "@/types/user.types";
import { useEffect } from "react";

export type LeaderboardEntry = {
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

export async function get_user_action_reward(action: ActionType): Promise<{ xp: number; badge: BadgeLevel; bread: number; level: number; xpDelta: number; breadDelta: number; } | null> {
    try {
        const res = await socketEmit<{ reward: { xp: number; bread: number; badge: BadgeLevel; level: number; xpDelta: number; breadDelta: number; } }>("reward-action", { action });
        return res?.reward ?? null;
    } catch (err) {
        console.error("User action error:", err);
        return null;
    }
};

export async function get_leaderboard(limit = 10, offset = 0): Promise<LeaderboardEntry[] | null> {

    try {

        const res = await socketEmit<{ rankings: {
            rank: number;
            avatar: Avatar;
            first_name: string;
            last_name: string;
            profile_name: string;
            bread: number;
            xp: number;
            level: number;
            badge: BadgeLevel
        }[] }>("get-leaderboard", { limit, offset });

        return res?.rankings ?? null;

    } catch (err) {

        console.error("Leaderboard error:", err);
        return null;
    }

};

export const useLeaderboardListener = (setRankings: (rankings: LeaderboardEntry[]) => void) => {

    useEffect(() => {

        let mounted = true;

        const setup = async () => {

            const sock = await getSocket();
            if (!mounted) return;

            const handleUpdate = async  () => {
                const data = await get_leaderboard(10, 0);
                if (data) setRankings(data)
            };

            sock.on("leaderboard-updated", handleUpdate);

            return () => sock.off("leaderboard-updated", handleUpdate);

        };

        const cleanup = setup();

        return () => {

            mounted = false;
            cleanup.then((fn) => fn?.());
        };
    }, []);

};
