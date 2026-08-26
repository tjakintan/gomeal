import { formatCount, formatMonthDayYear } from "@/utils/time";
import { useFeed } from "@/stores/useFeed";
import { useTheme } from "@/provider/ThemeProvider";
import { Animated, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import { useCallback, useEffect, useRef, useState } from "react";
import { CookIcon, LikeIcon, SendIcon, LikeOutlineIcon, EmptyImageIcon, MoreIcon, EggsIcon, GridIcon, XIcon, BlockIcon, ReportIcon, WwwIcon, CalendarIcon, BackIcon } from "@/icons/Icon";
import { MinTag } from "@/tags/MinTag";
import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import MessageScreen from "../messages/messages";
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { useUser } from "@/stores/useUser";
import { useBlockUser, useReport } from "@/stores/useReport";
import { useCook } from "@/stores/useCook";
import * as WebBrowser from "expo-web-browser";
import { GradientHeader } from "@/components/GradientComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { useReel } from "@/stores/useReel";

export const FEED_CARD_PROFILE_RADIUS = 40;

type FilterMeta = {
    icon: React.ComponentType<{ color: string; size: number }>;
    label: string;
    color: string;
    filter: keyof UserActionedPostsType;
};

const FeedProfile: React.FC<{
    dark?: boolean;
    showMore?: boolean;
    showCloseButton?: boolean;
    showMessagesButton?: boolean;
    sectionOpen?: (open: boolean) => void;
    onClose?: () => void;
}> = ({ dark, sectionOpen, onClose, showMore = true, showCloseButton = true, showMessagesButton = true }) => {

    const { user } = useUser();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { reportTarget, loadingReport } = useReport();
    const { blockUser, loadingBlockUser } = useBlockUser();
    const { activeProfile, removeProfile, loadingProfile, clearActiveProfile } = useFeed(); 
    const { openSlidingOverlay, closeSlidingOverlay } = useSlidingOverlay();

    const insets = useSafeAreaInsets();

    const [showMenu, setShowMenu] = useState(false);

    // ---- bio -----------------------------
    const [readMoreBio, setReadMoreBio] = useState(false);
    const bio = activeProfile?.bio ?? "";
    const bioLimit = 80; 
    const isBioLong = bio.length > bioLimit;
    const shownBio = !readMoreBio && isBioLong ? bio.slice(0, bioLimit).trim() : bio;

    const handleSectionOpen = () => {
        sectionOpen?.(true);
        if (activeProfile) {
            openSlidingOverlay(
                <MessageScreen
                    post_id={activeProfile.post_id ?? undefined}
                    receiver_sub={activeProfile.sub}
                    onClose={handleSectionClose}
                    dark={dark}
                    onAllowToOpenProfile={false}
                />
            )
        }
    };

    const handleSectionClose = () => {
        sectionOpen?.(false)
        closeSlidingOverlay();
    };

    // ----- website -----------------------------
    const openWebsite = async (url?: string | null) => {
        if (!url) return;
        const formatted = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        try {
            await WebBrowser.openBrowserAsync(formatted);
        } catch (err) {
            console.error("Failed to open website:", err);
        }
    };

    if (loadingProfile) {
        return <EmptyFeedProfile dark={dark} />;
    };

    return (
        <View style={StyleSheet.absoluteFillObject} className="">

            {showMenu && (
                <Pressable
                    onPress={() => setShowMenu(false)}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 4,
                    }}
                />
            )}

            <View style={{height: 200}}>
                {activeProfile?.profile_img_url ? (
                    <Image
                        source={{uri: activeProfile?.profile_img_url}}
                        style={{ height: "100%", width: "100%", backgroundColor: colors.card }}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ height: "100%", width: "100%", backgroundColor: colors.secondaryCard }} className="items-center justify-center">
                        <EmptyImageIcon color={colors.text} size={50} />
                    </View>
                )}

                {showCloseButton && (
                    <View
                        style={{
                            position: "absolute",
                            left: 15,
                            top: insets.top,
                            justifyContent: "center",
                            elevation: 20,
                            zIndex: 2,
                            borderRadius: 999,
                        }}
                    >
                        <Button
                            onPress={() => {closeSlidingOverlay(), onClose?.(), clearActiveProfile() }} 
                            style={{
                                backgroundColor: colors.card,
                            }}
                        >
                            <BackIcon color={colors.text} size={25} />
                        </Button>
                    </View>
                )}

                <View
                    style={{
                        position: "absolute",
                        right: 15,
                        top: insets.top,
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 5,
                        borderRadius: 20,
                        alignItems: "flex-start",
                        zIndex: 5
                    }}
                >
                    {(activeProfile?.sub !== user?.sub) && showMessagesButton  && (
                        <Button onPress={handleSectionOpen} style={{ backgroundColor: colors.card }}>
                            <SendIcon color={colors.text} size={25}/>
                        </Button>
                    )}
                    {showMore && (
                        <ExpandingButton
                            expanded={showMenu}
                            onPress={() => setShowMenu(true)}
                            borderRadius={20}
                            expandedChildren={
                                <View
                                    style={{
                                        gap: 5,
                                        overflow: "hidden",
                                        minWidth: 150,
                                    }}
                                >
                                    <Button
                                        onPress={async () => {
                                            if (!activeProfile?.sub || loadingReport) return;
                                            await reportTarget(activeProfile.sub, "user");
                                            removeProfile(activeProfile.sub);
                                        }}
                                        disabled={loadingReport}
                                        style={{
                                            width: "auto",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            backgroundColor: colors.background
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 16 }}>Report</Text>
                                        {loadingReport ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <ReportIcon color={colors.text} size={18} />
                                        )}
                                    </Button>

                                    <Button
                                        onPress={async () => {
                                            if (!activeProfile?.sub || loadingBlockUser) return;

                                            await blockUser(activeProfile.sub);
                                            removeProfile(activeProfile.sub);
                                            setShowMenu(false);
                                            clearActiveProfile();
                                        }}
                                        disabled={loadingBlockUser}
                                        style={{
                                            width: "auto",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            backgroundColor: colors.background
                                        }}
                                    >
                                        <Text style={{ color: colors.danger, fontSize: 16 }}>Block</Text>
                                        {loadingBlockUser ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <BlockIcon color={colors.danger} size={18} />
                                        )}
                                    </Button>
                                </View>
                            }
                            style={{
                                backgroundColor: colors.card,
                            }}
                        >
                            <MoreIcon color={colors.text} size={15} rotate={90} />
                        </ExpandingButton>
                    )}
                </View>

            </View>

            <View
                style={{
                    gap: 10,
                    flexDirection: "column",
                    padding: 10,
                    width: "100%",
                }}
            >
                <View
                    style={{  
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-start",
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            gap: 15,
                            flexDirection: "column",
                            minWidth: 0,
                        }}
                    >
                        <View
                            style={{
                                gap: 1,
                                flexDirection: "column"
                            }}
                        >
                            <Text
                                style={{ fontSize: 13 }}
                                className={textStyles.small}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {activeProfile?.firstName}
                            </Text>

                            <Text
                                className={textStyles.caption}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {activeProfile?.lastName}
                            </Text>
                                                        
                            <View 
                                style={{
                                gap: 3,
                                alignItems: "center",
                                flexDirection: "row"
                                }}
                            >
                                <CalendarIcon color={colors.text} size={10} />
                                <Text className={textStyles.small}>
                                    Joined on: {activeProfile?.date_joined
                                    ? formatMonthDayYear(activeProfile?.date_joined)
                                    : "Unknown"}
                                </Text>
                            </View>

                        </View>

                        {activeProfile?.website && (
                            <Button
                                onPress={() => openWebsite(activeProfile?.website)}
                                disabled={!activeProfile?.website}
                                style={{
                                    gap: 5,
                                    flexDirection: "row",
                                    padding: 0,
                                    justifyContent: "flex-start"
                                }}
                            >
                                <WwwIcon color={colors.text} size={10}/>
                                <Text
                                    className={textStyles.small}
                                    numberOfLines={1}
                                    style={{
                                        color: colors.button,
                                        fontWeight: "400"
                                    }}
                                    ellipsizeMode="tail"
                                >
                                    {activeProfile?.website}
                                </Text>
                            </Button>
                        )}

                    </View>

                    <View
                        style={{ height: 70, gap: 15, flexShrink: 0 }}
                        className="flex-row items-start justify-center"
                    >
                        <View className="flex-row items-end gap-2">
                            <View
                                style={{
                                    height: 40,
                                    width: 40,
                                    borderRadius: 999,
                                    backgroundColor: colors.card,
                                }}
                                className="items-center justify-center"
                            >
                                <EggsIcon size={20} />
                            </View>
                            <Text className={textStyles.section}>
                                {formatCount(activeProfile?.num_of_cooks ?? 0)}
                            </Text>
                            <Text style={{ fontWeight: "400"}} className={textStyles.small}>
                                cooks
                            </Text>
                        </View>

                        <View className="flex-row items-end gap-2">
                            <View
                                style={{
                                    height: 40,
                                    width: 40,
                                    borderRadius: 999,
                                    backgroundColor: colors.card,
                                }}
                                className="items-center justify-center"
                            >
                                <LikeIcon size={20} />
                            </View>
                            <Text className={textStyles.section}>
                                {formatCount(activeProfile?.num_of_likes ?? 0)}
                            </Text>
                            <Text style={{ fontWeight: "400"}} className={textStyles.small}>
                                likes
                            </Text>
                        </View>
                    </View>
                </View>

                {activeProfile?.bio && (
                    <View>
                        <Pressable onPress={() => isBioLong && setReadMoreBio((prev) => !prev)}>
                            <Text
                                className={textStyles.body}
                                numberOfLines={readMoreBio ? undefined : 2}
                                style={{ fontSize: 13, fontWeight: "100" }}
                                ellipsizeMode="tail"
                            >
                                {shownBio}
                                {isBioLong && (
                                    <Text
                                        className={textStyles.small}
                                        style={{ color: colors.button, fontWeight: "700" }}
                                    >
                                        {readMoreBio ? "  Show less" : "  Read more..."}
                                    </Text>
                                )}
                            </Text>
                        </Pressable>
                    </View>
                )}

            </View>

            <View style={{ flex: 1}}>
                <FeedProfilePostsSection dark={dark} />
            </View>

        </View>
    );
};

