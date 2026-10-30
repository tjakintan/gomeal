import { formatCount, formatMonthDayYear } from "@/utils/time";
import { useFeed } from "@/stores/useFeed";
import { useTheme } from "@/provider/ThemeProvider";
import { Animated, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CookIcon, LikeIcon, SendIcon, LikeOutlineIcon, EmptyImageIcon, MoreIcon, CookPotIcon, GridIcon, XIcon, BlockIcon, ReportIcon, WwwIcon, CalendarIcon, BackIcon, StarIcon, GridActiveIcon, LikeOutlineActiveIcon, CookActiveIcon } from "@/icons/Icon";
import { MinTag } from "@/tags/MinTag";
import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import MessageScreen from "../messages/messages";
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Extrapolation, interpolate, useAnimatedReaction } from "react-native-reanimated";
import { useUser } from "@/stores/useUser";
import { useBlockUser, useReport } from "@/stores/useReport";
import { useCook } from "@/stores/useCook";
import * as WebBrowser from "expo-web-browser";
import { GradientHeader, withOpacity } from "@/components/GradientComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { CookMainScreen } from "../cook";
import { limitLength } from "@/utils/text";
import { usePostHog } from "posthog-react-native";
import { FontWeight } from "@shopify/react-native-skia";
import { useBanner } from "@/stores/useBanner";
import Report from "@/components/ReportComponent";
import Block from "@/components/BlockComponent";
import { useOverlay } from "@/stores/useOverlay";
import { openCookOverlay } from "../cook/openCook";
import MediaPreview from "@/media/MediaPreview";
import { useReel } from "@/stores/useReel";
import { LinearGradient } from "expo-linear-gradient";
import { DynamicAvatarRenderer } from "@/dashboard/Avatar";
import FeedProfilePosts from "./feedProfilePost";
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { useProfileImageTextColor } from "@/stores/useTheme";
import * as Clipboard from "expo-clipboard";
import ProfileStats from "@/components/ProfileStats";
import { Bread, XPIcon, LevelIcon } from "@/dashboard/bread";

export const FEED_CARD_PROFILE_RADIUS = 40;
const HEADER_H = 50;
const COLLAPSED_PCT = 0.35;


const StatPill: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => (
    <View
        style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.35)",
        }}
    >
        {icon}
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{formatCount(value)}</Text>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>{label}</Text>
    </View>
);


