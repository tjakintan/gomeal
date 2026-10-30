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
    MoreIcon,
    StarIcon,
    CookPotIcon,
    ViewsIcon,
    LikeIcon,
    FridgeIcon
} from "@/icons/Icon";
import { FeedActionType, FeedCard } from "@/types/feed.types";
import { DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { Media } from "@/media/media";
import { Mood, useAvatarMood } from "@/stores/useAvatar";
import { useFeed, useFeedPlayback } from "@/stores/useFeed";
import { setFeedActionCount } from "@/api/feed.api";
import { FeedLoveIcon } from "@/icons/feed_icon";
import { useSettingsStore } from "@/stores/useSettings";
import { capitalize, limitLength } from "@/utils/text";
import { useReel } from "@/stores/useReel";
import { useOverlay } from "@/stores/useOverlay";
import PostStats from "@/components/PostStatsComponent";


type Props = {
    card: FeedCard; 
    dark?: boolean;
    onPressProfile?: () => void;
    onPressMedia?: (layout: {
        x:number;
        y:number;
        width:number;
        height:number;
    }) => void;
    onPressInfo?: () => void;
    style?: StyleProp<ViewStyle>;
    height?: number;
    width?: number | `${number}%`;
};

export const FunctionRow: React.FC<{
    icon: React.ReactNode;
    count: number;
    color: string;
}> = ({ icon, count, color }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {icon}
        <Text style={{ color, fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
            {formatCount(count)}
        </Text>
    </View>
);

const Tag: React.FC<Props> = ({
    card, onPressProfile, onPressMedia, onPressInfo, style, dark,
    height = 285,
    width = 195,
}) => {

    const { info, post_id, firstName, tag_color, lastName, dietary,num_ingredients, profile_name, level, avatar, xp, badge, action_counts, user_actions } = card;

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const allowFeedColors = useSettingsStore((state) => state.settings.feed.allowFeedColors);

    const updatePostEverywhere = useFeed((s) => s.updatePostEverywhere);

    const u_card = useFeed((s) =>
        s.posts.find((post) => String(post.post_id) === String(post_id))
    );

    const openOverlay = useOverlay((s) => s.openOverlay);

    const openStats = () =>
        openOverlay({ custom: <PostStats dark={dark} card={u_card ?? card} /> });

    const counts = u_card?.action_counts ?? action_counts;

    const isReelOrigin = useReel(
        (s) => s.isVisible && s.originPostId === post_id
    );

    const [localMood, setLocalMood] = useState<Mood>("idle");
    const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);


    const mediaRef = useRef<View>(null);


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
        (key) => dietary?.[key] === true
    );

    const globalMuted = useFeedPlayback((s) => s.muted);
    const setGlobalMuted = useFeedPlayback((s) => s.setMuted);
    const isActive = useFeedPlayback((s) => !s.paused && s.activeId === post_id);

    // ── heart state ─────────────────────────────────────────────────────────
    const [animateLove, setAnimateLove] = useState(0);


    const userActions: FeedActionType[] =
        Array.isArray(u_card?.user_actions)
            ? u_card.user_actions
            : Array.isArray(user_actions)
                ? user_actions
                : [];


    const initialLoved = userActions.includes("post_love");


    const [localLoved, setLocalLoved] = useState(initialLoved);
    const [localLoveCount, setLocalLoveCount] = useState(
        u_card?.action_counts?.post_love ??
        action_counts?.post_love ??
        0
    );


    const handleLove = async () => {
        if (!post_id) return;

        // IMPORTANT:
        // Use local state, not userActions, because the post may
        // not exist in useFeed.posts (e.g. ChefNex similar posts).
        const wasLoved = localLoved;
        const nextLoved = !wasLoved;
        const delta = nextLoved ? 1 : -1;

        // Immediately update the UI.
        setLocalLoved(nextLoved);
        setLocalLoveCount((count) => Math.max(count + delta, 0));

        if (nextLoved) {
            setAnimateLove((prev) => prev + 1);

            if (moodTimer.current) clearTimeout(moodTimer.current);
            setLocalMood("love");
            moodTimer.current = setTimeout(() => setLocalMood("idle"), 3000);
        }

        // Sync Zustand if the post happens to be in the store.
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

            // Server is now authoritative for the count.
            if (freshCounts?.post_love !== undefined) {
                setLocalLoveCount(freshCounts.post_love);

                // Also sync Zustand if the post exists there.
                updatePostEverywhere(post_id, (post) => ({
                    ...post,
                    action_counts: {
                        ...post.action_counts,
                        post_love: freshCounts.post_love,
                    },
                }));
            }
        } catch (err) {
            // API failed → restore the UI.
            setLocalLoved(wasLoved);
            setLocalLoveCount((count) =>
                Math.max(count - delta, 0)
            );

            // Roll back Zustand if applicable.
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


    useEffect(() => {
        if (moodTimer.current) clearTimeout(moodTimer.current);
        setLocalMood("idle");
        setLocalLoved(initialLoved);
        setLocalLoveCount(
            u_card?.action_counts?.post_love ??
            action_counts?.post_love ??
            0
        );
    }, [post_id]);


    useEffect(() => {
        return () => {
            if (moodTimer.current) clearTimeout(moodTimer.current);
        };
    }, []);

        
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
                        opacity: isReelOrigin ? 0 : 1,
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
                        iconSize={20}
                        muteControl="bottomRow"
                        startMuted={globalMuted}
                        onMuteChange={setGlobalMuted}
                        autoPlay={isActive ? undefined : false}
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
                        liked={localLoved}
                        animationKey={animateLove}
                        size={25}
                    />
                </Button>
            </View>

            {/* content box */}
            <View
                style={{
                    width: "100%",
                    gap: 3,
                    flexDirection: "column",
                    alignItems: "flex-start",
                }}
            >
                <Button
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 10,
                        paddingHorizontal: 8,
                        paddingTop: 6,
                        paddingBottom: 0,
                        width: "100%",
                    }}
                    onPress={openStats}
                >
                    <FunctionRow
                        icon={<LikeIcon size={16} />}
                        count={counts?.post_love ?? 0}
                        color={colors.text}
                    />
                    <FunctionRow
                        icon={<StarIcon size={14} color="#ffca45" fillColor="#ffca45" />}
                        count={counts?.post_star ?? 0}
                        color={colors.text}
                    />
                    <FunctionRow
                        icon={<CookPotIcon size={14} />}
                        count={counts?.post_cook ?? 0}
                        color={colors.text}
                    />
                    <FunctionRow
                        icon={<ViewsIcon size={14} color={colors.text} />}
                        count={counts?.post_view ?? 0}
                        color={colors.text}
                    />
                </Button>

                <Pressable
                    style={{
                        minHeight: 50,
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
                                }}
                            >
                                {activeDiets.length > 1 ? (
                                    <MoreIcon color={colors.text} size={15} />
                                ) : (
                                    activeDiets.map((key) => {
                                        const Icon = dietaryIcons[key]!;
                                        return (
                                            <Icon key={key} size={19} color={colors.text} />
                                        );
                                    })
                                )}
                            </View>
                        )}

                        {/* ingredient count */}
                        <View
                            style={{
                                gap: 2,
                                flexDirection: "row",
                                alignItems: "flex-end"
                            }}
                        >
                            <FridgeIcon color={"#31cd62"} />

                            <Text className={textStyles.body} style={{ color: colors.text }}>
                                {num_ingredients} 
                            </Text>

                            <Text className={textStyles.small}>
                                ing{num_ingredients !== 1 ? "s" : ""}
                            </Text>

                        </View>
                    </View>

                    <View
                        style={{
                            flex: 1,
                            gap: 7,
                            width: "100%",
                            flexDirection: "row",
                            paddingLeft: 5
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
                            <Text className={textStyles.body} numberOfLines={1} ellipsizeMode="tail" onPress={onPressInfo}>
                                {info?.dish_name}
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
                                level={level}
                                xp={xp}
                                badge={badge}
                                mood={localMood}
                                showBadge
                                showProgress
                                background
                                size={20}
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
                                    onPress={onPressProfile}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                        color: colors.secondaryText,
                                        fontSize: 14,
                                        fontWeight: "500",
                                    }}
                                >
                                    @{profile_name}
                                </Text>

                                <Text
                                    className={textStyles.body}
                                    onPress={onPressProfile}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                        color: colors.text,
                                        fontSize: 14,
                                    }}
                                >
                                    {capitalize(limitLength(firstName, 10))}
                                    {lastName
                                        ? ` ${capitalize(
                                            limitLength(lastName, 10)
                                        )}`
                                        : ""}
                                </Text>

                            </View>

                        </View>

                    </View>
                </Pressable>

            </View>

        </View>

    );
};


