import FeedBar from "./feedBar";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    Text,
    View,
    FlatList,
    RefreshControl,
    Animated,
    Dimensions,
} from "react-native";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { useFeed, useFeedPlayback } from "@/stores/useFeed";
import Tag, { EmptyTag } from "@/tags/Tag";
import { useReel } from "@/stores/useReel";;
import { filterFeedByFoodPreferences } from "../../utils/feedFilter";
import { useSettingsStore } from "@/stores/useSettings";
import { FeedCard } from "@/types/feed.types";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { CookMainScreen } from "../cook";
import FeedProfile from "./feedProfile";
import { useCook } from "@/stores/useCook";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { openCookOverlay } from "../cook/openCook";
import { useOverlay } from "@/stores/useOverlay";
import { Inbox } from "../messages/inbox";

const LIST_TOP_PAD = 120;   // your contentContainerStyle paddingTop
const CARD_GAP = 25;        // the marginBottom wrapper in renderCard
const VIEW_MIN = 0.5;       // must be at least 50% visible to play
const SWITCH_MARGIN = 0.15; // a challenger must beat the current video by this much

const HEIGHTS = {
    SMALL: 360,
    MEDIUM: 340,
    LARGE: 440,
    VIDEO: 475,
};

const skeletons = Array.from({ length: 6 });

const renderSkeletons = () => (
    <View style={{ paddingTop: 100}} className="flex-1 flex-row">
        <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
            {skeletons
                .filter((_, i) => i % 2 === 0)
                .map((_, i) => (
                    <EmptyTag key={`left-${i}`} delay={i * 120} />
                ))}
        </View>

        <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
            {skeletons
                .filter((_, i) => i % 2 !== 0)
                .map((_, i) => (
                    <EmptyTag key={`right-${i}`} delay={i * 120 + 60} />
                ))}
        </View>
    </View>
);