const FeedProfile: React.FC<{
    dark?: boolean;
    showMore?: boolean;
    showCloseButton?: boolean;
    showMessagesButton?: boolean;
    sectionOpen?: (open: boolean) => void;
    onClose?: () => void;
}> = ({ dark, sectionOpen, onClose, showMore = true, showCloseButton = true, showMessagesButton = true }) => {

    const user = useUser((s) => s.user);

    const posthog = usePostHog();

    const banner = useBanner();

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const loadingBlockUser = useBlockUser((state) => state.loadingBlockUser);
    const blockedUsers = useBlockUser((state) => state.blockedUsers);

    const activeProfile = useFeed((state) => state.activeProfile);
    const removeProfile = useFeed((state) => state.removeProfile);
    const loadingProfile = useFeed((state) => state.loadingProfile);
    const clearActiveProfile = useFeed((state) => state.clearActiveProfile);

    const openOverlay = useOverlay((s) => s.openOverlay);
    const closeOverlay = useOverlay((s) => s.closeOverlay);
    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    const insets = useSafeAreaInsets();

    const [showMenu, setShowMenu] = useState(false);

    const [showHeroGradient, setShowHeroGradient] = useState(true);

    const openStats = () => {
        if (!activeProfile) return;

        openOverlay({
            custom: <ProfileStats dark={dark} profile={activeProfile} />,
        });
    };

    const openReport = () => {
        if (!activeProfile?.sub) return;

        setShowMenu(false);

        openOverlay({
            custom: (
                <Report
                    dark={dark}
                    profile_name={activeProfile.profile_name}
                    target_user_sub={activeProfile.sub}
                    target_id={activeProfile.sub}
                    target_type="user"
                    onReported={() => {
                        posthog.capture("[Trust] => user_reported", {
                            target_sub: activeProfile.sub,
                        });

                        removeProfile(activeProfile.sub);
                        clearActiveProfile();
                        closeOverlay();
                    }}
                />
            )
        });
    };

    const openBlock = () => {
        if (!activeProfile?.sub) return;

        setShowMenu(false);

        openOverlay({
            custom: (
                <Block
                    dark={dark}
                    profile_name={activeProfile.profile_name}
                    target_user_sub={activeProfile.sub}
                    onBlocked={() => {
                        posthog.capture("[Trust] => user_blocked", {
                            target_sub: activeProfile.sub,
                        });

                        removeProfile(activeProfile.sub);
                        clearActiveProfile();
                        closeOverlay();
                    }}
                    onCancel={closeOverlay}
                />
            ),
        });
    };

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

    const openProfileImage = () => {
        if (!activeProfile?.profile_img_url) return;

        setShowMenu(false);

        openOverlay(
            undefined,
            <MediaPreview
                dark={dark}
                media={[
                    {
                        uri: activeProfile.profile_img_url,
                        mediaType: "image",
                    },
                ]}
            />
        );
    };

    // sheet
    const sheetProgress = useSharedValue(0);

    const [rootH, setRootH] = useState(0);

    const [filterHeight, setFilterHeight] = useState(0);

    const snapPoints = useMemo(
        () => (rootH ? [(rootH * COLLAPSED_PCT), rootH - (insets.top + HEADER_H)] : []),
        [rootH, insets.top]
    );

    const sheetPosition = useSharedValue(0); 
    const snap0 = rootH * COLLAPSED_PCT;
    const collapsedTopY = rootH - snap0;

    const updateHeroGradient = useCallback((visible: boolean) => {
        setShowHeroGradient(visible);
    }, []);

    useAnimatedReaction(
        () => ({
            progress: sheetProgress.value,
            position: sheetPosition.value,
        }),
        (current, previous) => {
            if (
                previous &&
                (
                    Math.abs(current.progress - previous.progress) > 0.001 ||
                    Math.abs(current.position - previous.position) > 1
                )
            ) {
                runOnJS(updateHeroGradient)(false);
            }
        }
    );

    const heroStyle = useAnimatedStyle(() => {
        const progress = sheetProgress.value;

        const collapsedHeroHeight = rootH - snap0 + filterHeight;

        return {
            height: interpolate(
                progress,
                [0, 1],
                [collapsedHeroHeight, rootH],
                Extrapolation.CLAMP
            ),
        };
    });

    const identityStyle = useAnimatedStyle(() => {
        const y = sheetPosition.value;
        return {
            transform: [{ translateY: y > 0 ? Math.min(y - collapsedTopY, 0) : 0 }],
            opacity: interpolate(sheetProgress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
        };
    });

    const hasProfileImage = !!activeProfile?.profile_img_url;

    const imageTextColor = useProfileImageTextColor(
        activeProfile?.profile_img_url
    );
    const identityTextColor = hasProfileImage ? imageTextColor : colors.text;

    useEffect(() => {
        if (!activeProfile?.sub) return;

        const isBlocked = blockedUsers.some(
            (user) => user.sub === activeProfile.sub
        );

        if (!isBlocked) return;

        closeSlidingOverlay();
        clearActiveProfile();
        onClose?.();
    }, [
        activeProfile?.sub,
        blockedUsers,
        closeSlidingOverlay,
        clearActiveProfile,
        onClose,
    ]);

    if (loadingProfile) {
        return <EmptyFeedProfile dark={dark} />;
    };

    return (

        <View style={StyleSheet.absoluteFillObject} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>

            {showMenu && (
                <Pressable
                    onPress={() => setShowMenu(false)}
                    style={{ ...StyleSheet.absoluteFillObject, zIndex: 4 }}
                />
            )}

            {/* ───────── HERO (65% + 3% overlap under the sheet) ───────── */}
            <View style={StyleSheet.absoluteFillObject}>

                <Reanimated.View
                    style={[
                        {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                        },
                        heroStyle,
                    ]}
                >
                    {activeProfile?.profile_img_url ? (
                        <Pressable
                            onPress={openProfileImage}
                            style={{ flex: 1, width: "100%" }}
                        >
                            <Image
                                source={{ uri: activeProfile.profile_img_url }}
                                style={{
                                    flex: 1,
                                    width: "100%",
                                    backgroundColor: colors.card,
                                }}
                                resizeMode="cover"
                            />
                        </Pressable>
                    ) : (
                        <View
                            style={{
                                flex: 1,
                                width: "100%",
                                backgroundColor: colors.secondaryCard,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <EmptyImageIcon color={colors.text} size={50} />
                        </View>
                    )}
                </Reanimated.View>

                {/* back button — unchanged */}
                {showCloseButton && (
                    <View style={{ position: "absolute", left: 15, top: insets.top, elevation: 20, zIndex: 2, borderRadius: 999 }}>
                        <Button
                            onPress={() => { closeSlidingOverlay(); onClose?.(); clearActiveProfile(); }}
                            style={{ backgroundColor: colors.card }}
                        >
                            <BackIcon color={colors.text} size={25} />
                        </Button>
                    </View>
                )}

                {/* message / more */}
                <View
                    style={{
                        position: "absolute",
                        right: 15,
                        top: insets.top,
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 10,
                        borderRadius: 20,
                        alignItems: "flex-start",
                        zIndex: 2
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
                                        onPress={openReport}
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
                                        <ReportIcon color={colors.text} size={18} />
                                    </Button>

                                    <Button
                                        onPress={openBlock}
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

                {/* message / more — unchanged, paste your existing block here */}
                <View style={{ position: "absolute", right: 15, top: insets.top, flexDirection: "row", gap: 5, zIndex: 5, alignItems: "flex-start" }}>
                    {/* ...your Send button + ExpandingButton exactly as they are now... */}
                </View>

                {/* ───────── IDENTITY BLOCK (sits on the image) ───────── */}
                <Reanimated.View
                    style={[
                        {
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: snap0, 
                            flexDirection: "column",
                        },
                        identityStyle,
                    ]}
                >

                    {!showHeroGradient && (
                        <LinearGradient
                            pointerEvents="none"
                            colors={[
                                withOpacity(colors.background, 0),
                                withOpacity(colors.background, 0.025),
                                withOpacity(colors.background, 0.07),
                                withOpacity(colors.background, 0.16),
                                withOpacity(colors.background, 0.32),
                                withOpacity(colors.background, 0.52),
                                withOpacity(colors.background, 0.72),
                                withOpacity(colors.background, 1),
                            ]}
                            locations={[0, 0.12, 0.25, 0.42, 0.60, 0.76, 0.91, 1]}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                height: Math.max(360, filterHeight + 280),
                            }}
                        />
                    )}

                    {/* Info */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            paddingHorizontal: 15,
                            paddingBottom: 25,
                            gap: 12,
                        }}
                    >
                        
                        {/* LEFT: avatar + info, bio underneath */}
                        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>

                                <DynamicAvatarRenderer
                                    avatar={activeProfile?.avatar}
                                    badge={activeProfile?.badge}
                                    xp={activeProfile?.xp}
                                    size={40}
                                    background
                                    showBadge
                                    showProgress
                                    showAvatarBackground
                                    dark={dark}
                                />

                                <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                                    <Text
                                        className={textStyles.body}
                                        style={{ color: identityTextColor }}
                                        numberOfLines={1}
                                        onPress={() => {
                                            Clipboard.setStringAsync(`${activeProfile?.profile_name}`);
                                            banner.success("Username copied to clipboard", 1000)
                                        }}
                                    >
                                        @{limitLength(activeProfile?.profile_name ?? "", 20)}
                                    </Text>

                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                        <CalendarIcon color={identityTextColor} size={12} />
                                        <Text className={textStyles.body} style={{ color: identityTextColor, fontSize: 12 }} numberOfLines={1}>
                                            {activeProfile?.date_joined
                                                ? formatMonthDayYear(activeProfile.date_joined)
                                                : "Unknown"}
                                        </Text>
                                    </View>

                                    {activeProfile?.website && (
                                        <Button
                                            onPress={() => openWebsite(activeProfile.website)}
                                            style={{ flexDirection: "row", gap: 4, padding: 0, justifyContent: "flex-start" }}
                                        >
                                            <WwwIcon color={colors.button} size={12} />
                                            <Text
                                                className={textStyles.body}
                                                style={{ color: colors.button, textDecorationLine: "underline", fontSize: 12 }}
                                                numberOfLines={1}
                                            >
                                                {limitLength(activeProfile.website, 30)}
                                            </Text>
                                        </Button>
                                    )}

                                    <Text
                                        className={textStyles.h1}
                                        style={{ color: colors.button, fontSize: 30 }}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {limitLength(activeProfile?.firstName ?? "", 20)}{" "}
                                        {limitLength(activeProfile?.lastName ?? "", 25)}
                                    </Text>

                                </View>
                            </View>

                            {/* bio under the avatar */}
                            {activeProfile?.bio && (
                                <Pressable onPress={() => isBioLong && setReadMoreBio((p) => !p)}>
                                    <Text
                                        className={textStyles.body}
                                        style={{ color: identityTextColor }}
                                        numberOfLines={readMoreBio ? undefined : 2}
                                        ellipsizeMode="tail"
                                    >
                                        {shownBio}
                                        {isBioLong && (
                                            <Text style={{ color: colors.button, fontWeight: "700" }}>
                                                {readMoreBio ? "  Show less" : "  Read more..."}
                                            </Text>
                                        )}
                                    </Text>
                                </Pressable>
                            )}

                            {/* Stats */}
                            <Pressable
                                onPress={openStats}
                                style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 10,
                                    flexShrink: 0,
                                    alignItems: "flex-start",
                                }}
                            >
                                <StatPill icon={<LikeIcon size={18} />} value={activeProfile?.num_of_likes ?? 0} label="Likes" />
                                <StatPill icon={<StarIcon size={18} fillColor="yellow" color="yellow" />} value={activeProfile?.num_of_stars ?? 0} label="Stars" />
                                <StatPill icon={<CookPotIcon size={18} />} value={activeProfile?.num_of_cooks ?? 0} label="Cooks" />
                                <StatPill icon={<XPIcon size={18} />} value={activeProfile?.xp ?? 0} label="XP" />
                                <StatPill icon={<Bread size={18} />} value={activeProfile?.bread ?? 0} label="Bread" />
                                <StatPill icon={<LevelIcon size={18} />} value={activeProfile?.level ?? 0} label="Level" />
                            </Pressable>

                        </View>

                    </View>

                </Reanimated.View>

            </View>

            {/* ───────── SHEET (35%) ───────── */}
            {rootH > 0 && (
                <BottomSheet
                    index={0}
                    snapPoints={snapPoints}
                    animatedIndex={sheetProgress}
                    animatedPosition={sheetPosition}
                    enableDynamicSizing={false}   
                    enablePanDownToClose={false}
                    containerStyle={{ zIndex: 3, backgroundColor: "transparent" }} 
                    backgroundStyle={{
                        backgroundColor: "transparent",
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                    }}
                    handleComponent={() => {}}
                >
                    <FeedProfilePosts dark={dark} progress={sheetProgress}  onFilterLayout={setFilterHeight} identityColor={identityTextColor}/>
                </BottomSheet>
            )}

        </View>
    );
};

