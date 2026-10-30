import { Button } from "@/components/ButtonComponent";
import {
    ChefIcon,
    ShrimpIcon,
    FireIcon,
    BackIcon,
    HistoryIcon,
    MinusIcon,
    DropdownIcon,
    XIcon
} from "@/icons/Icon";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { SpinningLogoImage } from "@/utils/Logo";
import {
    AvatarRender,
    DynamicAvatarRenderer,
} from "@/dashboard/Avatar";
import { useFeed } from "@/stores/useFeed";
import { useSearch } from "@/stores/useSearch";
import { Input } from "@/components/InputComponent";
import { useReel } from "@/stores/useReel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { usePostHog } from "posthog-react-native";
import DiscoveryTag, { EmptyDiscoveryTag } from "@/tags/DiscoveryTag";
import FeedProfile from "./feedProfile";
import { isVideoPost, SearchFeedCard } from "@/types/feed.types";
import { GradientHeader } from "@/components/GradientComponent";
import { SectionHeader } from "@/components/SectionComponent";

import {
    addSearchHistory,
    getSearchHistory,
    removeSearchHistory,
    clearSearchHistory,
} from "@/utils/searchHistory";
import { openCookOverlay } from "../cook/openCook";
import { useActiveVideo } from "@/media/store/useActiveMedia";
import { useOverlay } from "@/stores/useOverlay";

