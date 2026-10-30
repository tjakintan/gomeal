import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { BackIcon, ServingsIcon, TimerIcon, CookIcon, CookingIcon, CookedIcon, InfoIcon, ReportIcon, MoreIcon, SendIcon, ShareIcon } from "@/icons/Icon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { Animated as AnimatedRN, StyleSheet, Text, View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { SpinningLogoImage } from "@/utils/Logo";
import { Media } from "@/media/media";
import { useFeed } from "@/stores/useFeed";
import { IngredientScreen } from "./ingredient";
import { SectionHeader } from "@/components/SectionComponent";
import { useCook } from "@/stores/useCook";
import { AvatarRender, DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { useUser } from "@/stores/useUser";
import MessageScreen from "../messages/messages";
import { StepsScreen } from "./steps";
import { FeedLoveIcon, FeedStarIcon } from "@/icons/feed_icon";
import { Mood, useAvatarMood } from "@/stores/useAvatar";
import { setFeedActionCount } from "@/api/feed.api";
import { FeedActionType } from "@/types/feed.types";
import { useReward } from "@/stores/useReward";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBlockUser, useReport } from "@/stores/useReport";
import { useOverlay } from "@/stores/useOverlay";
import { DietaryRender, DifficultyRender, NutritionRender } from "@/utils/food";
import { capitalize, limitLength } from "@/utils/text";
import { GradientHeader } from "@/components/GradientComponent";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { usePostHog } from "posthog-react-native";

// NEW: gorhom bottom sheet
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
// NEW: reanimated primitives for driving the image size off the sheet's live position
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    useAnimatedReaction,
} from "react-native-reanimated";
import { ACCENT_COLORS } from "@/types";
import Disclaimer from "@/components/DisclaimerComponent";
import { formatCount } from "@/utils/time";
import Report from "@/components/ReportComponent";
import { BlurView } from "expo-blur";
import MediaPreview, { PreviewMedia } from "@/media/MediaPreview";
import { useBottomSheet } from "@/stores/useBottomSheet";
import FeedShare from "../feed/share";

type CookMainScreenProps = {
  post_id: number;
  dark?: boolean;
  onClose?: () => Promise<void> | void;
};

// Tweak this to control how much the photo shrinks when the sheet is
// dragged all the way up.
const MIN_IMAGE_HEIGHT = 120;

