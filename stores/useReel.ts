import { create } from "zustand";
import { useFeed } from "@/stores/useFeed";
import { Animated, Dimensions } from "react-native";
import { isVideoPost, ReelFeedCard } from "@/types/feed.types";
import { createContext, useContext } from "react";

const { width, height } = Dimensions.get("window");

const VISIBLE = new Animated.Value(1);

export const ReelChromeContext = createContext<Animated.AnimatedNode>(VISIBLE);
export const useReelChrome = () => useContext(ReelChromeContext);

type ReelOrigin = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type PostId = string | number;

type ReelState = {
    origin: ReelOrigin | null;
    originPostId: number | null,

    // Identity + order only. Post data lives exclusively in
    // useFeed.posts — there is exactly one array of post objects in the
    // whole app now, so nothing can desync from anything else.
    order: PostId[];
    history: PostId[];

    isScrubbing: boolean;
    isDismissing: boolean;
    videoRect: { top: number; height: number } | null;

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
    open: (
        post: ReelFeedCard,
        origin?: ReelOrigin,
        onOpen?: () => void
    ) => void;
    close: (onClose?: () => void) => void;
};

const getPostById = (id: PostId): ReelFeedCard | null =>
    (useFeed.getState().posts.find((p) => p.post_id === id) as ReelFeedCard | undefined) ?? null;

export const useReel = create<ReelState>((set, get) => ({

    origin: null,
    originPostId: null,

    isScrubbing: false,
    isDismissing: false,
    videoRect: null,

    order: [],
    history: [],
    loading: true,
    isVisible: false,
    isAnimating: false,
    slideX: new Animated.Value(width),
    slideY: new Animated.Value(height),
    feedBarY: new Animated.Value(0),
    animationRef: null,

    init: (initialPost) => {
        const existingOrder = get().order;
        const cachedPosts = (useFeed.getState().posts ?? []).filter(isVideoPost);;
        const localIds = cachedPosts.length
            ? cachedPosts.map((p) => p.post_id)
            : existingOrder;

        useFeed.getState().upsertPosts([initialPost]);

        set({
            loading: localIds.length <= 10,
            history: [],
            order: [
                initialPost.post_id,
                ...localIds.filter((id) => id !== initialPost.post_id),
            ],
        });

        useFeed.getState().setActiveReelPost(initialPost);

        if (localIds.length > 10) {
            return;
        }

        setTimeout(() => {

            useFeed.getState()
                .loadReel(undefined, null, true, true)
                .then((freshReels) => {
                    const videos = freshReels.filter(isVideoPost);     
                    
                    if (!videos.length) {
                        set({ loading: false });
                        return;
                    }

                    const freshIds = videos.map((r) => r.post_id);

                    set({
                        loading: false,
                        order: [
                            initialPost.post_id,
                            ...freshIds.filter((id) => id !== initialPost.post_id),
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
        const videos = freshReels.filter(isVideoPost);                
        useFeed.getState().upsertPosts(videos);

        set({
            loading: false,
            history: [],
            order: videos.map((r) => r.post_id),
        });

        useFeed.getState().setActiveReelPost(videos[0] ?? null);
    },

    nextReel: () => {
        const { order, history } = get();
        if (order.length < 2) return;

        const [top, ...rest] = order;
        set({ order: rest, history: [...history, top] });

        useFeed.getState().setActiveReelPost(getPostById(rest[0]));
    },

    prevReel: () => {
        const { order, history } = get();
        if (history.length === 0) return;

        const lastId = history[history.length - 1];
        set({ order: [lastId, ...order], history: history.slice(0, -1) });

        useFeed.getState().setActiveReelPost(getPostById(lastId));
    },

    clear: () => set({ history: [], loading: false }),

    open: (post, origin, onOpen) => {
        useFeed.getState().upsertPosts([post]);
        useFeed.getState().setActiveReelPost(post);

        set({
            isVisible: true,
            origin: origin ?? {
                x: 0,
                y: 0,
                width,
                height,
            },
            originPostId: post.post_id, 
        });

        onOpen?.();
    },

    close: (onClose) => {
        const { origin, slideX, slideY, feedBarY } = get();

        if (origin) {
            slideX.setValue(
                origin.x - (width - origin.width) / 2
            );

            slideY.setValue(
                origin.y - (height - origin.height) / 2
            );

            feedBarY.setValue(0);
        }

        set({
            isVisible: false,
            origin: null,
            originPostId: null,
            isScrubbing: false,
            isDismissing: false,
            videoRect: null,
        });

        useFeed.getState().setActiveReelPost(null);

        onClose?.();
    },

}));

// Live post data for a given id — always resolves against the single
// posts array, so it reflects any in-flight optimistic toggle immediately.
export const useReelPost = (post_id: PostId) =>
    useFeed((state) => state.posts.find((p) => p.post_id === post_id));

export const useCurrentReelPost = () => {
    const topId = useReel((s) => s.order[0]);
    return useFeed((state) =>
        topId == null ? null : state.posts.find((p) => p.post_id === topId) ?? null
    );
};