import { useFeed } from "@/stores/useFeed";
import { useTheme } from "@/provider/ThemeProvider";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import { isVideoPost, MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import { useCallback, useRef, useState } from "react";
import { CookIcon, LikeOutlineIcon, GridIcon, GridActiveIcon, LikeOutlineActiveIcon, CookActiveIcon } from "@/icons/Icon";
import { EmptyMinTag, MinTag } from "@/tags/MinTag";
import { Button } from "@/components/ButtonComponent";
import { GradientHeader } from "@/components/GradientComponent";
import { openCookOverlay } from "../cook/openCook";
import { useReel } from "@/stores/useReel";

import type { SharedValue } from "react-native-reanimated";
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
    useAnimatedReaction,
    interpolateColor,
} from "react-native-reanimated";
import Animated, {
    useAnimatedRef,
    useAnimatedScrollHandler,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { useOverlay } from "@/stores/useOverlay";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { useActiveVideo } from "@/media/store/useActiveMedia";

const COLOR_END = 0.6;

const DECK_DEPTH = 5;
const PEEK = 12;
const SCALE_STEP = 0.03;
const OPACITY_STEP = 0.15;
const CARD_HEIGHT = 125;
const CARD_RADIUS = 14;
const DECK_SIDE = 5;
const LIST_GAP = 12;
const ROW = CARD_HEIGHT + LIST_GAP;

type FilterMeta = {
    icon: React.ComponentType<{ color: string; size: number }>;
    activeIcon: React.ComponentType<{ color: string; size: number }>;
    label: string;
    color: string;
    filter: keyof UserActionedPostsType;
};

const TabContent: React.FC<{
    Icon: React.ComponentType<{ color: string; size: number }>;
    label: string;
    count?: number;
    from: string;
    to: string;
    progress: SharedValue<number>;
    textClass: string;
}> = ({ Icon, label, count, from, to, progress, textClass }) => {

    const toStyle = useAnimatedStyle(() => ({
        opacity: clamp01(progress.value / COLOR_END),
    }));

    const render = (color: string) => (
        <View className="items-center gap-1">
            <Icon color={color} size={20} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                {count != null && (
                    <Text
                        className={textClass}
                        style={{ color, fontSize: 10 }}
                    >
                        {count}
                    </Text>
                )}
                <Text
                    className={textClass}
                    style={{ color, textTransform: "capitalize", fontSize: 10 }}
                >
                    {label}
                </Text>
            </View>
        </View>
    );

    return (
        <View>
            {render(from)}
            <Reanimated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, toStyle]}
            >
                {render(to)}
            </Reanimated.View>
        </View>
    );
};

const clamp01 = (v: number) => {
    "worklet";
    return Math.min(Math.max(v, 0), 1);
};

const DeckItem: React.FC<{
    slot: number;
    progress: SharedValue<number>;
    width: number;
    topInset: number;
    bg: string;
    interactive: boolean;
    children: React.ReactNode;
}> = ({ slot, progress, width, topInset, bg, interactive, children }) => {

    const animatedStyle = useAnimatedStyle(() => {
        const p = clamp01(progress.value);
        const l = slot;

        const stackY = -l * PEEK;
        const stackScale = 1 - l * SCALE_STEP;

        const stackOpacity =
            slot < DECK_DEPTH
                ? 1 - l * OPACITY_STEP
                : 0;

        const listY = slot * ROW - topInset;

        return {
            opacity: stackOpacity + (1 - stackOpacity) * p,
            transform: [
                { translateX: 0 },
                { translateY: stackY + (listY - stackY) * p },
                { scale: stackScale + (1 - stackScale) * p },
                { rotate: "0deg" },
            ],
        };
    });

    return (
        <Reanimated.View
            pointerEvents={interactive || slot === 0 ? "auto" : "none"}
            style={[
                {
                    position: "absolute",
                    top: topInset,
                    left: DECK_SIDE,
                    right: DECK_SIDE,
                    height: CARD_HEIGHT,
                    borderRadius: CARD_RADIUS,
                    backgroundColor: bg,
                    zIndex: Math.max(0, DECK_DEPTH - slot),
                    elevation: Math.max(0, DECK_DEPTH - slot),
                },
                animatedStyle,
            ]}
        >
            {children}
        </Reanimated.View>
    );
};


