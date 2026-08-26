import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp, Animated, Pressable } from "react-native";
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
import { capitalize, limitLength } from "@/utils/text";

const GAP = 5; 
const CONTENT_MIN_RATIO = 0.4;
const CONTENT_MAX_RATIO = 0.5;

type Props = {
    card: FeedCard; 
    onPressProfile?: () => void;
    onPressMedia?: (layout: {
        x:number;
        y:number;
        width:number;
        height:number;
    }) => void;
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
    const { info, post_id, firstName, tag_color, lastName, dietary,num_ingredients, profile_name, level, avatar, action_counts } = card;

    // zustand
    const { colors, textStyles } = useTheme();
    const allowFeedColors = useSettingsStore((state) => state.settings.feed.allowFeedColors);

    const mediaRef = useRef<View>(null);

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

    // ── heart state ─────────────────────────────────────────────────────────
    const setMood = useAvatarMood((s) => s.setMood);
    const { updatePostEverywhere } = useFeed();
    const userActions: FeedActionType[] = card.user_actions ?? [];
    const isLoved = userActions.includes("post_love" as FeedActionType);
    const [animateLove, setAnimateLove] = useState(0);

    const handleLove = async () => {
        if (!post_id) return;

        const alreadyLoved = userActions.includes("post_love" as FeedActionType);
        const delta = alreadyLoved ? -1 : 1;

        if (!alreadyLoved) {
            setAnimateLove((prev) => prev + 1);

            setMood("love");

            setTimeout(() => {
                setMood("idle");
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
                    height, width, 
                    borderRadius: 20,
                    borderWidth: allowFeedColors ? 2 : 0,
                    borderColor: colors.secondaryCard,
                    justifyContent: "center",
                    alignItems: "center",
                }, style,
            ]}
        >

            <View 
                style={{ 
                    flex: 1, 
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    overflow: "hidden",
                    width: "100%", 
                }}
            >
                <View
                    ref={mediaRef}
                    style={{
                        flex:1,
                        width:"100%",
                    }}
                >
                    <Media
                        uri={info.dish_media_url}
                        mediaType={info.dish_media_type ?? "image"}
                        style={{
                            flex:1,
                        }}
                        onPress={() => {

                            mediaRef.current?.measureInWindow(
                                (x,y,width,height)=>{

                                    onPressMedia?.({
                                        x,
                                        y,
                                        width,
                                        height
                                    });

                                }
                            );

                        }}
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
                    alignItems: "flex-start",
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
                        fillColor={tag_color ?? "red"}
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
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: 5,
                }}
            >

                <Pressable
                    style={{
                        height: 50,
                        width: "100%",
                        alignItems: "center",
                        flexDirection: "column",
                        paddingHorizontal: 5,
                        justifyContent: "center"
                    }}
                    onPress={onPressInfo}
                >

                    <View
                        style={{
                            flex: 1,
                            gap: 7,
                            width: "100%",
                            flexDirection: "row",
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
                                <Text className={textStyles.body} numberOfLines={1} ellipsizeMode="tail">
                                    {info.dish_name}
                                </Text>
                            ) : (
                                <Text className={` font-thin ${textStyles.body}`} numberOfLines={1} ellipsizeMode="tail">
                                    Name
                                </Text>
                            )}

                        </View>

                    </View>

                    <View
                        style={{
                            gap: 7,
                            width: "100%",
                            flexDirection: "row",
                            alignItems: "flex-end",
                        }}
                    >
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
                            <Text className={textStyles.small} style={{ color: colors.text }}>
                                {num_ingredients} 
                            </Text>
                            <Text className={textStyles.small}>
                                ing{num_ingredients !== 1 ? "s" : ""}
                            </Text>
                        </View>
                    </View>

                </Pressable>

                <Pressable 
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
                    }} 
                >
                    <View
                        style={{
                            flex: 1,
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            alignItems: "flex-start",
                            paddingHorizontal: 5,
                            paddingTop: 2,
                            paddingBottom: 5,
                            //backgroundColor: tag_color ? tag_color : colors.button
                        }}
                    >
                        <Text
                            className={textStyles.body}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                marginRight: 6,
                            }}
                        >
                            {limitLength(info.dish_name, 20)}
                        </Text>

                        <View
                            style={{
                                gap: 2,
                                flexDirection: "row",
                            }}
                        >

                            <DynamicAvatarRenderer
                                avatar={avatar}
                                background
                                size={25}
                            />

                            <View
                                style={{
                                    flex: 1, 
                                    flexDirection: "column",
                                    justifyContent:"flex-end",
                                }}
                            >

                                <Text
                                    className={textStyles.body}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    onPress={onPressProfile}
                                    style={{
                                        color: colors.secondaryText,
                                    }}
                                >
                                    {profile_name}
                                </Text>

                                <View
                                    style={{
                                        gap: 3,
                                        flexDirection: "row",
                                    }}
                                >

                                    <Text
                                        className={textStyles.small}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        onPress={onPressProfile}
                                        style={{
                                            color: colors.text,
                                        }}
                                    >
                                        {capitalize(limitLength(firstName, 10))}
                                    </Text>
            
                                    <Text
                                        className={textStyles.small}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        onPress={onPressProfile}
                                        style={{
                                            color: colors.text,
                                        }}
                                    >
                                        {capitalize(limitLength(lastName ?? "", 15))}
                                    </Text>

                                </View>

                            </View>

                        </View>

                    </View>
                </Pressable>

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