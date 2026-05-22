import { create } from "zustand";
import { useUser } from "@/stores/useUser";
import { ActionType, BadgeLevel } from "@/types/user.types";
import { get_user_action_reward } from "@/api/leaderboard.socket";

type showReward = {
    xpDelta: number;
    breadDelta: number;
    newLevel: number;
    newBadge?: BadgeLevel;
} | null;

type ShowRewardStore = {
    queue: showReward[];
    enqueueReward: (t: showReward) => void;
    dequeueReward: () => void;
};

export const useShowReward = create<ShowRewardStore>((set) => ({
    queue: [],
    enqueueReward: (t) => set((s) => ({ queue: [...s.queue, t] })),
    dequeueReward: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

export function useReward() {

    const updateUser = useUser((s) => s.updateUser);
    const user = useUser((s) => s.user);
    const enqueueReward = useShowReward((s) => s.enqueueReward);

    const reward = async (action: ActionType): Promise<showReward | null> => {

        if (!user) return null;

        const result = await get_user_action_reward(action);
        if (!result) return null;

        const { xp, bread, level, badge, xpDelta, breadDelta } = result;

        updateUser({ xp, bread, level, badge });
        enqueueReward({ xpDelta, breadDelta, newLevel: level, newBadge: badge });

        return { xpDelta, breadDelta, newLevel: level, newBadge: badge };

    };

    return { reward };
}