const PostDeck: React.FC<{
    posts: MinimumFeedCard[];
    dark?: boolean;
    progress: SharedValue<number>;
    label: string;
    renderPost: (post: MinimumFeedCard) => React.ReactNode;
}> = ({ posts, dark, progress, label, renderPost }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const n = posts.length;
    const depth = Math.min(DECK_DEPTH, n);
    const topInset = (depth - 1) * PEEK;
    const deckWidth = Dimensions.get("window").width - DECK_SIDE * 2;

    const [expanded, setExpanded] = useState(false); 
    const [showAll, setShowAll] = useState(false);  

    useAnimatedReaction(
        () => progress.value,
        (p, prev) => {
            const pp = prev ?? 0;
            if (p > 0.5 !== pp > 0.5) runOnJS(setExpanded)(p > 0.5);
            if (p > 0.01 !== pp > 0.01) runOnJS(setShowAll)(p > 0.01);
        }
    );

    const counterStyle = useAnimatedStyle(() => ({ opacity: 1 - clamp01(progress.value) }));

    return (
        <View style={{ height: Math.max(topInset + CARD_HEIGHT + 30, n * ROW) }}>
            {posts.map((post, i) => {
                const slot = i;

                if (slot > DECK_DEPTH && !showAll) return null;

                return (
                    <DeckItem
                        key={post.post_id}
                        slot={slot}
                        progress={progress}
                        width={deckWidth}
                        topInset={topInset}
                        bg={colors.background}
                        interactive={expanded}
                    >
                        {renderPost(post)}
                    </DeckItem>
                );
            })}
        </View>
    );
};