const FeedProfilePostsSection: React.FC<{ dark?: boolean; sectionOpen?: boolean }> = ({ dark, sectionOpen }) => {

    const { activeProfile, setActiveProfile, loadingProfile } = useFeed();
    const { openCook } = useCook();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const [active, setActive] = useState<keyof UserActionedPostsType>("post_made");
    const posts: MinimumFeedCard[] = activeProfile?.user_posts?.[active] ?? [];

    const screenWidth = Dimensions.get("window").width;
    const NUM_COLUMNS = 3;
    const itemSize = (screenWidth ) / NUM_COLUMNS;

    const handleRefresh = useCallback(async () => {
        if (!activeProfile?.sub) return;
        await setActiveProfile(undefined, activeProfile.sub);
    }, [activeProfile?.sub, setActiveProfile]);

    const FILTERS: FilterMeta[] = [
        { icon: GridIcon, label: "Posts", color: "red", filter: "post_made"},
        { icon: LikeOutlineIcon, label: "Likes", color: "red", filter: "post_love"},
        { icon: CookIcon, label: "Cooks", color: "red", filter: "post_cook"},
    ];

    return (
        <View style={StyleSheet.absoluteFillObject}>
            {/* Filter tabs — unchanged */}
            <GradientHeader
                baseColor={colors.background}
                contentStyle={{
                    flexDirection: "row",
                    height: 60,
                    paddingVertical: 5,
                    alignItems: "center",
                    borderTopWidth: 1,
                    borderColor: colors.secondaryCard,
                }}
                zIndex={sectionOpen ? 0 : 1}
            >
                {FILTERS.map((meta, index, array) => {
                    const Icon = meta.icon;
                    const isActive = active === meta.filter;
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
                                onPress={() => setActive(meta.filter)}
                                style={{
                                    height: 50,
                                    width: 65,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "transparent",
                                }}
                            >
                                <View className="items-center gap-1">
                                    <Icon color={isActive ? colors.button : colors.text} size={20} />
                                    <Text
                                        className={textStyles.small}
                                        style={{
                                            color: isActive ? colors.button : colors.secondaryText,
                                            textTransform: "capitalize",
                                        }}
                                    >
                                        {meta.label}
                                    </Text>
                                </View>
                            </Button>
                            {index < array.length - 1 && (
                                <View
                                    pointerEvents="none"
                                    style={{
                                        position: "absolute",
                                        right: 0,
                                        height: 29,
                                        width: 2,
                                        backgroundColor: colors.secondaryCard,
                                        opacity: 0.75,
                                    }}
                                />
                            )}
                        </View>
                    );
                })}
            </GradientHeader>

            {/* Grid */}
            {posts.length > 0 ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    onScrollEndDrag={(e) => {
                        if (e.nativeEvent.contentOffset.y < -20) {
                            handleRefresh();
                        }
                    }}
                    contentContainerStyle={{
                        paddingTop: 60
                    }}
                >
                    {/* Chunk posts into rows of 3 */}
                    {Array.from({ length: Math.ceil(posts.length / NUM_COLUMNS) }).map((_, rowIndex) => {
                        const rowItems = posts.slice(rowIndex * NUM_COLUMNS, rowIndex * NUM_COLUMNS + NUM_COLUMNS);
                        const isIncompleteRow = rowItems.length < NUM_COLUMNS;

                        return (
                            <View
                                key={rowIndex}
                                style={{
                                    flexDirection: "row",
                                    justifyContent: isIncompleteRow ? "flex-start" : "space-between",
                                }}
                            >
                                {rowItems.map((post, colIndex) => (
                                    <MinTag
                                        key={colIndex}
                                        minCard={post}
                                        dark={dark}
                                        onPress={async (layout) => {
                                            const fullPost = await useFeed
                                                .getState()
                                                .loadPost(post.post_id);

                                            if (!fullPost) return;

                                            useReel.getState().open(
                                                fullPost as any,
                                                layout,
                                                () => {
                                                    // callback
                                                }
                                            );
                                        }}
                                        style={{
                                            width: itemSize,
                                            height: itemSize,
                                        }}
                                        containerStyle={{ borderRadius: 0 }}
                                    />
                                ))}
                            </View>
                        );
                    })}
                </ScrollView>
            ) : (
                <ScrollView  
                    onScrollEndDrag={(e) => {
                        if (e.nativeEvent.contentOffset.y < -20) {
                            handleRefresh();
                        }
                    }}
                    contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                >
                    <Text className={textStyles.caption}>None yet</Text>
                </ScrollView>
            )}
        </View>
    );
};

