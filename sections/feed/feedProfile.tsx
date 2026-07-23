import { formatCount, formatMonthDayYear } from "@/utils/time";
import { useFeed } from "@/stores/useFeed";
import { useTheme } from "@/provider/ThemeProvider";
import { Animated, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import { useCallback, useEffect, useRef, useState } from "react";
import { CookIcon, LikeIcon, SendIcon, LikeOutlineIcon, EmptyImageIcon, MoreIcon, EggsIcon, GridIcon, XIcon, BlockIcon, ReportIcon, WwwIcon, CalendarIcon } from "@/icons/Icon";
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

export const FEED_CARD_PROFILE_RADIUS = 40;

type FilterMeta = {
    icon: React.ComponentType<{ color: string; size: number }>;
    label: string;
    color: string;
    filter: keyof UserActionedPostsType;
};

const FILTERS: FilterMeta[] = [
    { icon: GridIcon, label: "Posts", color: "red", filter: "post_made"},
    { icon: LikeOutlineIcon, label: "Likes", color: "red", filter: "post_love"},
    { icon: CookIcon, label: "Cooks", color: "red", filter: "post_cook"},
];

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

    const [showMenu, setShowMenu] = useState(false);
    const [showMessagesSection, setShowMessagesSection] = useState(false);

    const slideMessageSectionIn = useSharedValue(500);

    // ---- bio -----------------------------
    const [readMoreBio, setReadMoreBio] = useState(false);
    const bio = activeProfile?.bio ?? "";
    const bioLimit = 80; 
    const isBioLong = bio.length > bioLimit;
    const shownBio = !readMoreBio && isBioLong ? bio.slice(0, bioLimit).trim() : bio;

    const handleSectionOpen = () => {
        setShowMessagesSection(true);
        sectionOpen?.(true);
        setShowMenu(false);
        slideMessageSectionIn.value = withSpring(0, { damping: 18, stiffness: 150 });
    };

    const handleSectionClose = () => {
        sectionOpen?.(false)
        slideMessageSectionIn.value = withTiming(500, { duration: 250 }, () => {
            runOnJS(setShowMessagesSection)(false); 
        });
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

            <View style={{height: 150}}>
                {activeProfile?.profile_img_url ? (
                    <Image
                        source={{uri: activeProfile?.profile_img_url}}
                        style={{ height: "100%", width: "100%", backgroundColor: colors.card }}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ height: "100%", width: "100%", backgroundColor: colors.card }} className="items-center justify-center">
                        <EmptyImageIcon color={colors.text} size={50} />
                    </View>
                )}

                {showCloseButton && (
                    <View
                        style={{
                            position: "absolute",
                            left: 15,
                            top: 15,
                            justifyContent: "center",
                            elevation: 20,
                            zIndex: 2,
                            borderRadius: 999,
                        }}
                    >
                        <Button
                            onPress={onClose} 
                            clearBackground
                        >
                            <XIcon color={colors.danger} size={25} />
                        </Button>
                    </View>
                )}

                <View
                    style={{
                        position: "absolute",
                        right: 15,
                        top: 15,
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 5,
                        borderRadius: 20,
                        alignItems: "flex-start",
                        zIndex: 5
                    }}
                >
                    {(activeProfile?.sub !== user?.sub) && showMessagesButton  && (
                        <Button onPress={handleSectionOpen} clearBackground>
                            <SendIcon color={"white"} size={22}/>
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
                            clearBackground
                        >
                            <MoreIcon color={"white"} size={15} rotate={90} />
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
                <FeedProfilePostsSection dark={dark} sectionOpen={showMessagesSection}/>
            </View>

            {showMessagesSection && activeProfile?.sub && (
                <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 6 }}>
                    <MessageScreen
                        post_id={activeProfile.post_id ?? undefined}
                        receiver_sub={activeProfile.sub}
                        onClose={handleSectionClose}
                        dark={dark}
                    />
                </View>
            )}

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
    const GRID_PADDING = 8;
    const GAP = 4;
    const itemSize = (screenWidth - GRID_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

    const handleRefresh = useCallback(async () => {
        if (!activeProfile?.sub) return;
        await setActiveProfile(undefined, activeProfile.sub);
    }, [activeProfile?.sub, setActiveProfile]);


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
                        paddingHorizontal: GRID_PADDING / 2,
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
                                    gap: GAP,
                                    marginBottom: GAP,
                                    justifyContent: isIncompleteRow ? "flex-start" : "space-between",
                                }}
                            >
                                {rowItems.map((post, colIndex) => (
                                    <MinTag
                                        key={colIndex}
                                        minCard={post}
                                        dark={dark}
                                        onPress={() => openCook(post.post_id)}
                                        style={{
                                            width: itemSize - GRID_PADDING,
                                            height: itemSize - GRID_PADDING,
                                        }}
                                        containerStyle={{ borderRadius: 10 }}
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
    const GRID_PADDING = 8;
    const GAP = 4;

    const itemSize = containerWidth
        ? (containerWidth - GRID_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
        : 0;

    return (
        <View
            style={StyleSheet.absoluteFillObject}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            {/* Cover */}
            <View
                style={{
                    height: 150,
                    backgroundColor: colors.card,
                }}
            >
                {bone("100%", 150, 0)}

                <View
                    style={{
                        position: "absolute",
                        left: 15,
                        top: 15,
                    }}
                >
                    {bone(35, 35, 999)}
                </View>

                <View
                    style={{
                        position: "absolute",
                        right: 15,
                        top: 15,
                        flexDirection: "row",
                        gap: 8,
                    }}
                >
                    {bone(35, 35, 999)}
                    {bone(35, 35, 999)}
                </View>
            </View>

            {/* Name + website + Stats */}
            <View
                style={{
                    flexDirection: "row",
                    paddingHorizontal: 15,
                    paddingTop: 10,
                    paddingBottom: 5,
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <View style={{ flex: 1, gap: 5 }}>
                    {bone("40%", 12, 5)}
                    {bone("55%", 14, 6)}
                    {bone("35%", 10, 4)}
                </View>

                <View
                    style={{
                        flexDirection: "row",
                        gap: 20,
                    }}
                >
                    {[1, 2].map((i) => (
                        <View
                            key={i}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            {bone(40, 40, 999)}
                            {bone(45, 18, 6)}
                        </View>
                    ))}
                </View>
            </View>

            {/* Bio */}
            <View
                style={{
                    paddingHorizontal: 15,
                    paddingBottom: 10,
                    gap: 6,
                }}
            >
                {bone("92%", 12, 4)}
                {bone("70%", 12, 4)}
            </View>

            {/* Filters */}
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
                        {bone(22, 22, 999)}
                        {bone(45, 10, 4)}
                    </View>
                ))}
            </View>

            {/* Grid */}
            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: GRID_PADDING / 2,
                    paddingTop: 10,
                    
                }}
            >
                {Array.from({ length: 4 }).map((_, row) => (
                    <View
                        key={row}
                        style={{
                            flexDirection: "row",
                            gap: GAP,
                            marginBottom: GAP,
                            justifyContent: "space-between"
                        }}
                    >
                        {[1, 2, 3].map((col) => (
                            <View key={col}>
                                {bone(
                                    itemSize - GRID_PADDING,
                                    itemSize - GRID_PADDING,
                                    10
                                )}
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};
export default FeedProfile;