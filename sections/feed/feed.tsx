import FeedBar from "./feedBar";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  ListRenderItem,
} from "react-native";
import Reel from "./reel";
import { useTheme } from "@/provider/ThemeProvider";
import { useFeed } from "@/stores/useFeed";
import Tag, { EmptyTag } from "@/tags/Tag";
import { useReel } from "@/stores/useReel";
import { DietaryData, dietaryDescriptions, dietaryIcons } from "@/types";
import { filterFeedByFoodPreferences } from "../../utils/feedFilter";
import { useSettingsStore } from "@/stores/useSettings";
import { SpinningLogoImage } from "@/utils/Logo";
import { FeedCard, MinimumFeedCard } from "@/types/feed.types";

const HEIGHTS = {
    SMALL: 360,
    MEDIUM: 340,
    LARGE: 440,
    VIDEO: 475,
};

const { width, height } = Dimensions.get("window");

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
    setShowProfile?: (open: boolean) => void;
    setShowCook?: (post_id: number) => void;
    setShowSearch: (open: boolean) => void;
    isSearchOpen?: boolean;
    onChromeHidden?: (hidden: boolean) => void;
    chromeAnim: Animated.Value;
}> = ({ isFocused, isSearchOpen, setReelOpen, setShowProfile, setShowCook, setShowSearch ,onChromeHidden, chromeAnim }) => {

    const { colors } = useTheme();

    const posts = useFeed((s) => s.posts);
    const loadFeed = useFeed((s) => s.loadFeed);
    const loadNextFeed = useFeed((s) => s.loadNextFeed);
    const loadingFeed = useFeed((s) => s.loadingFeed);
    const loadingMoreFeed = useFeed((s) => s.loadingMoreFeed);
    const hasMoreFeed = useFeed((s) => s.hasMoreFeed);
    const activeReelPost = useFeed((s) => s.activeReelPost);
    const setActiveProfile = useFeed((s) => s.setActiveProfile);
    const setSelectedScope = useFeed((s) => s.setSelectedScope);

    const { isVisible, open, close } = useReel();  

    const isReelOpen = !!activeReelPost && isVisible;
    const isFeedBarHidden = isSearchOpen || isReelOpen;
    
    const foodPreferences = useSettingsStore((state) => state.settings.food);
    const filteredPosts = useMemo(() => {
        return filterFeedByFoodPreferences(posts, foodPreferences);
    }, [posts, foodPreferences]);

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

    useEffect(() => {
        if (isFocused === false) {
            close(() => setReelOpen?.(false));
            return;
        }
    }, [isFocused]);

    useEffect(() => {
        const ids = filteredPosts.map(p => p.post_id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicates.length) {
            console.log("Duplicate post_ids:", duplicates);
        }
    }, [filteredPosts]);

    const renderCard = useCallback(
        ({ item }: { item: FeedCard }) => {
            const post = item;
            return (
                <View style={{ marginBottom: 25 }}>
                    <Tag
                        card={post}
                        flipEnabled
                        height={getCardHeight(post)}
                        width={`100%`}
                        onPressInfo={() => setShowCook?.(post.post_id)}
                        onPressProfile={() => {
                            setActiveProfile(post.post_id);
                            setShowProfile?.(true);
                        }}
                        onPressMedia={async () => {
                            const fullPost = await useFeed.getState().loadPost(post.post_id);
                            if (!fullPost) return;
                            useReel.getState().open(fullPost as any, () => {
                                setReelOpen?.(true);
                            });
                        }}
                    />
                </View>
            );
        },
        [setShowCook, setActiveProfile, setShowProfile, setReelOpen]
    );

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
                    <FeedBar onShowSection={setShowSearch} />
                </Animated.View>
            )}
        
            <View
                style={{ flex: 1, gap: 1, backgroundColor: colors.background }}
                className="w-full flex-row"
            >
                {(loadingFeed && !filteredPosts?.length) ? (
                    renderSkeletons()
                ) : (
                    <>
                        <FlatList
                            data={leftPosts}
                            keyExtractor={(item) => item.post_id.toString()}
                            renderItem={renderCard}
                            showsVerticalScrollIndicator={false}
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingTop: 100, paddingHorizontal: 2.5 }}
                            onScroll={handleScroll("left")}
                            onScrollBeginDrag={handleScrollBeginDrag("left")}
                            scrollEventThrottle={16}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.7}
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
                            contentContainerStyle={{ paddingTop: 100, paddingHorizontal: 2.5 }}
                            onScroll={handleScroll("right")}
                            onScrollBeginDrag={handleScrollBeginDrag("right")}
                            scrollEventThrottle={16}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.7}
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

            <View style={[StyleSheet.absoluteFill]}>
                {activeReelPost && isVisible ? (
                    <Reel
                        initialPost={activeReelPost}
                        chromeAnim={chromeAnim}
                        onBack={() => close(() => setReelOpen?.(false))}
                    />
                ) : null}
            </View>
        </>
    );
};

export default Feed;