const EmptyFeedProfile = ({ dark }: { dark?: boolean }) => {
    const { colors } = useTheme(dark ? "dark" : undefined);
    const insets = useSafeAreaInsets();

    const [containerWidth, setContainerWidth] = useState(0);
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const anim = Animated.loop(
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

        anim.start();
        return () => anim.stop();
    }, []);

    const bone = (
        width: number | `${number}%`,
        height: number,
        radius = 8,
    ) => (
        <Animated.View
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor: colors.card,
                opacity,
            }}
        />
    );

    const NUM_COLUMNS = 3;
    const itemSize = containerWidth
        ? containerWidth / NUM_COLUMNS
        : 0;

    return (
        <View
            style={StyleSheet.absoluteFillObject}
            onLayout={(e) =>
                setContainerWidth(e.nativeEvent.layout.width)
            }
        >
            {/* Cover */}
            <View style={{ height: 200 }}>
                {bone("100%", 200, 0)}

                <View
                    style={{
                        position: "absolute",
                        left: 15,
                        top: insets.top,
                    }}
                >
                    {bone(42, 42, 999)}
                </View>

                <View
                    style={{
                        position: "absolute",
                        right: 15,
                        top: insets.top,
                        flexDirection: "row",
                        gap: 6,
                    }}
                >
                    {bone(42, 42, 999)}
                    {bone(42, 42, 999)}
                </View>
            </View>

            {/* Profile information */}
            <View
                style={{
                    padding: 10,
                    gap: 12,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            gap: 12,
                        }}
                    >
                        <View style={{ gap: 4 }}>
                            {bone("38%", 13)}
                            {bone("28%", 12)}
                            {bone("45%", 10)}
                        </View>

                        {bone("55%", 11)}
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            gap: 18,
                        }}
                    >
                        {[1, 2].map((i) => (
                            <View
                                key={i}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "flex-end",
                                    gap: 8,
                                }}
                            >
                                {bone(40, 40, 999)}

                                <View
                                    style={{
                                        gap: 4,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    {bone(30, 16)}
                                    {bone(24, 10)}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ gap: 6 }}>
                    {bone("92%", 12)}
                    {bone("82%", 12)}
                </View>
            </View>

            {/* Filter tabs */}
            <View
                style={{
                    height: 60,
                    flexDirection: "row",
                    borderTopWidth: 1,
                    borderColor: colors.secondaryCard,
                }}
            >
                {[1, 2, 3].map((i) => (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        {bone(20, 20, 999)}
                        {bone(42, 10)}
                    </View>
                ))}
            </View>

            {/* Grid */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{}}
            >
                {Array.from({ length: 6 }).map((_, row) => (
                    <View
                        key={row}
                        style={{
                            flexDirection: "row",
                        }}
                    >
                        {[1, 2, 3].map((col) => (
                            <View key={col}>
                                {bone(itemSize, itemSize, 0)}
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

export default FeedProfile;