const SK_DECK_DEPTH = 4;
const SK_PEEK = 12;
const SK_SCALE_STEP = 0.03;
const SK_OPACITY_STEP = 0.15;
const SK_CARD_H = 125;
const SK_CARD_R = 14;
const SK_SIDE = 5;

const EmptyFeedProfile = ({ dark }: { dark?: boolean }) => {
    const { colors } = useTheme(dark ? "dark" : undefined);
    const insets = useSafeAreaInsets();

    const [rootH, setRootH] = useState(0);
    const snap0 = (rootH || Dimensions.get("window").height) * COLLAPSED_PCT + insets.bottom;

    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.85, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    const bone = (width: number | `${number}%`, height: number, radius = 6) => (
        <Animated.View
            style={{ width, height, borderRadius: radius, backgroundColor: colors.secondaryCard, opacity }}
        />
    );

    const deckTopInset = (SK_DECK_DEPTH - 1) * SK_PEEK;
    const tabLabelWidths = [44, 32, 36];

    return (
        <View style={StyleSheet.absoluteFillObject} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>
            {/* Hero */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.card }]}>
                <Animated.View style={{ flex: 1, backgroundColor: colors.secondaryCard, opacity }} />
            </View>

            {/* Top nav: back left, send + more right */}
            <View
                style={{
                    position: "absolute",
                    top: insets.top,
                    left: 15,
                    right: 15,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    zIndex: 2,
                }}
            >
                {bone(42, 42, 999)}
                <View style={{ flexDirection: "row", gap: 10 }}>
                    {bone(42, 42, 999)}
                    {bone(42, 42, 999)}
                </View>
            </View>

            {/* Identity block: avatar/info -> bio -> stats */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: snap0,
                    paddingHorizontal: 15,
                    paddingBottom: 25,
                    gap: 10,
                    zIndex: 1,
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {bone(40, 40, 20)}
                    <View style={{ flex: 1, gap: 5 }}>
                        {bone("40%", 12)}
                        {bone("30%", 10)}
                        {bone("65%", 30, 8)}
                    </View>
                </View>

                <View style={{ gap: 6 }}>
                    {bone("95%", 11)}
                    {bone("70%", 11)}
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                        <View
                            key={item}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 999,
                                backgroundColor: "rgba(0,0,0,0.35)",
                            }}
                        >
                            {bone(18, 18, 9)}
                            {bone(24, 14)}
                            {bone(28, 9)}
                        </View>
                    ))}
                </View>
            </View>

            {/* Sheet (collapsed) */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: snap0,
                    backgroundColor: colors.background,
                    overflow: "hidden",
                    zIndex: 3,
                }}
            >
                {/* Tab header: 68 tall, 54 row, hairline + indicator */}
                <View style={{ height: 68, paddingBottom: 10, justifyContent: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", height: 54 }}>
                        {tabLabelWidths.map((w, i) => (
                            <View
                                key={i}
                                style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                                {bone(20, 20, 5)}
                                {bone(w, 10)}

                                {i < tabLabelWidths.length - 1 && (
                                    <View
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

                                {i === 0 && (
                                    <View
                                        style={{
                                            position: "absolute",
                                            bottom: 0,
                                            alignSelf: "center",
                                            width: 65,
                                            height: 2,
                                            backgroundColor: colors.secondaryText,
                                            opacity: 0.5,
                                        }}
                                    />
                                )}
                            </View>
                        ))}

                        <View
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
                    </View>
                </View>

                {/* Stacked deck */}
                <View style={{ height: deckTopInset + SK_CARD_H + 30 }}>
                    {Array.from({ length: SK_DECK_DEPTH }, (_, slot) => (
                        <View
                            key={slot}
                            style={{
                                position: "absolute",
                                top: deckTopInset,
                                left: SK_SIDE,
                                right: SK_SIDE,
                                height: SK_CARD_H,
                                borderRadius: SK_CARD_R,
                                overflow: "hidden",
                                flexDirection: "row",
                                backgroundColor: colors.background,
                                borderWidth: 1,
                                borderColor: colors.secondaryCard,
                                opacity: 1 - slot * SK_OPACITY_STEP,
                                transform: [
                                    { translateY: -slot * SK_PEEK },
                                    { scale: 1 - slot * SK_SCALE_STEP },
                                ],
                                zIndex: SK_DECK_DEPTH - slot,
                                elevation: SK_DECK_DEPTH - slot,
                            }}
                        >
                            {slot === 0 && (
                                <>
                                    <View style={{ width: "38%", height: "100%", backgroundColor: colors.secondaryCard }}>
                                        <Animated.View style={{ flex: 1, backgroundColor: colors.card, opacity }} />
                                    </View>

                                    <View
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            justifyContent: "center",
                                            paddingHorizontal: 10,
                                            paddingVertical: 8,
                                            gap: 7,
                                        }}
                                    >
                                        {bone("35%", 8)}
                                        {bone("82%", 13)}
                                        <View style={{ gap: 4 }}>
                                            {bone("100%", 8)}
                                            {bone("72%", 8)}
                                        </View>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                            {bone(28, 8)}
                                            {bone(28, 8)}
                                            {bone(28, 8)}
                                        </View>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            {bone(20, 20, 10)}
                                            <View style={{ flex: 1, gap: 4 }}>
                                                {bone("45%", 7)}
                                                {bone("60%", 7)}
                                            </View>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};


export default FeedProfile;

