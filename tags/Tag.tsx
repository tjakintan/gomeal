import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp, Animated } from "react-native";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import {  difficultyColors } from "@/types/styles.types";
import { DietaryData } from "@/types/food.types";
import { formatCount } from "@/utils/time";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";
import {
    VegetarianIcon, VeganIcon, GlutenFreeIcon,
    DairyFreeIcon, NutFreeIcon, KetoIcon,
    HalalIcon, PescatarianIcon, KosherIcon, VegetablesIcon,
    MoreIcon
} from "@/icons/Icon";
import { FeedActionType, FeedCard } from "@/types/feed.types";
import { DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { Media } from "@/media/media";
import { LinearGradient } from "expo-linear-gradient";
import { Mood, useAvatarMood } from "@/dashboard/store/useAvatar";
import { useFeed } from "@/stores/useFeed";
import { setFeedActionCount } from "@/api/feed.api";
import { FeedLoveIcon } from "@/icons/feed_icon";
import { useSettingsStore } from "@/stores/useSettings";

const GAP = 5; 
const CONTENT_MIN_RATIO = 0.4;
const CONTENT_MAX_RATIO = 0.5;

type Props = {
    card: FeedCard; 
    onPressProfile?: () => void;
    onPressMedia?: () => void;
    onPressInfo?: () => void;
    style?: StyleProp<ViewStyle>;
    flipEnabled?: boolean;
    height?: number;
    width?: number | `${number}%`;
};

const Tag: React.FC<Props> = ({
    card, onPressProfile, onPressMedia, onPressInfo, style, flipEnabled,
    height = 285,
    width = 195,
}) => {
    const { info, post_id, tag_color, dietary,num_ingredients, profile_name, level, avatar, action_counts } = card;

    // zustand
    const { colors, textStyles } = useTheme();
    const allowFeedColors = useSettingsStore((state) => state.settings.feed.allowFeedColors);

    // Render dietary icons 
    type IconComponent = React.FC<{ size?: number; color?: string }>;

    const dietaryIcons: Partial<Record<keyof DietaryData, IconComponent>> = {
        vegetarian:  VegetarianIcon,
        vegan:       VeganIcon,
        gluten_free: GlutenFreeIcon,
        dairy_free:  DairyFreeIcon,
        nut_free:    NutFreeIcon,
        keto:        KetoIcon,
        halal:       HalalIcon,
        pescatarian: PescatarianIcon,
        kosher:      KosherIcon,
    };

    const activeDiets = (Object.keys(dietaryIcons) as (keyof DietaryData)[]).filter(
        (key) => dietary[key] === true
    );

    const usableHeight = height - GAP; 
    const contentHeight = Math.round(
        Math.min(
            Math.max(usableHeight * CONTENT_MIN_RATIO, usableHeight * CONTENT_MIN_RATIO),
            usableHeight * CONTENT_MAX_RATIO
        )
    );
    const imageHeight = usableHeight - contentHeight;

    // ── heart state ─────────────────────────────────────────────────────────
    const setMood = useAvatarMood((s) => s.setMood);
    const { updatePostEverywhere } = useFeed();
    const userActions: FeedActionType[] = card.user_actions ?? [];
    const isLoved = userActions.includes("post_love" as FeedActionType);
    const [animateLove, setAnimateLove] = useState(0);
    const [avatarMood, setAvatarMood] = useState<Mood>("idle");

    const handleLove = async () => {
        if (!post_id) return;

        const alreadyLoved = userActions.includes("post_love" as FeedActionType);
        const delta = alreadyLoved ? -1 : 1;

        if (!alreadyLoved) {
            setAnimateLove((prev) => prev + 1);

            setAvatarMood("love");

            setTimeout(() => {
                setAvatarMood("idle");
            }, 3000);
        }

        updatePostEverywhere(post_id, (post) => {
            const currentActions: FeedActionType[] = post.user_actions ?? [];
            const nextActions = alreadyLoved
                ? currentActions.filter((a: FeedActionType) => a !== "post_love")
                : [...currentActions, "post_love" as FeedActionType];

            return {
                ...post,
                user_actions: nextActions,
                action_counts: {
                    ...post.action_counts,
                    post_love: Math.max((post.action_counts?.post_love ?? 0) + delta, 0),
                },
            };
        });

        try {
            await setFeedActionCount(post_id, "post_love");
        } catch (err) {
            // rollback
            updatePostEverywhere(post_id, (post) => {
                const currentActions: FeedActionType[] = post.user_actions ?? [];
                const rolledBack = alreadyLoved
                    ? [...currentActions, "post_love" as FeedActionType]
                    : currentActions.filter((a: FeedActionType) => a !== "post_love");

                return {
                    ...post,
                    user_actions: rolledBack,
                    action_counts: {
                        ...post.action_counts,
                        post_love: Math.max((post.action_counts?.post_love ?? 0) - delta, 0),
                    },
                };
            });
            console.error("[cook] love failed:", err);
        }
    };
        
    return (

        <View
            style={[
                {
                    height, width, gap: 10, 
                    borderRadius: 20,
                    backgroundColor: allowFeedColors ? tag_color ?? colors.card : colors.card,
                    justifyContent: "center",
                    alignItems: "center"
                }, style,
            ]}
        >

            {/* image box */}
            <View 
                style={{ 
                    flex: 1, 
                    width: "100%", 
                    paddingHorizontal: 7,
                    paddingVertical: 15
                }}
            >
                <View
                    style={{
                        flex: 1,
                        width: "100%",
                        borderRadius: 15,
                    }}
                >

                    <Media
                        uri={info.dish_media_url}
                        mediaType={info.dish_media_type ?? "image"}
                        style={{
                            flex: 1,
                            borderRadius: 15
                        }}
                        onPress={onPressMedia}
                        //useSettingsAutoPlay={false}
                        iconSize={30}
                        muteControl="bottomRow"
                    />

                </View>

            </View>

            <View
                style={{
                    position: "absolute",
                    top: -20,
                    left: 10,
                    alignItems: "flex-end",
                    flexDirection: "row",
                    gap: 2,
                }}
            >
                <Button
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 999,
                        padding: 0,
                    }}
                    clearBackground
                    onPress={handleLove}
                >
                    <FeedLoveIcon
                        color={colors.text}
                        fillColor="red"
                        liked={isLoved}
                        animationKey={animateLove}
                        size={25}
                    />
                </Button>

                <Text className={textStyles.caption} style={{ color: colors.text }}>
                    {formatCount(action_counts?.post_love ?? 0)}
                </Text>
            </View>

            {/* content box */}
            <View
                style={{
                    width: "100%",
                    gap: 5,
                    flexDirection: "column",
                    padding: 5,
                }}
            >

                <Button 
                    onPress={onPressProfile} 
                    style={{
                        height: "auto",
                        width: "100%",
                        padding: 0,
                        flexDirection: "row",
                        alignItems: "flex-end",
                        justifyContent: "flex-start",
                        gap: 5,
                        backgroundColor: "transparent"
                    }} className="w-full"
                    background
                >

                    <View
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: colors.secondaryCard,
                            borderRadius: 25,
                            opacity: 0.2
                        }}
                    />
                        {avatar && (
                            <DynamicAvatarRenderer
                                avatar={avatar}
                                background
                                size={27}
                                mood={avatarMood}
                            />
                        )}

                    {profile_name && (
                        <Text style={{ maxWidth: 100 }} className={textStyles.sectionText} numberOfLines={1} ellipsizeMode="tail">
                            {profile_name}
                        </Text>
                    )}

                </Button>

                <Button
                    style={{
                        height: 30,
                        width: "auto",
                        paddingVertical: 0,
                        alignSelf: "center",
                        overflow: "hidden",
                        backgroundColor: "transparent"
                    }}
                    className="w-full"
                    onPress={onPressInfo}
                >

                    <View
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: colors.secondaryCard,
                            borderRadius: 25,
                            opacity: 0.4
                        }}
                    />

                    <View 
                        style={{ 
                            flex: 1, 
                            gap: 5,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center"
                        }} 
                    >

                        {/* dif */}
                        <View className="justify-center">
                            {info.dish_difficulty ? (
                                <>
                                    {(["Hard", "Medium", "Easy"] as const).map((level) =>
                                        info.dish_difficulty === level ? (
                                            <View
                                                key={level}
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: 7,
                                                    backgroundColor: difficultyColors[level],
                                                }}
                                            />
                                        ) : null
                                    )}
                                </>
                            ) : (
                                <View 
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 999,
                                        backgroundColor: colors.card,
                                    }}
                                />
                            )}

                        </View>
                        
                        {/* name */}
                        <View className="flex-1 justify-center">
                            {info.dish_name ? (
                                <Text className={textStyles.bodyMedium} numberOfLines={1} ellipsizeMode="tail">
                                    {info.dish_name}
                                </Text>
                            ) : (
                                <Text className={` font-thin ${textStyles.body}`} numberOfLines={1} ellipsizeMode="tail">
                                    Name
                                </Text>
                            )}

                        </View>

                        {/* Active dietary icons */}
                        {activeDiets.length > 0 && (
                            <View
                                style={{
                                    height: 25,
                                    width: 25,
                                    borderRadius: 999,
                                    overflow: "hidden",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: colors.button
                                }}
                            >
                                {activeDiets.length > 1 ? (
                                    <MoreIcon color={colors.text} size={15} />
                                ) : (
                                    activeDiets.map((key) => {
                                        const Icon = dietaryIcons[key]!;
                                        return (
                                            <Icon key={key} size={15} color={colors.text} />
                                        );
                                    })
                                )}
                            </View>
                        )}

                        {/* ingredient count */}
                        <View className="flex-row gap-1 items-end">
                            <Text className={textStyles.h3} style={{ color: colors.text }}>
                                {num_ingredients} 
                            </Text>
                            <Text className={textStyles.small}>
                                ing{num_ingredients !== 1 ? "s" : ""}
                            </Text>
                        </View>
                    </View>

                </Button>
            </View>

        </View>

    );
};

export const EmptyTag: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.3, duration: 700, delay, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1,   duration: 700,         useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    const bone = (w: number | `${number}%` | "auto", h: number, radius = 8, extra?: object) => (
        <Animated.View
            style={{
                width: w, height: h,
                borderRadius: radius,
                backgroundColor: colors.card,
                opacity,
                ...extra,
            }}
        />
    );

    return (
        <View style={{ width: 195, height: 325 }}>

            <View style={{ height: 40, flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 20, paddingBottom: 4 }}>
                {bone(30, 30, 999)}
                {bone("60%", 12, 6)}
            </View>

            <View style={{ height: 285, paddingHorizontal: 5, gap: 5 }}>

                {bone("100%", 185, 16)}

                <Animated.View
                    style={{
                        height: 75, borderRadius: 16,
                        backgroundColor: colors.card,
                        opacity,
                        paddingHorizontal: 14, paddingVertical: 10,
                        justifyContent: "space-between",
                    }}
                >

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {bone(14, 14, 999)}
                        {bone("60%", 12, 6)}
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6 }}>
                        {bone(36, 18, 6)}
                        {bone(50, 32, 999)}
                    </View>

                </Animated.View>

            </View>
        </View>
    );
};

export default Tag;