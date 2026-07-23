import { Media } from "../media/media";
import { formatCount } from "@/utils/time";
import { useTheme } from "@/provider/ThemeProvider";
import { ReelFeedCard} from "@/types/feed.types";
import { useReel } from "@/stores/useReel";
import { FeedActionCountsTypes, FeedActionType } from "@/types/feed.types";
import React, { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Image, PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { FeedLoveIcon, FeedStarIcon } from "@/icons/feed_icon";
import { Button } from "@/components/ButtonComponent";
import { AddIcon, FatIcon, ShareIcon } from "@/icons/Icon";
import { AvatarRender } from "@/dashboard/Avatar";
import { useAvatarMood } from "@/dashboard/store/useAvatar";
import { useFeed } from "@/stores/useFeed";
import { LinearGradient } from "expo-linear-gradient";
import { setFeedActionCount } from "@/api/feed.api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { capitalize } from "@/utils/text";

type Props = {
    card?: ReelFeedCard;
    height?: number;
    fullscreen?: boolean;
    onSwipeUp: () => void;
    onSwipeDown: () => void;
    onSetActiveProfile: (post_id: number) => void;
    onOpenCook: (post_id: number) => void;
    onSetSharePost: (post_id: number) => void;
    style?: StyleProp<ViewStyle>;
};

export const DASHBOARD_HEIGHT = 175;
export const REEL_TAG_HEIGHT = Dimensions.get("window").height - 305;
export const REEL_TAG_WIDTH = Dimensions.get("window").width ;
export const REEL_TAG_RADIUS = 0;
const SWIPE_THRESHOLD = 60;

const ReelTag: React.FC<Props> = ({ card, style, height, fullscreen, onSwipeUp, onSwipeDown, onSetActiveProfile, onSetSharePost, onOpenCook }) => {

    const { post_id, info, avatar, profile_name, firstName, lastName, level } = card ?? {};

    const insets = useSafeAreaInsets();
    const tagHeight = height ?? REEL_TAG_HEIGHT;
    const infoBottomPadding = fullscreen ? insets.bottom : 0;
    const { colors, textStyles } = useTheme("dark");

    const onSwipeUpRef = useRef(onSwipeUp);
    const onSwipeDownRef = useRef(onSwipeDown);

    const [hide, setHide] = useState(false);

    const panResponder = useRef(
        PanResponder.create({

            onStartShouldSetPanResponder: () => false,

            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
            },

            onPanResponderRelease: (_, gestureState) => {
                const { dy } = gestureState;

                // swipe up
                if (dy < -SWIPE_THRESHOLD) {
                    onSwipeUpRef.current();
                }
                // swipe down
                else if (dy > SWIPE_THRESHOLD) {
                    onSwipeDownRef.current();
                }

                setHide(false);
            },

            onPanResponderTerminate: () => {
                setHide(false);
            },

        })
    ).current;

    useEffect(() => {
        onSwipeUpRef.current = onSwipeUp;
        onSwipeDownRef.current = onSwipeDown;
    }, [onSwipeUp, onSwipeDown]);

    return (
        <View
            style={{height: tagHeight, width: REEL_TAG_WIDTH}}
            {...panResponder.panHandlers}
        >
            <View
                style={{
                    height: tagHeight,
                    width: REEL_TAG_WIDTH,
                    borderRadius: REEL_TAG_RADIUS,
                    backgroundColor: colors.background,
                    overflow: "hidden",
                }}
            >
                <View
                    style={{ ...StyleSheet.absoluteFillObject }}
                    pointerEvents="box-none"
                >

                    <Media
                        uri={info?.dish_media_url ?? ""}
                        mediaType={info?.dish_media_type ?? "image"}
                        style={{height: "100%", width: "100%"}}
                        iconSize={55}
                        onLongPress={() => setHide(true)}
                        onInteractionEnd={() => setHide(false)}
                        muteControl="center"
                        imageContentFit="contain"
                        videoContentFit="cover"
                    />

                </View>

                <LinearGradient
                    pointerEvents="none"
                    colors={[
                        "rgba(0, 0, 0, 0.85)",
                        "rgba(0, 0, 0, 0.45)",
                        "rgba(0, 0, 0, 0)",
                    ]}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0.5, y: 1 }}
                    end={{ x: 0.5, y: 0.1 }}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 100,   // <-- controls how tall the gradient is
                        shadowColor: "#000",
                        shadowOpacity: 0.35,
                        shadowRadius: 18,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 10,
                    }}
                />
                
                <View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        gap: 5,
                        paddingHorizontal: 10,
                        paddingBottom: infoBottomPadding,
                        alignItems: "flex-start",
                    }}
                    pointerEvents={hide ? "none" : "auto"}
                >
                    <Animated.View
                        style={{
                            opacity: hide ? 0.1 : 1,
                        }}
                    >

                        <Button 
                            style={{
                                width: "auto",
                                gap: 15,
                                flexDirection: "column", 
                                alignItems: "flex-start"
                            }}
                            onPress={() => onSetActiveProfile(post_id ?? 0)}
                        >
                            <View
                                style={{
                                    gap: 10,
                                    flexDirection: "row",
                                    alignItems: "flex-end"
                                }}
                            >
                                <View 
                                    style={{
                                        height: 40,
                                        width: 40, 
                                        borderWidth: 1,
                                        borderRadius: 999,
                                        borderColor: colors.text,
                                        overflow: "hidden" ,                   
                                    }}
                                    className="items-center justify-center"
                                >
                                    <AvatarRender avatar={avatar} size={30} />
                                </View>

                                <View
                                    style={{
                                        flexDirection: "column",
                                    }}
                                >
                                    <Text
                                        className={textStyles.caption}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {profile_name}
                                    </Text>

                                    <Text
                                        className={textStyles.body}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={{
                                            color: colors.secondaryText,
                                            opacity: 0.8,
                                            fontSize: 13,
                                        }}
                                    >
                                        {capitalize(firstName ?? "")}{" "}
                                        {capitalize(lastName ?? "")}
                                    </Text>
                                </View>

                            </View>

                            <Button 
                                style={{
                                    height: 50,
                                    gap: 3,
                                    width: 300, 
                                    flexDirection: "column",   
                                    alignItems: "flex-start",    
                                    paddingHorizontal: 10,
                                    paddingVertical: 2,
                                }}
                                onPress={() => onOpenCook(post_id ?? 0)}
                                className="w-full"
                            >
                                <Text
                                    style={{ opacity: 0.95, color: colors.text }}
                                    className={textStyles.body}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {info?.dish_name ?? "Name"}
                                </Text>

                                <Text
                                    style={{ opacity: 0.75, color: colors.text }}
                                    className={textStyles.small}
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                >
                                    {info?.dish_description ?? "desc"}
                                </Text>

                            </Button>

                        </Button>
                    
                    </Animated.View>
                </View>

                <View
                    style={{
                        position: "absolute",
                        bottom: tagHeight / 5,
                        right: 5,
                        gap: 5,
                        padding: 5,
                        maxWidth: REEL_TAG_WIDTH - 25,
                        alignItems: "flex-start",
                    }}
                    pointerEvents={hide ? "none" : "auto"}
                >
                    <Animated.View
                        style={{
                            opacity: hide ? 0.1 : 1,
                        }}
                    >
                        <FunctionRow 
                            post_id={post_id ?? 0} 
                            onSetSharePost={onSetSharePost}
                        />
                    </Animated.View>

                </View>
                
            </View>

        </View>
    )
};