const Feed: React.FC<{
    isFocused?: boolean; 
    setReelOpen?: (open: boolean) => void;
    isSearchOpen?: boolean;
    onChromeHidden?: (hidden: boolean) => void;
    chromeAnim: Animated.Value;
}> = ({ isFocused, isSearchOpen, setReelOpen,onChromeHidden, chromeAnim }) => {

    const posthog = usePostHog();
    const isFeedBarHidden = isSearchOpen;

    const { colors } = useTheme();

    const posts = useFeed((s) => s.posts);
    const visiblePostIds = useFeed((s) => s.visiblePostIds);
    const loadingFeed = useFeed((s) => s.loadingFeed);
    const loadingMoreFeed = useFeed((s) => s.loadingMoreFeed);
    const hasMoreFeed = useFeed((s) => s.hasMoreFeed);

    const loadFeed = useFeed((s) => s.loadFeed);
    const loadNextFeed = useFeed((s) => s.loadNextFeed);
    const setActiveProfile = useFeed((s) => s.setActiveProfile);
    const setSelectedScope = useFeed((s) => s.setSelectedScope);

    const reelVisible = useReel((s) => s.isVisible);
    const isOpen = useOverlay((s) => s.isOpen);
    const isSlideOpen = useSlidingOverlay((s) => s.isOpen);
    
    const foodPreferences = useSettingsStore((state) => state.settings.food);

    const seenRef = useRef<Set<number>>(new Set());

    // overlays
    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    
    // Resolve the ordered list of visible post IDs into their corresponding
    // post objects. A Map provides O(1) lookup while preserving the order
    // defined by visiblePostIds. Any IDs that no longer exist in posts are
    // discarded.
    const visiblePosts = useMemo(() => {
        const byId = new Map(posts.map((p) => [String(p.post_id), p]));

        return visiblePostIds
            .map((id) => byId.get(id))
            .filter((p): p is FeedCard => !!p);
    }, [posts, visiblePostIds]);


    // Remove duplicate posts before passing the data to the feed columns.
    // Each post_id must appear only once so that FlatList receives unique
    // keys and React can maintain stable component identity across updates.
    const uniqueVisiblePosts = useMemo(() => {
        const seen = new Set<number>();

        return visiblePosts.filter((post) => {
            if (seen.has(post.post_id)) {
                return false;
            }

            seen.add(post.post_id);
            return true;
        });
    }, [visiblePosts]);


    // Apply the user's food preferences after resolving and deduplicating
    // the visible posts. This ensures filtering operates on a clean,
    // unique collection of feed cards.
    const filteredPosts = useMemo(() => {
        return filterFeedByFoodPreferences(uniqueVisiblePosts, foodPreferences);
    }, [uniqueVisiblePosts, foodPreferences]);


    // Split into two independent lists. Alternating by index is enough here —
    // since the columns no longer need to stay height-synced (each scrolls on
    // its own), there's no reason to do masonry height-balancing anymore.
    const leftPosts = useMemo(
        () => filteredPosts.filter((_, i) => i % 2 === 0) as FeedCard[],
        [filteredPosts]
    );
    const rightPosts = useMemo(
        () => filteredPosts.filter((_, i) => i % 2 !== 0) as FeedCard[],
        [filteredPosts]
    );


    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 60,
        minimumViewTime: 1000,
    }).current;


    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: any[] }) => {
            for (const { item } of viewableItems) {
                if (seenRef.current.has(item.post_id)) continue;
                seenRef.current.add(item.post_id);
                useFeed.getState().markPostSeen(item.post_id);
            }
        }
    ).current;


    const getCardHeight = (post: FeedCard) => {
        if (post.info?.dish_media_type === "video") {
            return HEIGHTS.VIDEO;
        }
        const variant = post.post_id % 3;
        switch (variant) {
            case 0:
                return HEIGHTS.SMALL;
            case 1:
                return HEIGHTS.MEDIUM;
            default:
                return HEIGHTS.LARGE;
        }
    };


    const layouts = useMemo(() => {
        const build = (posts: FeedCard[]) => {
            let y = LIST_TOP_PAD;
            const out: { id: number; top: number; h: number }[] = [];
            for (const p of posts) {
                const h = getCardHeight(p);
                if (p.info?.dish_media_type === "video") out.push({ id: p.post_id, top: y, h });
                y += h + CARD_GAP;
            }
            return out;
        };
        return { left: build(leftPosts), right: build(rightPosts) };
    }, [leftPosts, rightPosts]);


    const layoutsRef = useRef(layouts);
    layoutsRef.current = layouts;
    const scrollY = useRef({ left: 0, right: 0 }).current;
    const viewH = useRef(Dimensions.get("window").height);


    const updateActive = useCallback(() => {
        const { activeId, setActiveId } = useFeedPlayback.getState();
        let best: { id: number; f: number } | null = null;
        let currentFraction: number | null = null;

        for (const col of ["left", "right"] as const) {
            for (const { id, top, h } of layoutsRef.current[col]) {
                const t = top - scrollY[col];
                const overlap = Math.min(t + h, viewH.current) - Math.max(t, 0);
                const f = Math.max(0, overlap) / h;
                if (id === activeId) currentFraction = f;
                if (f >= VIEW_MIN && (!best || f > best.f)) best = { id, f };
            }
        }

        let next = activeId;
        if (currentFraction !== null && currentFraction >= VIEW_MIN) {
            // keep the current video unless a challenger is clearly more visible
            if (best && best.id !== activeId && best.f > currentFraction + SWITCH_MARGIN) next = best.id;
        } else {
            next = best ? best.id : null;
        }
        if (next !== activeId) setActiveId(next);
    }, []);


    useEffect(() => { updateActive(); }, [layouts, updateActive]);


    const [refreshing, setRefreshing] = useState(false);


    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            setSelectedScope(null);
            await loadFeed(undefined, null, true, true);
        } finally {
            setRefreshing(false);
        }
    };


    const handleLoadMore = () => {
        if (!loadingMoreFeed && hasMoreFeed && filteredPosts.length > 0) {
            loadNextFeed();
        }
    };

    const feedBarTranslateY = chromeAnim?.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -80],
    });


    const chromeHidden = useRef(false);
    // Anchor-based hysteresis, same idea as before. Now driven by whichever
    // column the user happens to be touching at a given moment — that's fine,
    // since only one column receives scroll events per gesture (each FlatList
    // is its own scroll responder). A column switch mid-gesture just resets
    // the anchor to that column's current offset, which is a non-issue in
    // practice since a single touch can't be on two lists at once.
    const anchorY = useRef(0);
    const HIDE_THRESHOLD = 20;


    // Which column is currently being touched. Only that column's scroll
    // events are allowed to drive the chrome hide/show state — otherwise two
    // independently-scrolling FlatLists fight over the same anchor/hidden
    // refs and flip chromeHidden back and forth on every frame, which is what
    // caused the animation glitch upstream in AuthenticatedApp.
    const activeColumn = useRef<"left" | "right" | null>(null);


    const handleScroll = useCallback((column: "left" | "right") => (e: any) => {

        scrollY[column] = e.nativeEvent.contentOffset.y;
    
        updateActive();
    
        if (activeColumn.current !== column) return;

        const offsetY = e.nativeEvent.contentOffset.y;

        if (offsetY < 0) {
            anchorY.current = 0;
            return;
        }

        const delta = offsetY - anchorY.current;

        if (!chromeHidden.current && delta > HIDE_THRESHOLD) {
            chromeHidden.current = true;
            anchorY.current = offsetY;
            onChromeHidden?.(true);

            return;
        }

        if (chromeHidden.current && delta < -HIDE_THRESHOLD) {
            chromeHidden.current = false;
            anchorY.current = offsetY;
            onChromeHidden?.(false);

            return;
        }

        if (!chromeHidden.current && delta < 0) {
            anchorY.current = offsetY;
        }
        if (chromeHidden.current && delta > 0) {
            anchorY.current = offsetY;
        }
    }, [onChromeHidden]);


    const handleScrollBeginDrag = useCallback((column: "left" | "right") => () => {
        activeColumn.current = column;
    }, []);

    const renderCard = useCallback(
        ({ item }: { item: FeedCard }) => {
            const post = item;
            return (
                <View style={{ marginBottom: 25 }}>
                    <Tag
                        card={post}
                        height={getCardHeight(post)}
                        width={`100%`}
                        onPressInfo={() => {
                            posthog.capture("[Feed] => post_opened", { post_id: post.post_id });
                            openCookOverlay(post.post_id);
                        }}
                        onPressProfile={() => {
                            setActiveProfile(post.post_id);
                            openSlidingOverlay(
                                <FeedProfile
                                    onClose={() => closeSlidingOverlay()}
                                />
                            )
                        }}
                        onPressMedia={async (layout) => {
                            if (post.info?.dish_media_type !== "video") {
                                openCookOverlay(post.post_id);  
                                return;
                            }
                            const fullPost = await useFeed.getState().loadPost(post.post_id);
                            if (!fullPost) return;
                            posthog.capture("[Feed] => reel_opened", { post_id: post.post_id });
                            useReel.getState().open(
                                fullPost as any,
                                layout,
                                () => {
                                    setReelOpen?.(true);
                                }
                            );

                        }}
                    />
                </View>
            );
        },
        [setActiveProfile, setReelOpen]
    );

    useEffect(() => {
        useFeedPlayback.getState().setPaused(!isFocused || reelVisible || isOpen || isSlideOpen);
    }, [isFocused, reelVisible]);
    
    return (
        <>
            {!isFeedBarHidden && (
                <Animated.View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 5,
                        transform: [{ translateY: feedBarTranslateY }],
                    }}
                >
                    <FeedBar />
                </Animated.View>
            )}

            <View
                onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; updateActive(); }}
                style={{ flex: 1, gap: 1, backgroundColor: colors.background }}
                className="w-full flex-row"
            >
                {filteredPosts.length === 0 ? (
                    renderSkeletons()
                ) : (
                    <>
                        <FlatList
                            data={leftPosts}
                            keyExtractor={(item) => item.post_id.toString()}
                            renderItem={renderCard}
                            showsVerticalScrollIndicator={false}
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingTop: 120, paddingHorizontal: 2.5 }}
                            onScroll={handleScroll("left")}
                            onScrollBeginDrag={handleScrollBeginDrag("left")}
                            scrollEventThrottle={16}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.7}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={handleRefresh}
                                    tintColor={colors.background === "#000" ? "#fff" : undefined}
                                />
                            }
                        />
                        <FlatList
                            data={rightPosts}
                            keyExtractor={(item) => item.post_id.toString()}
                            renderItem={renderCard}
                            showsVerticalScrollIndicator={false}
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingTop: 120, paddingHorizontal: 2.5 }}
                            onScroll={handleScroll("right")}
                            onScrollBeginDrag={handleScrollBeginDrag("right")}
                            scrollEventThrottle={16}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.7}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={handleRefresh}
                                />
                            }
                        />
                    </>
                )}
            </View>

        </>
    );
};

export default Feed;