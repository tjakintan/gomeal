import { create } from "zustand";
import { Ingredient } from "@/types";
import { FullPost } from "@/types/feed.types";
import { formatTimer } from "./useTimer";
import { useLiveActivity } from "@/stores/useLiveActivity";
import { useFeed } from "./useFeed";

type CookState = {
    loading: boolean;
    isOpen: boolean;
    opening: boolean;
    post_id: number | null;
    CookIngredients: Ingredient[];
    cookPost: FullPost | null;
    servings: number;
    cookTime: string;

    openCook: (postId: number) => void;
    closeCook: () => void;
    setCookPost: (cookPost: FullPost | null) => void;
    setIngredients: (ingredients: Ingredient[]) => void;
    clear: () => void;
};


const getTotalStepsTime = (cookPost: FullPost | null): string => {
    if (!cookPost?.steps?.length) return "";

    const totalSeconds = cookPost.steps.reduce((total, step) => {
        const timer = step.timer;

        return (
            total +
            (timer?.hours ?? 0) * 3600 +
            (timer?.minutes ?? 0) * 60 +
            (timer?.seconds ?? 0)
        );
    }, 0);

    return formatTimer({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    });
};

export const useCook = create<CookState>((set, get) => ({

    opening: false,
    loading: false,
    isOpen: false,
    post_id: null,
    CookIngredients: [],
    cookPost: null,
    servings: 1,
    cookTime: "",

    openCook: async (postId: number) => {
        const startActivity = useLiveActivity.getState().startActivity;
        const loadPost = useFeed.getState().loadPost;

        set({ isOpen: true, post_id: postId, loading: true });

        const { opening, isOpen } = get();
        set({ opening: true });

        if (opening) return;

        try {
            const post = await loadPost(postId);

            if (!post) {
                set({ loading: false });
                return;
            }

            set({
                cookPost: post,
                CookIngredients: post.ingredients ?? [],
                servings: post?.nutrition?.[0]?.servings ?? 1,
                cookTime: getTotalStepsTime(post),
                loading: false,
            });

            await startActivity(post);

        } catch (err) {
            set({ opening: false, loading: false});
            throw err
        } finally {
            set({ opening: false })
        }
    },

    closeCook: async () => {
        set({ opening: false })
        
        const postId = useCook.getState().post_id;

        const stopActivity = useLiveActivity.getState().stopActivity;

        set({
            isOpen: false,
            post_id: null,
            cookPost: null,
            CookIngredients: [],
            servings: 1,
            cookTime: "",
            loading: false,
        });

        if (postId !== null) {
            try {
                await stopActivity(String(postId));
            } catch (error) {
                console.warn("failed_to_stop_live_activity", error);
            }
        }
    },

    setCookPost: (cookPost) => {
        set((state) => {
            // ❗ ignore stale responses
            if (state.post_id !== cookPost?.post_id) {
                return state;
            }

            return {
                cookPost,
                post_id: cookPost?.post_id ?? null,
                CookIngredients: cookPost?.ingredients ?? [],
                servings: cookPost?.nutrition?.[0]?.servings ?? 1,
                cookTime: getTotalStepsTime(cookPost),
                loading: false,
            };
        });
    },

    setIngredients: (ingredients) => {
        set({ CookIngredients: ingredients });
    },

    clear: () => {
        set({
            isOpen: false,
            post_id: null,
            cookPost: null,
            CookIngredients: [],
            servings: 1,
            cookTime: "",
            loading: false,
        });
    },
}));