export const FunctionRow: React.FC<{post_id: number, onSetSharePost: (post_id: number) => void}> = ({ post_id, onSetSharePost }) => {

    const setMood = useAvatarMood((s) => s.setMood);
    const { toggleUserReelAction } = useReel();
    const updatePostEverywhere = useFeed((s) => s.updatePostEverywhere);

    
    const { colors, textStyles } = useTheme("dark");

    const reel = useReel((state) => state.reels.find((r) => r.post_id === post_id));
    const counts = reel?.action_counts;

    const userActions = reel?.user_actions ?? [];

    const [animateLove, setAnimateLove] = useState(0);

    const handleAction = async (action: keyof FeedActionCountsTypes) => {

        const alreadyDone = userActions.includes(action as FeedActionType);
        const delta = alreadyDone ? -1 : 1;

        if (action === "post_share") {
            onSetSharePost(post_id);
            return;
        }

        if (action === "post_star") {
            setMood("focused", 3000);
        }
        
        if (action === "post_love" && !alreadyDone) {
            setAnimateLove((prev) => prev + 1);
            setMood("excited", 3000);
        }

        toggleUserReelAction(post_id, action as FeedActionType);

        updatePostEverywhere(post_id, (post) => {
            const currentActions: FeedActionType[] = Array.isArray(post.user_actions) 
                ? post.user_actions 
                : [];

            const nextActions = alreadyDone
                ? currentActions.filter((item: FeedActionType) => item !== action)
                : currentActions.includes(action as FeedActionType)
                    ? currentActions
                    : [...currentActions, action as FeedActionType];

            return {
                ...post,
                user_actions: nextActions,
                action_counts: {
                    ...post.action_counts,
                    [action]: Math.max((post.action_counts?.[action] ?? 0) + delta, 0),
                },
            };
        });

        try {
            await setFeedActionCount(post_id, action as FeedActionType);
        } catch (err) {
            console.error("[handleAction] failed to emit set-count:", err);
        }
    };

    type ReelActionKey = keyof Pick<
        FeedActionCountsTypes,
        "post_star" | "post_share" | "post_love"
    >;

    const actionIcons: Record<ReelActionKey, JSX.Element> = useMemo(() => ({
        post_star: (
            <FeedStarIcon
                size={40}
                color={colors.text}
                fillColor="yellow"
                starred={userActions.includes("post_star")}
            />
        ),
        post_share: (
            <ShareIcon color={colors.text} size={30} />
        ),
        post_love: (
            <FeedLoveIcon
                color={colors.text}
                fillColor="red"
                liked={userActions.includes("post_love")}
                animationKey={animateLove}
                size={30}
            />
        ),
    }), [userActions, colors.text, animateLove]);

    return (
        <View 
            style={{
                gap: 20,
                paddingVertical: 5,
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
            }} 
        >
            {Object.entries(actionIcons).map(([key, Icon]) => {
                const action = key as ReelActionKey;
                return (
                    <View key={action} className="flex-col items-center justify-between">
                        <Button 
                            onPress={() => handleAction(action)} 
                            onLongPress={() => {}}
                        >
                            {Icon}
                        </Button>
                        <Text className={textStyles.caption}>
                            {formatCount(counts?.[action] ?? 0)}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

export const EmptyReelTag: React.FC<{ delay?: number; height?: number; fullscreen?: boolean }> = ({ delay = 0, height, fullscreen }) => {

    const { colors } = useTheme("dark");
    const insets = useSafeAreaInsets();
    const tagHeight = height ?? REEL_TAG_HEIGHT;
    const infoBottomPadding = fullscreen ? 65 : 15;
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const anim = Animated.loop(
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

        anim.start();

        return () => anim.stop();
    }, [delay, opacity]);

    const bone = (
        width: number | `${number}%`,
        height: number,
        radius = 8,
        style?: StyleProp<ViewStyle>
    ) => (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: radius,
                    backgroundColor: colors.card,
                    opacity,
                },
                style,
            ]}
        />
    );

    return (
        <View
            style={{
                width: REEL_TAG_WIDTH,
                height: tagHeight,
                borderRadius: REEL_TAG_RADIUS,
                overflow: "hidden",
                backgroundColor: colors.background,
            }}
        >
            {bone("100%", tagHeight, REEL_TAG_RADIUS)}

            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.55)",
                }}
            />

            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    paddingHorizontal: 10,
                    paddingBottom: infoBottomPadding,
                }}
            >
                <View
                    style={{
                        height: 50,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    {bone(40, 40, 999)}

                    <View
                        style={{
                            height: 50,
                            justifyContent: "center",
                            gap: 6,
                            flex: 1,
                            paddingRight: 45,
                        }}
                    >
                        {bone("72%", 15, 6)}
                        {bone("92%", 11, 5)}
                        {bone("55%", 11, 5)}
                    </View>
                </View>
            </View>

            <View
                style={{
                    position: "absolute",
                    bottom: tagHeight / 3,
                    right: 10,
                    gap: 18,
                    alignItems: "center",
                }}
            >
                {[1, 2, 3].map((item) => (
                    <View
                        key={item}
                        style={{
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        {bone(38, 38, 999)}
                        {bone(24, 10, 5)}
                    </View>
                ))}
            </View>
        </View>
    );
};


export default ReelTag;