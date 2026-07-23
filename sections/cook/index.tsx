import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { BackIcon, ServingsIcon, SmsIcon, TimerIcon, XIcon, CookIcon, CookingIcon, CookedIcon, InfoIcon, ReportIcon, MoreIcon } from "@/icons/Icon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { Dimensions, Animated as AnimatedRN, StyleSheet, Text, View, ScrollView, Pressable, useWindowDimensions, TouchableOpacity } from "react-native";
import Animated, {
    Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SpinningLogoImage } from "@/utils/Logo";
import { Media } from "@/media/media";
import { useFeed } from "@/stores/useFeed";
import { IngredientScreen } from "./ingredient";
import { SectionHeader } from "@/components/SectionComponent";
import { useCook } from "@/stores/useCook";
import { useCart } from "@/stores/useCart";
import { GroceryMainScreen } from "../user/grocery";
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { AvatarRender } from "@/dashboard/Avatar";
import { useUser } from "@/stores/useUser";
import MessageScreen from "../messages/messages";
import GomealGlassView from "@/components/GlassComponent";
import { StepsScreen } from "./steps";
import { FeedLoveIcon, FeedStarIcon } from "@/icons/feed_icon";
import { useAvatarMood } from "@/dashboard/store/useAvatar";
import { setFeedActionCount } from "@/api/feed.api";
import { FeedActionType } from "@/types/feed.types";
import { useReward } from "@/dashboard/store/useReward";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReport } from "@/stores/useReport";
import { FEED_CARD_PROFILE_RADIUS } from "../feed/feedProfile";
import { BOTTOM_HEIGHT, BOTTOM_INSETS, BOTTOM_SNAP_POINTS } from "@/types";
import { useOverlay } from "@/stores/useOverlay";
import { DietaryRender, DifficultyRender, NutritionRender } from "@/utils/food";
import { capitalize } from "@/utils/text";
import { NAV_SIZE } from "../Navigate";
import { GradientHeader } from "@/components/GradientComponent";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";

type CookMainScreenProps = {
  post_id: number;
  dark?: boolean;
  onClose?: () => Promise<void> | void;
  chromeAnim: AnimatedRN.Value
};