export const EmptyTag: React.FC<{
    delay?: number;
    height?: number;
    width?: number | `${number}%`;
}> = ({
    delay = 0,
    height = 325,
    width = 195,
}) => {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: 700,
                    delay,
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
    }, [opacity, delay]);

    const bone = (
        w: number | `${number}%`,
        h: number,
        radius = 8
    ) => (
        <Animated.View
            style={{
                width: w,
                height: h,
                borderRadius: radius,
                backgroundColor: colors.secondaryCard,
                opacity,
            }}
        />
    );

    const mediaHeight = Math.round(height * 0.57);
    const contentHeight = height - mediaHeight - 5;

    return (
        <View
            style={{
                width,
                height,
                overflow: "hidden",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.secondaryCard,
                backgroundColor: colors.background,
            }}
        >
            {/* Avatar and profile name */}
            <View
                style={{
                    height: 40,
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 10,
                }}
            >
                {bone(30, 30, 999)}
                <View style={{ flex: 1, gap: 5 }}>
                    {bone("75%", 10, 5)}
                    {bone("45%", 8, 4)}
                </View>
            </View>

            {/* Recipe image */}
            <View style={{ paddingHorizontal: 5 }}>
                {bone("100%", mediaHeight, 14)}
            </View>

            {/* Recipe information */}
            <View
                style={{
                    flex: 1,
                    minHeight: contentHeight,
                    paddingHorizontal: 10,
                    paddingVertical: 9,
                    gap: 9,
                    justifyContent: "space-between",
                }}
            >
                {/* Difficulty and recipe name */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    {bone(14, 14, 999)}
                    <View style={{ flex: 1, gap: 5 }}>
                        {bone("90%", 11, 5)}
                    </View>
                </View>

                {/* Dietary information and ingredient count */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    {bone(25, 25, 999)}
                    {bone(48, 12, 5)}
                </View>

                {/* Creator information */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                    }}
                >
                    {bone(24, 24, 999)}
                    <View style={{ flex: 1, gap: 5 }}>
                        {bone("80%", 10, 5)}
                        {bone("55%", 8, 4)}
                    </View>
                </View>
            </View>
        </View>
    );
};

export default Tag;