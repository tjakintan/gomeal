import { Button } from "@/components/ButtonComponent";
import { BackIcon, ServingsIcon, SmsIcon, TimerIcon, XIcon, CookIcon } from "@/icons/Icon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { Dimensions, StyleSheet, Text, View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
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

type CookMainScreenProps = {
  post_id: number;
  dark?: boolean;
  onClose?: () => Promise<void> | void;
};

export const CookMainScreen: React.FC<CookMainScreenProps> = ({
    post_id,
    dark = false,
    onClose
}) => {

    const { user } = useUser();
    const { width, height } = useWindowDimensions();

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { selectedPost, loadingPost, clearSelectedPost, updatePostEverywhere } = useFeed();

    //console.log(selectedPost)

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
        ? Math.min(descriptionSectionHeight + 25, height * 0.895)
        : height * 0.4;

    const snapPoints = useMemo(
        () => [collapsedSnapPoint, height * 0.995],
        [collapsedSnapPoint, height]
    );

    const animatedSheetPosition = useSharedValue(height);

    const handleBack = async () => {
        clearSelectedPost();

        if (onClose) {
            await onClose();
            return;
        }

        await closeCook();
    };

    const imageAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: animatedSheetPosition.value + 40,
        };
    });

    const didSnapInitial = useRef(false);

    useEffect(() => {
        if (descriptionSectionHeight && !didSnapInitial.current) {
            didSnapInitial.current = true;
            sectionSheetRef.current?.snapToIndex(0);
        }
    }, [descriptionSectionHeight]);

    // ── render loading ───────────────────────────────────────────────────────────────
    if (loadingPost || !selectedPost) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <SpinningLogoImage size={50} />
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>

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
                        borderWidth: 3,
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
            <View
                style={{
                    position: "absolute",
                    top: 5,
                    left: 15,
                    right: 15,
                    height: 50,
                    alignItems: "center",
                    flexDirection: "row",
                    overflow: "hidden",
                    gap: 8,
                }}
            >
                {/* Close */}
                <Button style={{ backgroundColor: colors.danger }} onPress={handleBack} background>
                    <XIcon color={`white`} size={25} />
                </Button>

                {/* Dish name — takes remaining space */}
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <SectionHeader
                        title={selectedPost?.info?.dish_name}
                        titleStyle={{ flexShrink: 1 }}
                        titleClassName={textStyles.h3}
                        showBackground
                        dark={dark}
                    />
                </View>

                {/* Like */}
                <Button
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 999,
                        borderWidth: 2,
                        backgroundColor: colors.secondaryCard,
                        borderColor: colors.background,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                    onPress={handleStar}
                >
                    <FeedStarIcon
                        color={colors.text}
                        fillColor="yellow"
                        starred={isStarred}
                        size={35}
                    />
                </Button>
            </View>

            <BottomSheet
                ref={sectionSheetRef}
                index={0}
                bottomInset={125}
                style={{ zIndex: 3 }}
                snapPoints={snapPoints}
                enableDynamicSizing={false}
                enableContentPanningGesture
                enableHandlePanningGesture
                animatedPosition={animatedSheetPosition}
                backgroundStyle={{
                    backgroundColor: colors.background,
                    borderRadius: 30,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                }}
                handleComponent={() => null}
            >
                <BottomSheetScrollView
                    nestedScrollEnabled={true}
                    style={{
                        flex: 1,
                        borderRadius: 30,
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        paddingTop: 25,
                        paddingHorizontal: 5,
                        overflow: "hidden",
                    }}
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
                                            className={textStyles.sectionText}
                                            style={{ fontSize: 13, fontWeight: "500" }}
                                        >
                                            {shownDescription}
                                            {isLong && (
                                                <Text
                                                    className={textStyles.small}
                                                    style={{ color: colors.button, fontSize: 13, fontWeight: "700" }}
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
                                        borderWidth: 2,
                                        borderColor: colors.card,
                                        flexDirection: "row",
                                        overflow: "hidden",
                                        backgroundColor: colors.secondaryCard,
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
                                        backgroundColor: colors.secondaryCard,
                                        borderRadius: 15,
                                        borderWidth: 2,
                                        borderColor: colors.card,
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
                                            borderWidth: 2,
                                            gap: 10,
                                            paddingHorizontal: 20,
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            borderColor: colors.card,
                                            backgroundColor: colors.secondaryCard,
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
                            height: 350,
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
                        <StepsScreen dark={dark} steps={selectedPost.steps ?? []} />
                    </View>

                    {/* ── Done button ── */}
                    <Button
                        onPress={handleDone}
                        style={{
                            height: 60,
                            marginHorizontal: 15,
                            marginVertical: 20,
                            borderRadius: 25,
                            backgroundColor: hasCooked ? colors.card : colors.button,
                            justifyContent: "center",
                            alignItems: "center",
                            opacity: hasCooked ? 0.6 : 1,
                        }}
                    >
                        <Text
                            className={textStyles.bodyMedium}
                            style={{
                                color: hasCooked ? colors.secondaryText : "#1a1a1a",
                                fontWeight: "700",
                            }}
                        >
                            {hasCooked ? "✓ Cooked!" : "Done Cooking"}
                        </Text>
                    </Button>

                </BottomSheetScrollView>
            </BottomSheet>

            <BottomSheet
                ref={messageSheetRef}
                index={-1}
                bottomInset={125}
                snapPoints={[525]}
                enablePanDownToClose
                backgroundStyle={{ backgroundColor: "transparent", borderRadius: 40 }}
                handleComponent={() => null}
            >
                <GomealGlassView glassEffectStyle="clear" style={{ height: 520, marginHorizontal: 10, borderRadius: 50 }}>
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
                            height: 500,
                            marginTop: 10,
                            marginHorizontal: 10,
                            overflow: "hidden",
                            alignSelf: "center",
                            backgroundColor: colors.background,
                            borderRadius: 40,
                        }}
                    >
                        {selectedPost && (
                            <MessageScreen receiver_sub={selectedPost?.user_sub} onClose={() => messageSheetRef.current?.close()} />
                        )}
                    </BottomSheetView>
                </GomealGlassView>
            </BottomSheet>

        </View>
    );
};