export const CookMainScreen: React.FC<CookMainScreenProps> = ({
    post_id,
    dark = false,
    onClose
}) => {

    const posthog = usePostHog();
    const user = useUser((s) => s.user);
    const { height } = useWindowDimensions();

    const { reward } = useReward();
    const loadingReport = useReport((s) => s.loadingReport);

    const openOverlay = useOverlay((s) => s.openOverlay);
    const closeOverlay = useOverlay((s) => s.closeOverlay);
    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const selectedPost = useFeed((s) => s.selectedPost);
    const loadingPost = useFeed((s) => s.loadingPost);
    const clearSelectedPost = useFeed((s) => s.clearSelectedPost);
    const updatePostEverywhere = useFeed((s) => s.updatePostEverywhere);
    const markPostSeen = useFeed((s) => s.markPostSeen);

    const closeCook = useCook((s) => s.closeCook);
    const cookTime = useCook((s) => s.cookTime);
    const servings = useCook((s) => s.servings);

    const openBottomSheet = useBottomSheet((s) => s.openBottomSheet);

    const [readMore, setReadMore] = useState(false);
    const description = selectedPost?.info?.dish_description ?? "";
    const [isSheetCollapsed, setIsSheetCollapsed] = useState(true);

    const limit = 80;
    const isLong = description.length > limit;
    const shownDescription = !readMore && isLong ? description.slice(0, limit).trim() : description;

    const insets = useSafeAreaInsets();

    const [showMenuRow, setShowMenuRow] = useState(false);

    const seenPostRef = useRef<number | null>(null);

    const [localMood, setLocalMood] = useState<Mood>("idle");
    const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const triggerMood = (mood: Mood, duration = 3000) => {
        if (moodTimer.current) clearTimeout(moodTimer.current);
        setLocalMood(mood);
        moodTimer.current = setTimeout(() => setLocalMood("idle"), duration);
    };

    const handleMediaPress = () => {
        const mediaType = selectedPost?.info?.dish_media_type;
        const mediaUrl = selectedPost?.info?.dish_media_url;

        // Only open the full-screen preview for images.
        if (mediaType !== "image" || !mediaUrl) return;

        const previewMedia: PreviewMedia[] = [
            {
                uri: mediaUrl,
                mediaType: "image",
            },
        ];

        openOverlay(
            undefined,
            <MediaPreview
                media={previewMedia}
                initialIndex={0}
                dark={dark}
            />
        );
    };

    // ── layout / bottom-sheet math ─────────────────────────────────────────
    // IMPORTANT: these hooks must run on every render (loading or not), or
    // React throws "Rendered more hooks than during the previous render"
    // once the early-return-while-loading path stops matching the loaded
    // path. Keep everything hook-related above the `if (loadingPost...)`
    // early return below.
    const imageHeight = height * 0.55;
    const collapsedHeight = height - (imageHeight -50);
    const expandedHeight = height - insets.top - 70;
    const snapPoints = useMemo(
        () => [collapsedHeight, expandedHeight],
        [collapsedHeight, expandedHeight]
    );

    // Sheet's live top-edge Y position (distance from the top of the
    // screen), written to by BottomSheet on every frame of the drag/settle
    // animation. At rest in the collapsed snap point this equals
    // `imageHeight - 25`; at the expanded snap point it equals
    // `insets.top + 70`.
    const sheetPosition = useSharedValue(height);
    const collapsedTopY = imageHeight - 15;
    const expandedTopY = insets.top + 70;

    const sheetRef = useRef<BottomSheet>(null);

    const imageAnimatedStyle = useAnimatedStyle(() => {
        const animatedHeight = interpolate(
            sheetPosition.value,
            [expandedTopY, collapsedTopY],
            [MIN_IMAGE_HEIGHT, imageHeight],
            Extrapolation.CLAMP
        );
        return { height: animatedHeight + 9};
    });

    const dishNameAnimatedStyle = useAnimatedStyle(() => {
        const progress = interpolate(
            sheetPosition.value,
            [expandedTopY, collapsedTopY],
            [0, 1],
            Extrapolation.CLAMP
        );

        return {
            opacity: progress,
            transform: [
                {
                    translateY: sheetPosition.value - collapsedTopY - 45,
                },
            ],
        };
    });

    const controlsOpacity = useSharedValue(1);

    useAnimatedReaction(
        () => {
            return interpolate(
                sheetPosition.value,
                [expandedTopY, collapsedTopY],
                [0, 1],
                Extrapolation.CLAMP
            );
        },
        (opacity) => {
            controlsOpacity.value = opacity;
        },
        [expandedTopY, collapsedTopY]
    );

    const openReport = () => {
        if (!selectedPost?.post_id) return;

        setShowMenuRow(false);

        openOverlay({
            custom: (
                <Report
                    dark={dark}
                    profile_name={selectedPost?.profile_name}
                    target_user_sub={selectedPost?.user_sub}
                    target_id={selectedPost.post_id}
                    target_type="post"
                    onReported={async () => {
                        posthog.capture("[Trust] => post_reported", {
                            post_id: selectedPost.post_id,
                        });

                        await handleBack();

                        closeOverlay();
                        
                    }}
                />
            ),
        });
    };


    // ── done / post_cook ────────────────────────────────────────────────────
    const userActions: FeedActionType[] = selectedPost?.user_actions ?? [];
    const hasCooked = userActions.includes("post_cook" as FeedActionType);
    const isStarred = userActions.includes("post_star");

    const isLoved = userActions.includes("post_love");
    const [animateLove, setAnimateLove] = useState(0);


    const handleDone = async () => {
        if (!selectedPost || hasCooked) return;

        updatePostEverywhere(post_id, (post) => {
            const currentActions: FeedActionType[] = post.user_actions ?? [];
            return {
                ...post,
                user_actions: currentActions.includes("post_cook" as FeedActionType)
                    ? currentActions
                    : [...currentActions, "post_cook" as FeedActionType],
                action_counts: {
                    ...post.action_counts,
                    post_cook: (post.action_counts?.post_cook ?? 0) + 1,
                },
            };
        });

        triggerMood("excited");

        try {
            await setFeedActionCount(post_id, "post_cook");
            await reward("COOK_POST");
            posthog.capture("[Cook] => recipe_cooked", { post_id });
        } catch (err) {
            updatePostEverywhere(post_id, (post) => {
                const currentActions: FeedActionType[] = post.user_actions ?? [];
                return {
                    ...post,
                    user_actions: currentActions.filter((a: FeedActionType) => a !== "post_cook"),
                    action_counts: {
                        ...post.action_counts,
                        post_cook: Math.max((post.action_counts?.post_cook ?? 0) - 1, 0),
                    },
                };
            });
            posthog.capture("[Cook] => recipe_cook_failed", { post_id });
            console.error("[cook] post_cook failed:", err);
        }
    };


    const handleStar = async () => {
        if (!selectedPost) return;

        const wasStarred = isStarred;
        const nextStarred = !wasStarred;
        const delta = nextStarred ? 1 : -1;

        if (nextStarred) {
            triggerMood("focused");
        }

        updatePostEverywhere(post_id, (post) => {
            const currentActions: FeedActionType[] =
                Array.isArray(post.user_actions)
                    ? post.user_actions
                    : [];

            const nextActions = nextStarred
                ? [
                    ...currentActions.filter(
                        (a) => a !== "post_star"
                    ),
                    "post_star" as FeedActionType,
                ]
                : currentActions.filter(
                    (a) => a !== "post_star"
                );

            return {
                ...post,
                user_actions: nextActions,
                action_counts: {
                    ...post.action_counts,
                    post_star: Math.max(
                        (post.action_counts?.post_star ?? 0) + delta,
                        0
                    ),
                },
            };
        });

        posthog.capture(
            nextStarred
                ? "[Cook] => recipe_starred"
                : "[Cook] => recipe_unstarred",
            { post_id }
        );

        try {
            const freshCounts = await setFeedActionCount(
                post_id,
                "post_star" as FeedActionType
            );

            // Server is authoritative
            if (freshCounts?.post_star !== undefined) {
                updatePostEverywhere(post_id, (post) => ({
                    ...post,
                    action_counts: {
                        ...post.action_counts,
                        post_star: freshCounts.post_star,
                    },
                }));
            }
        } catch (err) {
            // Roll back if API fails
            updatePostEverywhere(post_id, (post) => {
                const currentActions: FeedActionType[] =
                    Array.isArray(post.user_actions)
                        ? post.user_actions
                        : [];

                const rollbackActions = wasStarred
                    ? [
                        ...currentActions.filter(
                            (a) => a !== "post_star"
                        ),
                        "post_star" as FeedActionType,
                    ]
                    : currentActions.filter(
                        (a) => a !== "post_star"
                    );

                return {
                    ...post,
                    user_actions: rollbackActions,
                    action_counts: {
                        ...post.action_counts,
                        post_star: Math.max(
                            (post.action_counts?.post_star ?? 0) - delta,
                            0
                        ),
                    },
                };
            });

            posthog.capture("[Cook] => recipe_star_failed", {
                post_id,
            });

            console.error("[cook] star failed:", err);
        }
    };


    const handleLove = async () => {
        if (!selectedPost) return;

        const wasLoved = isLoved;
        const nextLoved = !wasLoved;
        const delta = nextLoved ? 1 : -1;

        if (nextLoved) {
            setAnimateLove((prev) => prev + 1);
            triggerMood("love");
        }

        updatePostEverywhere(post_id, (post) => {
            const currentActions: FeedActionType[] =
                Array.isArray(post.user_actions)
                    ? post.user_actions
                    : [];

            const nextActions = nextLoved
                ? [
                    ...currentActions.filter(
                        (a) => a !== "post_love"
                    ),
                    "post_love" as FeedActionType,
                ]
                : currentActions.filter(
                    (a) => a !== "post_love"
                );

            return {
                ...post,
                user_actions: nextActions,
                action_counts: {
                    ...post.action_counts,
                    post_love: Math.max(
                        (post.action_counts?.post_love ?? 0) + delta,
                        0
                    ),
                },
            };
        });

        try {
            const freshCounts = await setFeedActionCount(
                post_id,
                "post_love" as FeedActionType
            );

            // Server is authoritative
            if (freshCounts?.post_love !== undefined) {
                updatePostEverywhere(post_id, (post) => ({
                    ...post,
                    action_counts: {
                        ...post.action_counts,
                        post_love: freshCounts.post_love,
                    },
                }));
            }
        } catch (err) {
            // Roll back if API fails
            updatePostEverywhere(post_id, (post) => {
                const currentActions: FeedActionType[] =
                    Array.isArray(post.user_actions)
                        ? post.user_actions
                        : [];

                const rollbackActions = wasLoved
                    ? [
                        ...currentActions.filter(
                            (a) => a !== "post_love"
                        ),
                        "post_love" as FeedActionType,
                    ]
                    : currentActions.filter(
                        (a) => a !== "post_love"
                    );

                return {
                    ...post,
                    user_actions: rollbackActions,
                    action_counts: {
                        ...post.action_counts,
                        post_love: Math.max(
                            (post.action_counts?.post_love ?? 0) - delta,
                            0
                        ),
                    },
                };
            });

            console.error("[cook] love failed:", err);
        }
    };

    const handleShare = () => {
        setShowMenuRow(false);
        if (!selectedPost) return;
        posthog.capture("[Cook] => share_opened", { post_id });
        openBottomSheet(<FeedShare post_id={post_id} dark={dark} />, [210 + insets.bottom], 1);
    };

    // ── nav ──────────────────────────────────────────────────────────────────
    const handleBack = async () => {
        clearSelectedPost();
        await closeCook();

        if (onClose) {
            await onClose();
            return;
        }
    };


    const blockedUsers = useBlockUser((state) => state.blockedUsers);

    
    useEffect(() => {
        if (!selectedPost?.user_sub) return;

        const isBlocked = blockedUsers.some(
            (user) => user.sub === selectedPost.user_sub
        );

        if (!isBlocked) return;

        setShowMenuRow(false);
        clearSelectedPost();
        closeCook();
        closeSlidingOverlay();
        onClose?.();
    }, [
        selectedPost?.user_sub,
        blockedUsers,
        clearSelectedPost,
        closeCook,
        closeSlidingOverlay,
        onClose,
    ]);
    

    useEffect(() => {
        return () => {
            if (moodTimer.current) clearTimeout(moodTimer.current);
        };
    }, []);


    useEffect(() => {
        if (moodTimer.current) clearTimeout(moodTimer.current);
        setLocalMood("idle");
    }, [post_id]);


    useEffect(() => {
        // selectedPost can be stale from a previous recipe, so check the id matches
        if (loadingPost || !selectedPost || selectedPost.post_id !== post_id) return;
        if (seenPostRef.current === post_id) return;

        seenPostRef.current = post_id;
        markPostSeen(post_id);
    }, [loadingPost, selectedPost?.post_id, post_id, markPostSeen]);


    // ── render loading ──────────────────────────────────────────────────────
    // This early return happens AFTER all hooks above have run, so hook
    // count stays identical between the loading and loaded renders.
    if (loadingPost || !selectedPost) {
        return <EmptyCookScreen dark={dark} />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>

            {showMenuRow && (
                <Pressable
                    style={{
                        position: "absolute",
                        top: 70,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 2,
                        elevation: 2,
                        backgroundColor: "transparent",
                    }}
                    onPress={() => setShowMenuRow(false)}
                />
            )}

            {/* ── Media: height now animates in sync with the sheet's drag position ── */}
            <Animated.View
                style={[
                    {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        overflow: "hidden",
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                        borderColor: colors.secondaryCard,
                        backgroundColor: colors.background,
                    },
                    imageAnimatedStyle,
                ]}
            >
                <Media
                    uri={selectedPost?.info?.dish_media_url}
                    mediaType={selectedPost?.info?.dish_media_type ?? "image"}
                    muteControl="bottomRowTogether"
                    bottomRowTogetherPosition="right"
                    bottomControlOffset={30}
                    iconSize={22}
                    controlOpacity={controlsOpacity}
                    style={StyleSheet.absoluteFillObject}
                    onPress={handleMediaPress}
                />
            </Animated.View>

            {/* ── Header: single row ── */}
            <View
                style={{
                    position: "absolute",
                    top: insets.top,
                    height: 60,
                    width: "100%",
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    zIndex: 3,
                    elevation: 3,
                }}
            >
                <Button onPress={handleBack} style={{ backgroundColor: colors.card }}>
                    <BackIcon color={colors.text} size={25} />
                </Button>

                {!isSheetCollapsed && (
                    <View
                        style={{
                            flex: 1,
                            minWidth: 0,
                            marginHorizontal: 8,
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                maxWidth: "100%",
                                maxHeight: 40,
                                justifyContent: "center",
                                alignItems: "flex-start",
                                paddingVertical: 3,
                                paddingHorizontal: 10,
                                borderRadius: 20,
                                borderWidth: 2,
                                borderColor: colors.secondaryCard,
                                backgroundColor: colors.card,
                            }}
                        >
                            <Text
                                className={textStyles.section}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {(() => {
                                    const name = capitalize(selectedPost?.info?.dish_name);
                                    const truncated = limitLength(name, 12);
                                    return truncated.length < name.length
                                        ? `${truncated}…`
                                        : truncated;
                                })()}
                            </Text>
                        </View>
                    </View>
                )}
                
                <View
                    style={{
                        gap: isSheetCollapsed ? 10 : 5,
                        flexDirection: "row"
                    }}
                >

                    <View
                        style={{
                            position: "relative",
                        }}
                    >
                        <Button
                            onPress={handleLove}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: colors.card,
                            }}
                        >
                            <FeedLoveIcon
                                color={colors.text}
                                fillColor="red"
                                liked={isLoved}
                                animationKey={animateLove}
                                size={25}
                            />
                        </Button>

                        <BlurView
                            intensity={35}
                            tint={dark ? "dark" : "light"}
                            style={{
                                position: "absolute",
                                alignSelf: "center",
                                bottom: -23,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 999,
                                overflow: "hidden",
                            }}
                        >
                            <Text
                                className={textStyles.caption}
                                style={{
                                    color: "white",
                                }}
                            >
                                {formatCount(selectedPost?.action_counts?.post_love ?? 0)}
                            </Text>
                        </BlurView>
                    </View>

                    <View
                        style={{
                            position: "relative",
                        }}
                    >
                        <Button
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: colors.card,
                            }}
                            onPress={handleStar}
                        >
                            <FeedStarIcon
                                color={colors.text}
                                fillColor="yellow"
                                starred={isStarred}
                                size={32}
                            />
                        </Button>

                        <BlurView
                            intensity={35}
                            tint={dark ? "dark" : "light"}
                            style={{
                                position: "absolute",
                                alignSelf: "center",
                                bottom: -23,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 999,
                                overflow: "hidden",
                            }}
                        >
                            <Text
                                className={textStyles.caption}
                                style={{
                                    color: "white",
                                }}
                            >
                                {formatCount(selectedPost?.action_counts?.post_star ?? 0)}
                            </Text>
                        </BlurView>
                    </View>

                    <View
                        style={{
                            position: "relative",
                        }}
                    >
                        <Button
                            onPress={handleDone}
                            style={{
                                paddingHorizontal: 16,
                                borderRadius: 22,
                                backgroundColor: ACCENT_COLORS.teal,
                                opacity: hasCooked ? 0.6 : 1,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                            background
                        >
                            {hasCooked ? (
                                <CookedIcon color={colors.text} size={20} />
                            ) : (
                                <CookingIcon color={colors.text} size={20} />
                            )}
                        </Button>
                        <BlurView
                            intensity={35}
                            tint={dark ? "dark" : "light"}
                            style={{
                                position: "absolute",
                                alignSelf: "center",
                                bottom: -23,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 999,
                                overflow: "hidden",
                            }}
                        >
                            <Text
                                className={textStyles.caption}
                                style={{
                                    color: "white",
                                }}
                            >
                                {formatCount(selectedPost?.action_counts?.post_cook ?? 0)}
                            </Text>
                        </BlurView>
                    </View>
                    
                    <View style={{ justifyContent: "center", alignItems: "center", zIndex: 5 }}>
                        <ExpandingButton
                            expanded={showMenuRow}
                            onPress={() => setShowMenuRow(true)}
                            expandedHeight={160}
                            anchor="top-right"
                            expandedChildren={
                                <View style={{ gap: 5, overflow: "hidden", minWidth: 150 }}>
                                    <Button
                                        onPress={() => {
                                            setShowMenuRow(false);
                                            openOverlay({
                                                title: "Info",
                                                custom: (
                                                    <View style={{ flex: 1 }}>
                                                        <GradientHeader baseColor={colors.background}>
                                                            <Text className={textStyles.body} style={{ color: colors.secondaryText }}>
                                                                {`Please read the nutritional, level of difficulty and dietary specifications of ${capitalize(selectedPost?.firstName)} ${capitalize(selectedPost?.lastName ?? "")}'s ${selectedPost?.info?.dish_name}`}
                                                            </Text>
                                                        </GradientHeader>
                                                        <ScrollView style={{ paddingTop: 80 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingBottom: insets.bottom }}>
                                                            <DifficultyRender difficulty={selectedPost?.info?.dish_difficulty} dark={dark} />
                                                            <NutritionRender nutrition={selectedPost?.nutrition ?? []} dark={dark} />
                                                            <DietaryRender dietary={selectedPost?.dietary ?? []} dark={dark} />
                                                        </ScrollView>
                                                    </View>
                                                ),
                                            });
                                        }}
                                        style={{
                                            width: "auto",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            backgroundColor: colors.background,
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 16 }}>Info</Text>
                                        <InfoIcon color={colors.text} size={18} />
                                    </Button>

                                        <Button
                                            onPress={handleShare}
                                            style={{
                                                width: "auto",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                backgroundColor: colors.background,
                                            }}
                                        >
                                            <Text style={{ color: colors.text, fontSize: 16 }}>Share</Text>
                                            <ShareIcon color={colors.text} size={18} />
                                        </Button>

                                    {selectedPost?.user_sub !== user?.sub && (
                                        <Button
                                            onPress={openReport}
                                            disabled={loadingReport}
                                            style={{
                                                width: "auto",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                backgroundColor: colors.background,
                                            }}
                                        >
                                            <Text style={{ color: colors.danger, fontSize: 16 }}>Report</Text>
                                            {loadingReport ? (
                                                <SpinningLogoImage size={18} />
                                            ) : (
                                                <ReportIcon color={colors.danger} size={18} />
                                            )}
                                        </Button>
                                    )}
                                </View>
                            }
                            expandedStyle={{ borderRadius: 20 }}
                            style={{
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: colors.card,
                            }}
                        >
                            <MoreIcon color={colors.text} size={18} rotate={90} />
                        </ExpandingButton>
                    </View>

                </View>

            </View>

            {isSheetCollapsed && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        {
                            position: "absolute",
                            left: 0,
                            top: collapsedTopY,
                            height: 40,
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 10,
                            elevation: 10,
                        },
                        dishNameAnimatedStyle,
                    ]}
                >
                    <View
                        style={{
                            marginLeft: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: colors.secondaryCard,
                            backgroundColor: colors.card,
                        }}
                    >
                        <Text
                            className={textStyles.section}
                            numberOfLines={1}
                            style={{
                                color: colors.text,
                            }}
                        >
                            {(() => {
                                const name = capitalize(selectedPost?.info?.dish_name);
                                const truncated = limitLength(name, 18);

                                return truncated.length < name.length
                                    ? `${truncated}…`
                                    : truncated;
                            })()}
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* ── Content sheet: real draggable @gorhom/bottom-sheet, driving the image size above ── */}
            <BottomSheet
                ref={sheetRef}
                index={0}
                snapPoints={snapPoints}
                animateOnMount={false}
                enableContentPanningGesture
                enableHandlePanningGesture
                enablePanDownToClose={false}
                topInset={expandedTopY}
                animatedPosition={sheetPosition}
                onChange={(index) => {
                    setIsSheetCollapsed(index === 0);
                }}
                handleIndicatorStyle={{
                    backgroundColor: colors.secondaryCard,
                    width: 45,
                    height: 5,
                }}
                handleStyle={{
                    backgroundColor: colors.background,
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                }}
                backgroundStyle={{
                    backgroundColor: colors.background,
                    borderTopLeftRadius: 60,
                    borderTopRightRadius: 60,
                }}
            >
                <BottomSheetScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingTop: 5,
                        paddingHorizontal: 5,
                        paddingBottom: insets.bottom,
                    }}
                >
                    {selectedPost?.info?.dish_description && (
                        <View>
                            <SectionHeader
                                title="Description"
                                titleClassName={textStyles.bodyMedium}
                                leftIcon={<CookIcon color={colors.button} />}
                                showBackground
                                dark={dark}
                            />

                            <View
                                style={{
                                    borderTopWidth: 2,
                                    borderBottomWidth: 2,
                                    borderColor: colors.secondaryCard,
                                    paddingVertical: 10,
                                }}
                            >
                                <View style={{ paddingHorizontal: 10 }}>

                                    <Text
                                        className={textStyles.body}
                                    >
                                        {shownDescription}
                                        {isLong && (
                                            <Text
                                                onPress={() => setReadMore((prev) => !prev)}
                                                className={textStyles.body}
                                                style={{ color: colors.button, fontWeight: "700" }}
                                            >
                                                {readMore ? "  Show less..." : "  Read more..."}
                                            </Text>
                                        )}
                                    </Text>

                                </View>

                                <View
                                    style={{
                                        height: 75,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 20,
                                    }}
                                >
                                    <View
                                        style={{
                                            height: 60,
                                            width: 115,
                                            borderRadius: 15,
                                            flexDirection: "row",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <View style={{ height: "100%", width: 50, justifyContent: "center", alignItems: "center" }}>
                                            <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.card, justifyContent: "center", alignItems: "center" }}>
                                                <TimerIcon color={colors.button} />
                                            </View>
                                        </View>
                                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                            <Text className={textStyles.caption}>{cookTime}</Text>
                                        </View>
                                    </View>

                                    <View
                                        style={{
                                            height: 60,
                                            width: 115,
                                            borderRadius: 15,
                                            flexDirection: "row",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <View style={{ height: "100%", width: 50, justifyContent: "center", alignItems: "center" }}>
                                            <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.card, justifyContent: "center", alignItems: "center" }}>
                                                <ServingsIcon size={20} />
                                            </View>
                                        </View>
                                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                            <Text className={textStyles.caption}>{servings}</Text>
                                        </View>
                                    </View>
                                </View>

                                {selectedPost?.user_sub !== user?.sub && (
                                    <View
                                        style={{
                                            height: 75,
                                            width: "100%",
                                            paddingHorizontal: 10,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 10,
                                        }}
                                    >
                                        <View
                                            style={{
                                                height: 65,
                                                width: "100%",
                                                borderRadius: 15,
                                                gap: 10,
                                                paddingHorizontal: 20,
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <DynamicAvatarRenderer mood={localMood} avatar={selectedPost?.avatar} badge={selectedPost?.badge} size={25} dark={dark} background showBadge />

                                            <View style={{ flex: 1 }}>
                                                <Text className={textStyles.bodyMedium} numberOfLines={1} style={{ color: colors.text }}>
                                                    {selectedPost?.profile_name}
                                                </Text>
                                                <Text className={textStyles.small} numberOfLines={1} style={{ color: colors.secondaryText }}>
                                                    {selectedPost?.firstName} {selectedPost?.lastName}
                                                </Text>
                                            </View>

                                            <Button
                                                onPress={() => {
                                                    openSlidingOverlay(
                                                        <MessageScreen
                                                            receiver_sub={selectedPost?.user_sub}
                                                            onClose={closeSlidingOverlay}
                                                        />
                                                    );
                                                }}
                                                background
                                            >
                                                <SendIcon color={colors.text} />
                                            </Button>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View
                        style={{
                            minHeight: 350,
                            borderBottomWidth: 2,
                            borderColor: colors.secondaryCard,
                        }}
                    >
                        <IngredientScreen post_id={post_id} dark={dark} />
                    </View>

                    <View
                        style={{
                            minHeight: 350,
                            borderBottomWidth: 2,
                            borderColor: colors.secondaryCard,
                        }}
                    >
                        <StepsScreen dark={dark} dishName={selectedPost.info.dish_name} steps={selectedPost.steps ?? []} />
                    </View>

                    <Disclaimer
                        dark={dark}
                        title="FOOD SAFETY"
                        message="Always check ingredients for allergens and dietary restrictions, tap the more icon at the top right to learn more.
                        Use proper food handling and cooking techniques, and exercise caution
                        when using knives, utensils, ovens, or stoves."
                    />

                </BottomSheetScrollView>

            </BottomSheet>

        </View>
    );
};


const EmptyCookScreen = ({ dark }: { dark?: boolean }) => {
    const { colors } = useTheme(dark ? "dark" : undefined);
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const opacity = useRef(new AnimatedRN.Value(0.45)).current;

    useEffect(() => {
        const animation = AnimatedRN.loop(
            AnimatedRN.sequence([
                AnimatedRN.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
                AnimatedRN.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const bone = (width: number | `${number}%`, height: number, radius = 8) => (
        <AnimatedRN.View
            style={{ width, height, borderRadius: radius, backgroundColor: colors.card, opacity }}
        />
    );

    const imageHeight = height * 0.45;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: imageHeight,
                    overflow: "hidden",
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                }}
            >
                {bone("100%", imageHeight, 0)}
            </View>

            <View
                style={{
                    position: "absolute",
                    top: insets.top,
                    left: 15,
                    right: 15,
                    height: 60,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    zIndex: 5,
                }}
            >
                {bone(40, 40, 999)}
                <View style={{ flex: 1, alignItems: "center" }}>
                    {bone("55%", 24, 10)}
                </View>
                {bone(40, 40, 999)}
                {bone(40, 40, 999)}
                {bone(40, 40, 999)}
            </View>

            <View
                style={{
                    position: "absolute",
                    top: imageHeight - 25,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: colors.background,
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 15, paddingBottom: 30 }}
                >
                    <View style={{ alignItems: "center", marginBottom: 20 }}>
                        {bone(60, 5, 999)}
                    </View>

                    <View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 15 }}>
                            {bone(22, 22, 999)}
                            {bone(110, 16, 6)}
                        </View>

                        <View
                            style={{
                                minHeight: 150,
                                borderTopWidth: 2,
                                borderBottomWidth: 2,
                                borderColor: colors.secondaryCard,
                                paddingVertical: 12,
                            }}
                        >
                            <View style={{ gap: 10, paddingHorizontal: 5 }}>
                                {bone("95%", 12)}
                                {bone("85%", 12)}
                                {bone("70%", 12)}
                            </View>

                            <View style={{ height: 75, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 }}>
                                {[1, 2].map((item) => (
                                    <View
                                        key={item}
                                        style={{
                                            width: 115,
                                            height: 60,
                                            borderRadius: 15,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            paddingHorizontal: 10,
                                            gap: 10,
                                        }}
                                    >
                                        {bone(40, 40, 999)}
                                        {bone(40, 12)}
                                    </View>
                                ))}
                            </View>

                            <View style={{ width: "100%", height: 75, paddingHorizontal: 10, justifyContent: "center" }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    {bone(32, 32, 999)}
                                    <View style={{ flex: 1, gap: 6 }}>
                                        {bone("50%", 14)}
                                        {bone("35%", 10)}
                                    </View>
                                    {bone(40, 40, 12)}
                                </View>
                            </View>
                        </View>
                    </View>

                    <View
                        style={{
                            minHeight: 210,
                            borderBottomWidth: 2,
                            borderColor: colors.secondaryCard,
                            paddingVertical: 15,
                            gap: 12,
                        }}
                    >
                        {bone(120, 18)}
                        {[1, 2, 3, 4].map((item) => (
                            <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                {bone(36, 36, 10)}
                                {bone("65%", 12)}
                            </View>
                        ))}
                    </View>

                    <View style={{ minHeight: 350, paddingVertical: 15, gap: 16 }}>
                        {bone(90, 18)}
                        {[1, 2, 3].map((item) => (
                            <View key={item} style={{ gap: 8 }}>
                                {bone("40%", 12)}
                                {bone("95%", 60, 12)}
                            </View>
                        ))}
                    </View>

                </ScrollView>
            </View>
        </View>
    );
};