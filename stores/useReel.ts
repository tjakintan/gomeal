import { create } from "zustand";
import { useFeed } from "@/stores/useFeed";
import { Animated, Dimensions } from "react-native";
import { FeedActionCountsTypes, FeedActionType, ReelFeedCard } from "@/types/feed.types";
import { setFeedActionCount } from "@/api/feed.api";

const { width, height } = Dimensions.get("window");

type ReelState = {
    reels: ReelFeedCard[];
    history: ReelFeedCard[];
    loading: boolean;
    isVisible: boolean;
    isAnimating: boolean;
    slideX: Animated.Value;
    slideY: Animated.Value;
    feedBarY: Animated.Value;
    animationRef: Animated.CompositeAnimation | null;
    init: (initialPost: ReelFeedCard) => void;
    nextReel: () => void;
    prevReel: () => void;
    setReels: (freshReels: ReelFeedCard[]) => void;
    clear: () => void;
    open: (post: ReelFeedCard, onOpen?: () => void) => void;
    close: (onClose?: () => void) => void;
    updateCounts: (post_id: number, action: keyof FeedActionCountsTypes, increment?: number) => Promise<void>;
    toggleUserReelAction: (post_id: number, action: FeedActionType) => void;
};

export const useReel = create<ReelState>((set, get) => ({

    reels: [],
    history: [],
    loading: true,
    isVisible: false,
    isAnimating: false,
    slideX: new Animated.Value(width),
    slideY: new Animated.Value(height),
    feedBarY: new Animated.Value(0),
    animationRef: null,

    init: (initialPost) => {
        const existingReels = get().reels;
        const cachedFeedReels = useFeed.getState().reels ?? [];
        const localReels = cachedFeedReels.length ? cachedFeedReels : existingReels;

        set({
            loading: localReels.length <= 10,
            history: [],
            reels: [
                initialPost,
                ...localReels.filter((r) => r.post_id !== initialPost.post_id),
            ],
        });

        if (localReels.length > 10) {
            return;
        }

        setTimeout(() => {
            useFeed.getState()
                .loadReel(undefined, null, true, true)
                .then((freshReels) => {
                    const currentReels = get().reels;

                    if (!freshReels.length) {
                        set({ loading: false });
                        return;
                    }

                    const mergedReels = freshReels.map((r) => {
                        const existing = currentReels.find((e) => e.post_id === r.post_id);

                        return {
                            ...r,
                            user_actions: existing?.user_actions ?? r.user_actions ?? [],
                        };
                    });

                    set({
                        loading: false,
                        reels: [
                            initialPost,
                            ...mergedReels.filter((r) => r.post_id !== initialPost.post_id),
                        ],
                    });
                    
                })
                .catch((err) => {
                    console.error("Failed to hydrate reels:", err);
                    set({ loading: false });
                });
        }, 300);
    },

    setReels: (freshReels) => {
        set({
            loading: false,
            history: [],
            reels: freshReels,
        });
    },

    nextReel: () => {
        const { reels, history } = get();
        if (reels.length < 2) return;
        const [top, ...rest] = reels;
        set({ reels: rest, history: [...history, top] });
    },

    prevReel: () => {
        const { reels, history } = get();
        if (history.length === 0) return;
        const last = history[history.length - 1];
        set({ reels: [last, ...reels], history: history.slice(0, -1) });
    },

    clear: () => set({ history: [], loading: false }),

    open: (post, onOpen) => {
        useFeed.getState().setActiveReelPost(post);

        set({
            isVisible: true,
        });

        onOpen?.();
    },

    close: (onClose) => {
        set({
            isVisible: false,
        });

        useFeed.getState().setActiveReelPost(null);
        onClose?.();
    },

    updateCounts: async (post_id, action, increment = 1) => {

        const post = get().reels.find((r) => r.post_id === post_id); 
        if (!post) return;

        set((state) => ({ 
            
            reels: state.reels.map((r): ReelFeedCard => {

                if (r.post_id !== post_id) return r;
                const current = r.action_counts ?? {
                    post_love: 0,
                    post_cook: 0,
                    post_star: 0,
                    post_share: 0,
                };

                const updated = {
                    ...r,
                    action_counts: {
                        ...current,
                        [action]: (current[action] ?? 0) + increment,
                    },
                };

                useFeed.setState((feedState) => ({
                    reels: (feedState.reels ?? []).map((fr) =>
                        fr.post_id === post_id ? { ...fr, action_counts: updated.action_counts } : fr
                    ),
                }));

                return updated;

            }),
        }));

        try {

            const fresh_counts = await setFeedActionCount(post_id, action);

            set((state) => ({
                reels: state.reels.map((r) =>
                    r.post_id === post_id ? { ...r, action_counts: {...r.action_counts, ...fresh_counts} } : r
                ),
            }));

            useFeed.setState((feedState) => ({
                reels: (feedState.reels ?? []).map((fr) =>
                    fr.post_id === post_id ? { ...fr, action_counts: {...fr.action_counts, ...fresh_counts} } : fr
                ),
            }));

        } catch (err) {

            set((state) => ({
                reels: state.reels.map((r) =>
                    r.post_id === post_id ? { ...r, action_counts: {...r.action_counts, ...post.action_counts} } : r
                ),
            }));

            useFeed.setState((feedState) => ({
                reels: (feedState.reels ?? []).map((fr) =>
                    fr.post_id === post_id ? { ...fr, action_counts: {...fr.action_counts, ...post.action_counts} } : fr
                ),
            }));
            console.error("Failed to update action:", err);
        }
    },

    toggleUserReelAction: (post_id, action) => {

        set((state) => ({

            reels: state.reels.map((r) => {

                if (r.post_id !== post_id) return r;
                const actions = r.user_actions ?? [];
                const has = actions.includes(action);

                const updated = {
                    ...r,
                    user_actions: has
                        ? actions.filter((a) => a !== action)
                        : [...actions, action],
                };

                useFeed.setState((feedState) => ({
                    reels: (feedState.reels ?? []).map((fr) =>
                        fr.post_id === post_id ? { ...fr, user_actions: updated.user_actions } : fr
                    ),
                }));

                return updated;

            }),
        }));
    },

}));