export const CookMainScreen: React.FC<CookMainScreenProps> = ({
    post_id,
    dark = false,
    chromeAnim,
    onClose
}) => {

    const { user } = useUser();
    const { width, height } = useWindowDimensions();

    const { reward } = useReward();
    const { reportTarget, loadingReport } = useReport();

    const { openOverlay } = useOverlay();

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { selectedPost, loadingPost, clearSelectedPost, updatePostEverywhere } = useFeed();

    const { closeCook, cookTime, servings, setCookPost } = useCook();
    const setMood = useAvatarMood((s) => s.setMood);

    const messageSheetRef = useRef<BottomSheet>(null);
    const sectionSheetRef = useRef<BottomSheet>(null);

    const [readMore, setReadMore] = useState(false);
    const description = selectedPost?.info?.dish_description ?? "";
    const limit = 80;
    const isLong = description.length > limit;

    const [descriptionSectionHeight, setDescriptionSectionHeight] = useState(0);
    const shownDescription = !readMore && isLong ? description.slice(0, limit).trim() : description;

    const insets = useSafeAreaInsets();
    const [showMenuRow, setShowMenuRow] = useState(false);
    const [isChromeHidden, setIsChromeHidden] = useState(false);

    const messageSheetAnimatedIndex = useSharedValue(-1);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            messageSheetAnimatedIndex.value,
            [0, 1],
            [1, 0],
            Extrapolation.CLAMP
        ),
        transform: [
            {
                translateY: interpolate(
                    messageSheetAnimatedIndex.value,
                    [0, 1],
                    [0, -20],
                    Extrapolation.CLAMP
                ),
            },
        ],
    }));

    // ── star state ──────────────────────────────────────────────────────────
    const userActions: FeedActionType[] = selectedPost?.user_actions ?? [];
    const isStarred = userActions.includes("post_star");
    const [animateStar, setAnimateStar] = useState(0);

    const handleStar = async () => {
        if (!selectedPost) return;

        const alreadyStarred = userActions.includes("post_star" as FeedActionType);
        const delta = alreadyStarred ? -1 : 1;

        if (!alreadyStarred) {
            setAnimateStar((prev) => prev + 1);
            setMood("focused", 3000);
        }

        updatePostEverywhere(post_id, (post) => {
            const currentActions: FeedActionType[] = post.user_actions ?? [];
            const nextActions = alreadyStarred
                ? currentActions.filter((a: FeedActionType) => a !== "post_star")
                : [...currentActions, "post_star" as FeedActionType];

            return {
                ...post,
                user_actions: nextActions,
                action_counts: {
                    ...post.action_counts,
                    post_star: Math.max((post.action_counts?.post_star ?? 0) + delta, 0),
                },
            };
        });

        try {
            await setFeedActionCount(post_id, "post_star");
        } catch (err) {
            // rollback
            updatePostEverywhere(post_id, (post) => {
                const currentActions: FeedActionType[] = post.user_actions ?? [];
                const rolledBack = alreadyStarred
                    ? [...currentActions, "post_star" as FeedActionType]
                    : currentActions.filter((a: FeedActionType) => a !== "post_star");

                return {
                    ...post,
                    user_actions: rolledBack,
                    action_counts: {
                        ...post.action_counts,
                        post_star: Math.max((post.action_counts?.post_star ?? 0) - delta, 0),
                    },
                };
            });
            console.error("[cook] star failed:", err);
        }
    };

    // ── done / post_cook ────────────────────────────────────────────────────
    const hasCooked = userActions.includes("post_cook" as FeedActionType);

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

        setMood("excited", 3000);

        try {
            await setFeedActionCount(post_id, "post_cook");
            await reward("COOK_POST"); 
        } catch (err) {
            // rollback
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
            console.error("[cook] post_cook failed:", err);
        }
    };

    // ── bottom sheet snap ───────────────────────────────────────────────────
    const collapsedSnapPoint = descriptionSectionHeight
        ? Math.min(descriptionSectionHeight + NAV_SIZE, height * 0.895)
        : height * 0.4;

    const snapPoints = useMemo(
        () => [
            collapsedSnapPoint,
            isChromeHidden
                ? height - DASHBOARD_HEIGHT
                : height - DASHBOARD_HEIGHT - (BOTTOM_INSETS * 2 / 3),
        ],
        [collapsedSnapPoint, height, isChromeHidden]
    );

    const animatedSheetPosition = useSharedValue(height);

    // ── Go prev section and report ───────────────────────────────────────────────────
    const handleBack = async () => {
        clearSelectedPost();

        if (onClose) {
            await onClose();
            return;
        }

        await closeCook();
    };

    const handleReport = async () => {
        if (!selectedPost?.post_id || loadingReport) return;
        await reportTarget(selectedPost.post_id, "post");
        setShowMenuRow(false);
        await handleBack(); 
    };

    const imageAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: animatedSheetPosition.value + 40,
        };
    });

    const didSnapInitial = useRef(false);

    useEffect(() => {
        if (!chromeAnim) return;

        const currentValue = (chromeAnim as any).__getValue();
        setIsChromeHidden(currentValue >= 0.99);

        const id = chromeAnim.addListener(({ value }) => {
            setIsChromeHidden(value >= 0.99);
        });
        return () => chromeAnim.removeListener(id);
    }, [chromeAnim]);

    useEffect(() => {
        if (descriptionSectionHeight && !didSnapInitial.current) {
            didSnapInitial.current = true;
            sectionSheetRef.current?.snapToIndex(0);
        }
    }, [descriptionSectionHeight]);

    useEffect(() => {
        if (!selectedPost || loadingPost) return;
        reward("VIEW_POST");
    }, [selectedPost?.post_id]);

    // ── render loading ───────────────────────────────────────────────────────────────
    if (loadingPost || !selectedPost) {
        return <EmptyCookScreen dark={dark} chromeHidden={(chromeAnim as any).__getValue() >= 0.99}/>;
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

            <Animated.View
                style={[
                    {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        width,
                        overflow: "hidden",
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        borderWidth: isChromeHidden ? 0 : 3,
                        borderColor: colors.secondaryCard,
                        backgroundColor: colors.background,
                    },
                    imageAnimatedStyle,
                ]}
            >
                <Media
                    uri={selectedPost?.info?.dish_media_url}
                    mediaType={selectedPost?.info?.dish_media_type ?? "image"}
                    muteControl="bottomRow"
                    bottomControlOffset={50}
                    iconSize={35}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        borderRadius: 28,
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                    }}
                />
            </Animated.View>

            {/* ── Header: X | dish name | like ── */}
            <Animated.View
                style={[
                    {
                        position: "absolute",
                        top: isChromeHidden ? insets.top : 5,
                        height: 60,
                        paddingHorizontal: 10,
                        left: 15,
                        right: 15,
                        alignItems: "center",
                        flexDirection: "row",
                        gap: 8,
                        zIndex: 3,
                        elevation: 3,
                    },
                    headerAnimatedStyle,
                ]}
            >
                {/* Close */}
                <Button onPress={handleBack} clearBackground>
                    <XIcon color={colors.danger} size={25} />
                </Button>

                {/* Dish name — takes remaining space */}
                <View 
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "flex-start",
                        paddingVertical: 3,
                        paddingHorizontal: 10,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: colors.secondaryCard,
                        backgroundColor: colors.card
                    }}
                >
                    <Text
                        className={textStyles.h3}

                    >
                        {selectedPost?.info?.dish_name}
                    </Text>
                </View>
        
                {selectedPost?.user_sub !== user?.sub && (
                    <>
                        {/* star */}
                        <Button
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: 999,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                            clearBackground
                            onPress={handleStar}
                        >
                            <FeedStarIcon
                                color={"white"}
                                fillColor="yellow"
                                starred={isStarred}
                                size={35}
                            />
                        </Button>
                    
                        {/* more menu */}
                        <ExpandingButton
                            expanded={showMenuRow}
                            onPress={() => setShowMenuRow(true)}
                            expandedChildren={
                                <View
                                    style={{
                                        gap: 5,
                                        overflow: "hidden",
                                        minWidth: 150,
                                    }}
                                >
                                    <Button
                                        onPress={() => {
                                            setShowMenuRow(false);
                                            openOverlay({
                                                title: "Info",
                                                custom: (
                                                    <View style={{ flex: 1}}>
                                                        <GradientHeader
                                                            baseColor={colors.background}
                                                        >
                                                            <Text className={textStyles.body} style={{ color: colors.secondaryText }}>
                                                                {`Please read the nutritional, level of difficulty and dietary specifications of ${capitalize(selectedPost?.firstName ?? "")} ${capitalize(selectedPost?.lastName ?? "")}'s ${selectedPost?.info?.dish_name}`}
                                                            </Text>
                                                        </GradientHeader>
                                                        <ScrollView style={{ paddingTop: 80 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
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
                                            backgroundColor: colors.background
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 16 }}>Info</Text>
                                        <InfoIcon color={colors.text} size={18} />
                                    </Button>

                                    <Button
                                        onPress={handleReport}
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
                                        <Text style={{ color: colors.danger, fontSize: 16 }}>Report</Text>
                                        {loadingReport ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <ReportIcon color={colors.danger} size={18} />
                                        )}
                                    </Button>
                                </View>
                            }
                            expandedStyle={{ borderRadius: 20 }}
                            style={{
                                width: 50,
                                height: 50,
                                marginTop: showMenuRow ? 50 : 0,
                                borderRadius: 999,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                            clearBackground
                        >
                            <MoreIcon color={"white"} size={18} rotate={90} />
                        </ExpandingButton>
                    </>
                )}

            </Animated.View>

            <BottomSheet
                ref={sectionSheetRef}
                index={0}
                bottomInset={isChromeHidden ? 0 : BOTTOM_INSETS}
                style={{ zIndex: 10 }}
                snapPoints={snapPoints}
                enableDynamicSizing={false}
                enableContentPanningGesture
                enableHandlePanningGesture
                animatedPosition={animatedSheetPosition}
                backgroundStyle={{
                    backgroundColor: colors.background, 
                    borderRadius: 30,
                }}
                handleIndicatorStyle={{
                    backgroundColor: colors.secondaryCard,
                    width: 50,
                    height: 8,
                    borderRadius: 999,
                }}
            >
                <BottomSheetScrollView
                    nestedScrollEnabled={true}
                    style={{
                        flex: 1,
                        margin: 5,
                        borderRadius: 30,
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        paddingTop: 25,
                        paddingHorizontal: 5,
                        overflow: "hidden",
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        onLayout={(event) => {
                            setDescriptionSectionHeight(event.nativeEvent.layout.height);
                        }}
                    >
                        <SectionHeader
                            title="Description"
                            titleClassName={textStyles.bodyMedium}
                            leftIcon={<CookIcon color={colors.button} />}
                            showBackground
                            dark={dark}
                        />

                        <View
                            style={{
                                minHeight: 150,
                                borderTopWidth: 2,
                                borderBottomWidth: 2,
                                borderColor: colors.secondaryCard,
                            }}
                        >
                            <View
                                style={{
                                    minHeight: 60,
                                    maxHeight: 200,
                                    marginHorizontal: 5,
                                    padding: 5,
                                    overflow: "hidden",
                                }}
                            >
                                <ScrollView
                                    scrollEnabled={readMore}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                >
                                    <Pressable onPress={() => setReadMore((prev) => !prev)}>
                                        <Text
                                            className={textStyles.body}
                                            style={{ fontSize: 13, fontWeight: "500" }}
                                        >
                                            {shownDescription}
                                            {isLong && (
                                                <Text
                                                    className={textStyles.small}
                                                    style={{ color: colors.button, fontWeight: "700" }}
                                                >
                                                    {readMore ? "  Show less..." : "  Read more..."}
                                                </Text>
                                            )}
                                        </Text>
                                    </Pressable>
                                </ScrollView>
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
                                    <View
                                        style={{
                                            height: "100%",
                                            width: 50,
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
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
                                    <View
                                        style={{
                                            height: "100%",
                                            width: 50,
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
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
                                        <AvatarRender avatar={selectedPost?.avatar} size={32} dark={dark} background showBadge />

                                        <View style={{ flex: 1 }}>
                                            <Text className={textStyles.bodyMedium} numberOfLines={1} style={{ color: colors.text }}>
                                                {selectedPost?.profile_name}
                                            </Text>
                                            <Text className={textStyles.small} numberOfLines={1} style={{ color: colors.secondaryText }}>
                                                {selectedPost?.firstName} {selectedPost?.lastName}
                                            </Text>
                                        </View>

                                        <Button onPress={() => messageSheetRef?.current?.expand()} background>
                                            <SmsIcon color={colors.text} />
                                        </Button>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    <View
                        style={{
                            minHeight: 210,
                            maxHeight: 350,
                            borderBottomWidth: 2,
                            borderColor: colors.secondaryCard,
                        }}
                    >
                        <IngredientScreen dark={dark} />
                    </View>

                    {/* ── Steps ── */}
                    <View
                        style={{
                            minHeight: 350,
                            maxHeight: 500,
                            borderBottomWidth: 2,
                            borderColor: colors.secondaryCard,
                        }}
                    >
                        <StepsScreen dark={dark} dishName={selectedPost.info.dish_name} steps={selectedPost.steps ?? []} />
                    </View>

                    {/* ── Done button ── */}
                    <Button
                        onPress={handleDone}
                        style={{
                            height: 60,
                            width: 150,
                            gap: 10,
                            marginHorizontal: 15,
                            marginVertical: 20,
                            borderRadius: 25,
                            backgroundColor: hasCooked ? colors.card : colors.button,
                            justifyContent: "center",
                            alignItems: "center",
                            alignSelf: "center",
                            flexDirection: "row-reverse",
                            opacity: hasCooked ? 0.6 : 1,
                        }}
                    >
                        {hasCooked ? (
                            <>
                                <Text
                                    className={textStyles.bodyMedium}
                                    style={{
                                        fontWeight: "700",
                                    }}
                                >
                                    Done
                                </Text>
                                <CookedIcon color={colors.text} size={20} />
                            </>
                        ) : (
                            <>
                                <Text
                                    className={textStyles.bodyMedium}
                                    style={{
                                        color: "white",
                                        fontWeight: "700",
                                    }}
                                >
                                    Cooking
                                </Text>
                                <CookingIcon color={colors.text} size={20} />
                            </>
                        )}
                    </Button>

                </BottomSheetScrollView>
            </BottomSheet>

            <BottomSheet
                ref={messageSheetRef}
                index={-1}
                snapPoints={BOTTOM_SNAP_POINTS}
                animatedIndex={messageSheetAnimatedIndex}
                enablePanDownToClose
                backgroundStyle={{ backgroundColor: "transparent", borderRadius: 40 }}
                handleComponent={() => null}
            >
                <View  
                    style={{ 
                        flex: 1, 
                        borderTopLeftRadius: FEED_CARD_PROFILE_RADIUS + 10,
                        borderTopRightRadius: FEED_CARD_PROFILE_RADIUS + 10,
                    }}
                >
                    <View
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            opacity: 0.85,
                            backgroundColor: colors.secondaryCard,
                            borderRadius: 50,
                        }}
                    />
                    <BottomSheetView
                        style={{
                            height: isChromeHidden? BOTTOM_HEIGHT - NAV_SIZE : 450,
                            marginTop: 10,
                            marginHorizontal: 10,
                            overflow: "hidden",
                            alignSelf: "center",
                            backgroundColor: colors.background,
                            borderRadius: 40,
                        }}
                    >
                        {selectedPost && (
                            <MessageScreen receiver_sub={selectedPost?.user_sub} onClose={() => messageSheetRef.current?.close()} showBack dark={dark}/>
                        )}
                    </BottomSheetView>
                </View>
            </BottomSheet>

        </View>
    );
};

const EmptyCookScreen = ({
    dark,
    chromeHidden = false,
}: {
    dark?: boolean;
    chromeHidden?: boolean;
}) => {
    const { colors } = useTheme(dark ? "dark" : undefined);
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const opacity = useRef(new AnimatedRN.Value(0.45)).current;

    useEffect(() => {
        const animation = AnimatedRN.loop(
            AnimatedRN.sequence([
                AnimatedRN.timing(opacity, {
                    toValue: 0.9,
                    duration: 700,
                    useNativeDriver: true,
                }),
                AnimatedRN.timing(opacity, {
                    toValue: 0.45,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, []);

    const bone = (
        width: number | `${number}%`,
        height: number,
        radius = 8
    ) => (
        <AnimatedRN.View
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor: colors.card,
                opacity,
            }}
        />
    );

    const imageHeight = height * 0.45;

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            {/* Media */}
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
                    borderWidth: chromeHidden ? 0 : 3,
                    borderColor: colors.secondaryCard,
                }}
            >
                {bone("100%", imageHeight, 0)}
            </View>

            {/* Header */}
            <View
                style={{
                    position: "absolute",
                    top: chromeHidden ? insets.top : 5,
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

                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                    }}
                >
                    {bone("55%", 24, 10)}
                </View>

                {bone(40, 40, 999)}
                {bone(40, 40, 999)}
            </View>

            {/* Sheet */}
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
                    contentContainerStyle={{
                        paddingTop: 20,
                        paddingHorizontal: 15,
                        paddingBottom: chromeHidden ? 30 : 150,
                    }}
                >
                    {/* Handle */}
                    <View
                        style={{
                            alignItems: "center",
                            marginBottom: 20,
                        }}
                    >
                        {bone(60, 5, 999)}
                    </View>

                    {/* Description */}
                    <View>
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 15,
                            }}
                        >
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
                            <View
                                style={{
                                    gap: 10,
                                    paddingHorizontal: 5,
                                }}
                            >
                                {bone("95%", 12)}
                                {bone("85%", 12)}
                                {bone("70%", 12)}
                            </View>

                            {/* Time / Servings */}
                            <View
                                style={{
                                    height: 75,
                                    flexDirection: "row",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    gap: 20,
                                }}
                            >
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

                            {/* Profile */}
                            <View
                                style={{
                                    width: "100%",
                                    height: 75,
                                    paddingHorizontal: 10,
                                    justifyContent: "center",
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 12,
                                    }}
                                >
                                    {bone(32, 32, 999)}

                                    <View
                                        style={{
                                            flex: 1,
                                            gap: 6,
                                        }}
                                    >
                                        {bone("50%", 14)}
                                        {bone("35%", 10)}
                                    </View>

                                    {bone(40, 40, 12)}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Ingredients */}
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
                            <View
                                key={item}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 12,
                                }}
                            >
                                {bone(36, 36, 10)}
                                {bone("65%", 12)}
                            </View>
                        ))}
                    </View>

                    {/* Steps */}
                    <View
                        style={{
                            minHeight: 350,
                            paddingVertical: 15,
                            gap: 16,
                        }}
                    >
                        {bone(90, 18)}

                        {[1, 2, 3].map((item) => (
                            <View
                                key={item}
                                style={{
                                    gap: 8,
                                }}
                            >
                                {bone("40%", 12)}
                                {bone("95%", 60, 12)}
                            </View>
                        ))}
                    </View>

                    {/* Cooking Button */}
                    <View
                        style={{
                            alignItems: "center",
                            marginVertical: 20,
                        }}
                    >
                        <View
                            style={{
                                width: 150,
                                height: 60,
                                borderRadius: 25,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                            }}
                        >
                            {bone(20, 20, 999)}
                            {bone(60, 14)}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};