type SearchMainScreenProps = {
    dark?: boolean;
    onClose: () => void;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

const MENU_HEIGHT = 60
const SCREEN_PADDING = 10;
const GRID_GAP = 10;
const SEARCH_GRID_GAP = 5;

const FOOD_COLUMNS = 1;
const SEARCH_COLUMNS = 1;
const USER_COLUMNS = 2;

const FOOD_CARD_WIDTH =
    (SCREEN_WIDTH -
        SCREEN_PADDING * 2 -
        GRID_GAP * (FOOD_COLUMNS - 1)) /
    FOOD_COLUMNS;

const USER_CARD_WIDTH =
    (SCREEN_WIDTH -
        SCREEN_PADDING * 2 -
        GRID_GAP * (USER_COLUMNS - 1)) /
    USER_COLUMNS;

const SEARCH_ITEM_SIZE =
    (SCREEN_WIDTH -
        SEARCH_GRID_GAP * (SEARCH_COLUMNS + 1)) /
    SEARCH_COLUMNS;

const SearchMainScreen: React.FC<SearchMainScreenProps> = ({
    dark,
    onClose,
}) => {

    const posthog = usePostHog();
    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const [search, setSearch] = useState("");
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    const openSlidingOverlay = useSlidingOverlay(
        (s) => s.openSlidingOverlay
    );

    const closeSlidingOverlay = useSlidingOverlay(
        (s) => s.closeSlidingOverlay
    );

    const insets = useSafeAreaInsets();

    const { setActiveProfile, clearActiveProfile } = useFeed();

    const {
        trending_post,
        trending_user,
        users,
        posts,
        loadSearch,
        loading,
        clearSearch,
    } = useSearch();

    const reelVisible = useReel((s) => s.isVisible);

    const slideDepth = useRef(useSlidingOverlay.getState().stack.length).current;
    const overlayDepth = useRef(useOverlay.getState().stack.length).current;

    const slideCovered = useSlidingOverlay((s) => s.stack.length > slideDepth);
    const overlayCovered = useOverlay((s) => s.stack.length > overlayDepth);

    const { activeId, viewportRef, itemRef, onScroll, refresh } = useActiveVideo({
        enabled: !reelVisible && !slideCovered && !overlayCovered,
    });

    const trimmedSearch = search.trim();
    const hasSearch = trimmedSearch.length >= 3;

    const hasUsers = !!users?.length;
    const hasPosts = !!posts?.length;
    const hasTrendingPosts = !!trending_post?.length;
    const hasTrendingUsers = !!trending_user?.length;

    const showUsers = hasSearch && hasUsers;
    const showPosts = hasSearch && !hasUsers && hasPosts;


    const [showAllSearchHistory, setShowAllSearchHistory] = useState(false);

    const visibleSearchHistory = showAllSearchHistory
        ? searchHistory
        : searchHistory.slice(0, 5);

    const submitSearch = async () => {
        const query = search.trim();

        if (query.length < 3) return;

        const updated = await addSearchHistory(query);

        setSearchHistory(updated);

        loadSearch(query);
    };

    const clearAllSearchHistory = async () => {
        await clearSearchHistory();

        setSearchHistory([]);
        setShowAllSearchHistory(false);
    };

    const removeFromSearchHistory = async (query: string) => {
        const updated = await removeSearchHistory(query);

        setSearchHistory(updated);
    };

    const selectSearchHistory = async (
        query: string
    ) => {
        setSearch(query);

        const updated = await addSearchHistory(query);

        setSearchHistory(updated);

        loadSearch(query);
    };

    const openPost = async (
        post: { post_id: number; info?: { dish_media_type?: string | null } | null },
        layout: any
    ) => {

        if (!isVideoPost(post)) {
            openCookOverlay(post.post_id, { dark });
            return;
        }

        const fullPost = await useFeed.getState().loadPost(post.post_id);
        if (!fullPost) return;

        useReel.getState().open(fullPost as any, layout, () => {});
    };

    const closeProfileSheet = () => {
        closeSlidingOverlay();
        clearActiveProfile();
    };

    useEffect(() => {
        getSearchHistory().then(setSearchHistory);
    }, []);

    useEffect(() => {
        const trimmed = search.trim();

        const fetchSearch = setTimeout(() => {
            if (trimmed.length < 3) {
                clearSearch();
                return;
            }

            posthog.capture("[Feed] => search_query_submitted", {
                query: trimmed,
                has_user_results: !!users?.length,
                has_post_results: !!posts?.length,
            });

            loadSearch(trimmed);
        }, 300);

        return () => clearTimeout(fetchSearch);
    }, [
        search,
        loadSearch,
        clearSearch,
        posthog,
        users?.length,
        posts?.length,
    ]);

    useEffect(() => { setTimeout(refresh, 100); }, [hasSearch, posts, trending_post]);

    return (
        <View
            style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                paddingTop: insets.top,
                backgroundColor: colors.background,
            }}
        >
            <View ref={viewportRef} collapsable={false} style={{ flex: 1 }}>

                {/* SEARCH BAR */}
                <GradientHeader
                    height={MENU_HEIGHT}
                    baseColor={colors.background}
                    style={{
                        paddingHorizontal: SCREEN_PADDING,
                        paddingBottom: 8,
                    }}
                >
                    <Input
                        dark={dark}
                        autoFocus
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search..."
                        containerStyle={{
                            borderRadius: 30,
                        }}
                        leftIcon={
                            <BackIcon color={colors.text} />
                        }
                        onIconPress={onClose}
                        onSubmitEditing={submitSearch}
                        iconBackground
                    />
                    
                </GradientHeader>

                {hasSearch ? (
                    <View style={{ flex: 1}}>
                        {showUsers ? (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={{
                                    paddingTop: MENU_HEIGHT
                                }}
                                contentContainerStyle={{
                                    paddingBottom:
                                        insets.bottom + 24,
                                    gap: 8,
                                }}
                                onScroll={onScroll}
                                scrollEventThrottle={16}
                                onMomentumScrollEnd={refresh}
                                onScrollEndDrag={refresh}
                            >
                                {users.map((user) => (
                                    <Button
                                        key={user.sub}
                                        style={{
                                            minHeight: 64,
                                            width: "100%",
                                            paddingHorizontal: 10,
                                            paddingVertical: 8,
                                            borderRadius: 16,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 10,
                                            overflow: "hidden",
                                        }}
                                        onPress={() => {
                                            setActiveProfile(
                                                undefined,
                                                user.sub
                                            );

                                            openSlidingOverlay(
                                                <FeedProfile
                                                    dark={dark}
                                                    onClose={
                                                        closeProfileSheet
                                                    }
                                                />
                                            );
                                        }}
                                    >
                                        <DynamicAvatarRenderer
                                            avatar={user.avatar}
                                            background
                                            showBadge
                                            badge={user.badge}
                                            size={30}
                                        />

                                        <View
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                            }}
                                        >
                                            <Text
                                                className={
                                                    textStyles.caption
                                                }
                                                numberOfLines={1}
                                            >
                                                {user.profile_name}
                                            </Text>

                                            <Text
                                                className={
                                                    textStyles.small
                                                }
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {user.firstName}{" "}
                                                {user.lastName}
                                            </Text>
                                        </View>
                                    </Button>
                                ))}
                            </ScrollView>
                        ) : showPosts ? (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={{
                                    paddingTop: MENU_HEIGHT
                                }}                               
                                contentContainerStyle={{
                                    paddingBottom: 125,
                                }}
                                onScroll={onScroll}
                                scrollEventThrottle={16}
                                onMomentumScrollEnd={refresh}
                                onScrollEndDrag={refresh}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        gap: SEARCH_GRID_GAP,
                                        paddingHorizontal:
                                            SEARCH_GRID_GAP,
                                    }}
                                >
                                    {posts.map((item) => {
                                        const post =
                                            item as SearchFeedCard;

                                        return (
                                            <TouchableOpacity
                                                key={post.post_id}
                                                activeOpacity={0.8}
                                                style={{
                                                    width: SEARCH_ITEM_SIZE,
                                                }}
                                            >
                                                <View
                                                    ref={isVideoPost(post) ? itemRef(post.post_id) : undefined}
                                                    collapsable={false}
                                                >
                                                    <DiscoveryTag
                                                        dark={dark}
                                                        card={post}
                                                        style={{
                                                            width: "100%",
                                                            borderRadius: 10,
                                                        }}
                                                        onPressInfo={() => openCookOverlay(post.post_id, { dark })}
                                                        onPressMedia={(layout) => openPost(post, layout)}
                                                        onPressProfile={() => {
                                                            setActiveProfile(
                                                                undefined,
                                                                post.user_sub
                                                            );

                                                            openSlidingOverlay(
                                                                <FeedProfile
                                                                    dark={dark}
                                                                    onClose={
                                                                        closeProfileSheet
                                                                    }
                                                                />
                                                            );
                                                        }}
                                                        isActive={activeId === post.post_id}
                                                    />
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        ) : loading ? (
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <SpinningLogoImage size={42} />
                            </View>
                        ) : null}
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingTop: MENU_HEIGHT,
                            paddingHorizontal: SCREEN_PADDING,
                            paddingBottom:
                                insets.bottom + 24,
                        }}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={refresh}
                        onScrollEndDrag={refresh}
                    >
                        <SectionHeader
                            dark={dark}
                            title="Recent"
                        />

                        {/* RECENT SEARCHES */}
                        {visibleSearchHistory.map((query) => (
                            <TouchableOpacity
                                key={query}
                                onPress={() => selectSearchHistory(query)}
                                style={{
                                    borderBottomWidth: 1,
                                    borderColor: colors.secondaryCard,
                                    flexDirection: "row",
                                    paddingVertical: 10,
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <View
                                    style={{
                                        gap: 10,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        flex: 1,
                                    }}
                                >
                                    <View
                                        style={{
                                            height: 35,
                                            width: 35,
                                            borderRadius: 999,
                                            backgroundColor: colors.secondaryCard,
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <HistoryIcon
                                            color={colors.background}
                                            size={25}
                                        />
                                    </View>

                                    <Text
                                        className={textStyles.body}
                                        numberOfLines={1}
                                        style={{ flex: 1 }}
                                    >
                                        {query}
                                    </Text>
                                </View>

                                <Button
                                    onPress={() => removeFromSearchHistory(query)}
                                    style={{ paddingHorizontal: 8 }}
                                >
                                    <MinusIcon
                                        color={colors.danger}
                                        size={20}
                                    />
                                </Button>
                            </TouchableOpacity>
                        ))}

                        {/* EXPAND / COLLAPSE / CLEAR ALL */}
                        {searchHistory.length > 0 && (
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    paddingVertical: 10,
                                    gap: 18,
                                }}
                            >
                                <View
                                    style={{
                                        flex: 1,
                                        alignItems: "center",
                                    }}
                                >
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (searchHistory.length < 5) return
                                                setShowAllSearchHistory((prev) => !prev)
                                            }}
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 4,
                                                opacity: searchHistory.length < 5 ? 0.6 : 1,
                                            }}
                                            disabled={searchHistory.length < 5}
                                        >
                                            <Text
                                                className={textStyles.body}
                                                style={{ color: colors.secondaryText }}
                                            >
                                                {showAllSearchHistory ? "Collapse" : "See more"}
                                            </Text>

                                            <DropdownIcon
                                                size={18}
                                                color={colors.secondaryText}
                                                rotate={showAllSearchHistory ? 180 : 0}
                                            />
                                        </TouchableOpacity>
                                </View>

                                <View
                                    style={{
                                        height: "100%",
                                        width: 1,
                                        backgroundColor: colors.secondaryCard
                                    }}
                                />

                                <View
                                    style={{
                                        flex: 1,
                                        alignItems: "center",
                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={clearAllSearchHistory}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <Text
                                            className={textStyles.body}
                                            style={{ color: colors.secondaryText }}
                                        >
                                            Clear all
                                        </Text>
                                        <XIcon color={colors.danger} size={18} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    
                        {/* TRENDING */}
                        <SectionHeader
                            dark={dark}
                            title="Trending"
                            subtitle="What's cooking right now?"
                            showDivider
                            leftIcon={<FireIcon size={26} />}
                        />

                        {/* FOOD */}
                        <View
                            style={{
                                width: "100%",
                                marginTop: 10,
                            }}
                        >
                            <SectionHeader
                                dark={dark}
                                title="Recipes"
                                showDivider
                                leftIcon={<ShrimpIcon size={24} />}
                            />

                            {hasTrendingPosts ? (
                                <View
                                    style={{
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        gap: GRID_GAP,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    {trending_post.map((post) => (
                                        <View
                                            key={post.post_id}
                                            style={{
                                                width: FOOD_CARD_WIDTH,
                                            }}
                                        >
                                            <View
                                                ref={isVideoPost(post) ? itemRef(post.post_id) : undefined}
                                                collapsable={false}
                                            >
                                                <DiscoveryTag
                                                    dark={dark}
                                                    card={post}
                                                    style={{
                                                        width: "100%",
                                                    }}
                                                    onPressInfo={() => openCookOverlay(post.post_id, { dark })}
                                                    onPressMedia={(layout) => openPost(post, layout)}
                                                    onPressProfile={() => {
                                                        setActiveProfile(
                                                            undefined,
                                                            post.user_sub
                                                        );

                                                        openSlidingOverlay(
                                                            <FeedProfile
                                                                dark={dark}
                                                                onClose={
                                                                    closeProfileSheet
                                                                }
                                                            />
                                                        );
                                                    }}
                                                    isActive={activeId === post.post_id}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : !hasSearch ? (
                                <EmptyPostSearch dark={dark} />
                            ) : null}
                        </View>

                        {/* CHEFS */}
                        <View
                            style={{
                                width: "100%",
                                marginTop: 10,
                            }}
                        >
                            <SectionHeader
                                dark={dark}
                                title="Chefs"
                                showDivider
                                leftIcon={<ChefIcon size={27} />}
                            />

                            {hasTrendingUsers ? (
                                <View
                                    style={{
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        gap: GRID_GAP,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    {trending_user.map((user) => (
                                        <View
                                            key={user.sub}
                                            style={{
                                                width: USER_CARD_WIDTH,
                                            }}
                                        >
                                            <Button
                                                onPress={() => {
                                                    setActiveProfile(
                                                        undefined,
                                                        user.sub
                                                    );

                                                    openSlidingOverlay(
                                                        <FeedProfile
                                                            dark={dark}
                                                            onClose={
                                                                closeProfileSheet
                                                            }
                                                        />
                                                    );
                                                }}
                                                style={{
                                                    width: "100%",
                                                    minHeight: 72,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 9,
                                                    borderRadius: 17,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 9,
                                                    overflow: "hidden",
                                                    borderWidth: 1,
                                                    borderColor:
                                                        colors.secondaryCard,
                                                    backgroundColor:
                                                        colors.card,
                                                }}
                                            >
                                                <DynamicAvatarRenderer
                                                    avatar={user.avatar}
                                                    level={user.level}
                                                    xp={user.xp}
                                                    badge={user.badge}
                                                    showBadge
                                                    showProgress
                                                    background
                                                    size={38}
                                                />

                                                <View
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Text
                                                        className={
                                                            textStyles.caption
                                                        }
                                                        numberOfLines={1}
                                                    >
                                                        {
                                                            user.profile_name
                                                        }
                                                    </Text>

                                                    <Text
                                                        className={
                                                            textStyles.small
                                                        }
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {
                                                            user.firstName
                                                        }{" "}
                                                        {
                                                            user.lastName
                                                        }
                                                    </Text>
                                                </View>
                                            </Button>
                                        </View>
                                    ))}
                                </View>
                            ) : !hasSearch ? (
                                <EmptyTrendUserSearchSection dark={dark} />
                            ) : null}
                        </View>
                    </ScrollView>
                )}
            </View>
        </View>
    );
};



export const EmptyPostSearch = ({ dark }: { dark?: boolean }) => {
    return (
        <View
            style={{
                width: "100%",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent : "space-between",
                gap: SEARCH_GRID_GAP,
                paddingHorizontal: SEARCH_GRID_GAP,
                paddingBottom: 24,
            }}
        >
            {Array.from({ length: 2 }).map((_, index) => (
                <EmptyDiscoveryTag
                    key={index}
                    dark={dark}
                    style={{
                        width: FOOD_CARD_WIDTH,
                        height: 250,
                        borderRadius: 12,
                    }}
                />
            ))}
        </View>
    );
};


export const EmptyTrendUserSearchSection = ({
    dark,
}: {
    dark?: boolean;
}) => {
    const { colors } = useTheme(dark ? "dark" : undefined);

    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [opacity]);

    const bone = (
        width: number | `${number}%`,
        height: number,
        radius = 8
    ) => (
        <Animated.View
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor: colors.secondaryCard,
                opacity,
            }}
        />
    );

    return (
        <View
            style={{
                width: "100%",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: GRID_GAP,
                alignItems: "flex-start",
            }}
        >
            {Array.from({ length: 2 }).map((_, index) => (
                <View
                    key={index}
                    style={{
                        width: USER_CARD_WIDTH,
                        minHeight: 72,
                        paddingHorizontal: 10,
                        paddingVertical: 9,
                        borderRadius: 17,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 9,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: colors.secondaryCard,
                        backgroundColor: colors.card,
                    }}
                >
                    {/* Avatar placeholder */}
                    {bone(38, 38, 999)}

                    {/* Profile name and full name */}
                    <View
                        style={{
                            flex: 1,
                            minWidth: 0,
                            gap: 7,
                        }}
                    >
                        {bone("85%", 11)}
                        {bone("65%", 9)}
                    </View>
                </View>
            ))}
        </View>
    );
};


export default SearchMainScreen;