const FeedProfilePosts: React.FC<{
    dark?: boolean;
    sectionOpen?: boolean;
    progress: SharedValue<number>;
    onFilterLayout?: (height: number) => void;
    identityColor?: string;
}> = ({ dark, sectionOpen, progress, onFilterLayout, identityColor }) => {
                
    const activeProfile = useFeed((s) => s.activeProfile);

    const insets = useSafeAreaInsets();
    
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const [active, setActive] = useState<keyof UserActionedPostsType>("post_made");

    const [width, setWidth] = useState(0);

    const [expanded, setExpanded] = useState(false);

    const pagerRef = useAnimatedRef<Animated.ScrollView>();
    const scrollX = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler((e) => {
        scrollX.value = e.contentOffset.x;
    });

    const FILTERS: FilterMeta[] = [
        { icon: GridIcon, activeIcon: GridActiveIcon, label: "Book", color: "red", filter: "post_made" },
        { icon: LikeOutlineIcon, activeIcon: LikeOutlineActiveIcon, label: "Liked", color: "red", filter: "post_love" },
        { icon: CookIcon, activeIcon: CookActiveIcon, label: "Cooked", color: "red", filter: "post_cook" },
    ];

    const filterPillStyle = useAnimatedStyle(() => {
        const p = clamp01(progress.value);

        return {
            backgroundColor: interpolateColor(
                p,
                [0, 1],
                ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.4)"]
            ),
            borderRadius: 18 * p,
            marginHorizontal: 12 * p,
            marginTop: 4 * p,
            overflow: "hidden",
        };
    });

    const scrollRefs = useRef<Record<string, any>>({});

    const goTo = (index: number) => {
        setActive(FILTERS[index].filter);
        pagerRef.current?.scrollTo({ x: index * width, animated: true });
    };

    const to = identityColor ?? colors.text;
    const from = colors.text;

    const resetScrolls = useCallback(() => {
        Object.values(scrollRefs.current).forEach((r) =>
            r?.scrollTo?.({ y: 0, animated: false })
        );
    }, []);

    useAnimatedReaction(
        () => progress.value,
        (p, prev) => {
            if (p <= 0.01 && (prev ?? 0) > 0.01) runOnJS(resetScrolls)();
        }
    );

    useAnimatedReaction(
        () => progress.value > 0.5,
        (now, prev) => { if (now !== prev) runOnJS(setExpanded)(now); }
    );

    const reelVisible = useReel((s) => s.isVisible);
    const slideDepth = useRef(useSlidingOverlay.getState().stack.length).current;
    const overlayDepth = useRef(useOverlay.getState().stack.length).current;

    const slideCovered = useSlidingOverlay((s) => s.stack.length > slideDepth);
    const overlayCovered = useOverlay((s) => s.stack.length > overlayDepth);

    const activePosts = activeProfile?.user_posts?.[active] ?? [];

    const { activeId, viewportRef, itemRef, onScroll: onListScroll, refresh } = useActiveVideo({
        enabled: !reelVisible && !slideCovered && !overlayCovered,
        eligible: (id) => expanded || id === activePosts[0]?.post_id,
    });

    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        const next = FILTERS[index]?.filter;
        if (next && next !== active) setActive(next);
    };

    const [pillWidth, setPillWidth] = useState(0);

    const TAB_W = pillWidth / FILTERS.length;
    const INDICATOR_W = 65;

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX:
                    (scrollX.value / (width || 1)) * TAB_W + (TAB_W - INDICATOR_W) / 2,
            },
        ],
        backgroundColor: interpolateColor(
            clamp01(progress.value / COLOR_END),
            [0, 1],
            [from, to]
        ),
    }));

    const renderPost = (post: MinimumFeedCard) => (
        <View ref={isVideoPost(post) ? itemRef(post.post_id) : undefined} collapsable={false}>
            <MinTag
                minCard={post}
                dark={dark}
                style={{ width: "100%", borderRadius: CARD_RADIUS }}
                onPressInfo={() => openCookOverlay(post.post_id)}
                onPressMedia={async (layout) => {
                    if (post?.info?.dish_media_type == "image") {
                        openCookOverlay(post.post_id);
                        return;
                    }
                    const fullPost = await useFeed.getState().loadPost(post.post_id);
                    if (!fullPost) return;

                    useReel.getState().open(fullPost as any, layout, () => {});
                }}
                isActive={activeId === post.post_id}
            />
        </View>
    );

    return (
        <View
            ref={viewportRef}
            collapsable={false}
            style={{ flex: 1 }}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
            <View
                onLayout={(e) => {
                    const height = e.nativeEvent.layout.height;
                    onFilterLayout?.(height);
                }}
            >
                <GradientHeader
                    baseColor={colors.background}
                    fadeSteps={[0, 0]}
                    contentStyle={{
                        height: 68,
                        paddingBottom: 10,
                        justifyContent: "center",
                    }}
                    zIndex={sectionOpen ? 0 : 1}
                >
                    <Reanimated.View
                        onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}
                        style={[
                            {
                                flexDirection: "row",
                                alignItems: "center",
                                height: 54,
                                backgroundColor: colors.secondaryCard,
                                borderRadius: 18,
                                marginHorizontal: 12,
                                overflow: "hidden",
                            },
                            filterPillStyle,
                        ]}
                    >
                        {FILTERS.map((meta, index, array) => {
                            const isActive = active === meta.filter;
                            const count = activeProfile?.user_posts?.[meta.filter]?.length ?? 0;

                            return (
                                <View
                                    key={meta.filter}
                                    style={{
                                        flex: 1,
                                        height: "100%",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Button
                                        onPress={() => goTo(index)}
                                        style={{
                                            height: 50,
                                            width: 65,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: "transparent",
                                        }}
                                    >
                                        <TabContent
                                            Icon={isActive ? meta.activeIcon : meta.icon}
                                            count={isActive ? count : undefined}
                                            label={meta.label}
                                            from={from}
                                            to={to}
                                            progress={progress}
                                            textClass={textStyles.body}
                                        />
                                    </Button>

                                    {index < array.length - 1 && (
                                        <View
                                            pointerEvents="none"
                                            style={{
                                                position: "absolute",
                                                right: 0,
                                                height: 24,
                                                width: 1,
                                                backgroundColor: colors.secondaryText,
                                                opacity: 0.2,
                                            }}
                                        />
                                    )}
                                </View>
                            );
                        })}

                        <View
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 1,
                                backgroundColor: colors.secondaryText,
                                opacity: 0.15,
                            }}
                        />

                        <Animated.View
                            pointerEvents="none"
                            style={[
                                {
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    height: 2,
                                    width: INDICATOR_W,
                                    backgroundColor: colors.text,
                                },
                                indicatorStyle,
                            ]}
                        />
                    </Reanimated.View>
                </GradientHeader>
            </View>

            {width > 0 && (
                <Animated.ScrollView
                    ref={pagerRef}
                    horizontal
                    pagingEnabled
                    style={{ flex: 1}}
                    contentContainerStyle={{ flexGrow: 1 }}
                    bounces={false}
                    showsHorizontalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={onMomentumEnd}
                >
                    {FILTERS.map((f) => {
                        const posts: MinimumFeedCard[] =
                            activeProfile?.user_posts?.[f.filter] ?? [];

                        return (
                            <View
                                key={f.filter}
                                style={{ width, flex: 1 }}
                            >
                                {posts.length > 0 ? (
                                    <BottomSheetScrollView
                                        ref={(r) => { scrollRefs.current[f.filter] = r; }}
                                        style={{ flex: 1 }}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{
                                            paddingTop: 68,
                                            paddingBottom: insets.bottom,
                                            flexGrow: 1,
                                        }}
                                        onScroll={onListScroll}
                                        onScrollEndDrag={refresh}
                                    >
                                        <PostDeck
                                            posts={posts}
                                            dark={dark}
                                            renderPost={renderPost}
                                            progress={progress}
                                            label={f.label}
                                        />
                                    </BottomSheetScrollView>
                                ) : (
                                    <BottomSheetScrollView
                                        style={{ flex: 1 }}
                                        contentContainerStyle={{
                                            flex: 1,
                                            alignItems: "center",
                                            justifyContent: "flex-start",
                                            paddingTop: 68,
                                        }}
                                    >
                                        <EmptyMinTag dark={dark} />
                                    </BottomSheetScrollView>
                                )}
                            </View>
                        );
                    })}
                </Animated.ScrollView>
            )}
        </View>
    );
};


export default FeedProfilePosts;