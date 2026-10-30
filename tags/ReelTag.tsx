import { ReelMedia, MediaRef, getReelReservedBottom, ScrubState, SCRUB_ZONE_HEIGHT } from "@/media/reelMedia";
import { formatClock, formatCount } from "@/utils/time";
import { useTheme } from "@/provider/ThemeProvider";
import { REEL_TAG_HEIGHT, REEL_TAG_RADIUS, REEL_TAG_WIDTH, ReelFeedCard, SWIPE_THRESHOLD} from "@/types/feed.types";
import { useReel, useReelChrome } from "@/stores/useReel";
import { FeedActionCountsTypes, FeedActionType } from "@/types/feed.types";
import React, { forwardRef, JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Image, PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { FeedLoveIcon, FeedStarIcon } from "@/icons/feed_icon";
import { Button } from "@/components/ButtonComponent";
import { AddIcon, FatIcon, ShareFillIcon, ShareIcon, ListFillIcon, ListIcon } from "@/icons/Icon";
import { AvatarRender, DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { useAvatarMood } from "@/stores/useAvatar";
import { useFeed } from "@/stores/useFeed";
import { LinearGradient } from "expo-linear-gradient";
import { setFeedActionCount } from "@/api/feed.api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { capitalize, limitLength } from "@/utils/text";
import { shallow } from "zustand/shallow";
import { REEL_CONTROLS_HEIGHT } from "@/types/feed.types";
import { StepData } from "@/types";

type Props = {
    card?: ReelFeedCard;
    height?: number;
    isActive: boolean;
    onSwipeUp: () => void;
    onSwipeDown: () => void;
    onVideoEnd: (post_id: number) => boolean;
    onSetActiveProfile: (post_id: number) => void;
    onOpenCook: (post_id: number) => void;
    onOpenSteps: (steps: StepData[], dishName: string) => void;
    onSetSharePost: (post_id: number) => void;
    style?: StyleProp<ViewStyle>;
    
    isLandscape?: boolean;
    landscapeSheetOpen?: boolean;
    onOrientationChange?: (landscape: boolean) => void;
    orientationLocked?: boolean;
};


const DESC_LIMIT = 80;      
const GRADIENT_HEADROOM = 24;


const ReelTag = React.memo(forwardRef<MediaRef, Props>(({
    card,
    isActive,
    height,
    onSwipeUp,
    onSwipeDown,
    onVideoEnd,
    onOpenSteps,
    onSetActiveProfile,
    onSetSharePost,
    onOpenCook,
    isLandscape = false,
    onOrientationChange,
    orientationLocked = false,
    landscapeSheetOpen = false,
}, ref) => {

    const chrome = useReelChrome();

    const insets = useSafeAreaInsets();

    const { post_id, info, avatar, xp, badge, profile_name, firstName, lastName, level, steps } = card ?? {};

    const reservedBottom = getReelReservedBottom(insets.bottom);

    const tagHeight = height ?? REEL_TAG_HEIGHT;

    const infoBottomPadding = insets.bottom + 15;
    
    const { colors, textStyles } = useTheme("dark");

    const onSwipeUpRef = useRef(onSwipeUp);
    const onSwipeDownRef = useRef(onSwipeDown);

    const [hide, setHide] = useState(false);

    const [descExpanded, setDescExpanded] = useState(false);

    const [infoHeight, setInfoHeight] = useState(0);

    const description = info?.dish_description ?? "";
    const isLongDesc = description.length > DESC_LIMIT;
    const shownDesc = !descExpanded && isLongDesc
        ? description.slice(0, DESC_LIMIT).trim() + "…"
        : description;

    const [scrub, setScrub] = useState<ScrubState | null>(null);
    const scrubbingRef = useRef(false);

    const handleScrub = useCallback((s: ScrubState | null) => {
        setScrub(s);

        const now = s !== null;
        if (now === scrubbingRef.current) return;
        scrubbingRef.current = now;

        if (now) {
            useReel.setState({ isScrubbing: true });
        } else {
            setTimeout(() => {
                if (!scrubbingRef.current) useReel.setState({ isScrubbing: false });
            }, 250);
        }
    }, []);

    useEffect(() => () => {
        if (scrubbingRef.current) useReel.setState({ isScrubbing: false });
    }, []);

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


    useEffect(() => { setDescExpanded(false); }, [post_id]);

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
                    overflow: "hidden",
                }}
            >

                <View
                    style={{ ...StyleSheet.absoluteFillObject }}
                    pointerEvents="box-none"
                >
                    <ReelMedia
                        ref={ref}
                        loop={false}
                        uri={info?.dish_media_url ?? ""}
                        duration={info?.dish_media_duration}
                        style={{ height: "100%", width: "100%" }}
                        bottomOffset={insets.bottom}
                        onLongPress={() => setHide(true)}
                        onEnd={() => onVideoEnd(post_id ?? 0)} 
                        onInteractionEnd={() => setHide(false)}
                        onScrub={handleScrub}
                        videoContentFit="contain"
                        autoPlay={isActive ? undefined : false}
                        isLandscape={isLandscape}
                        onOrientationChange={onOrientationChange}
                        orientationLocked={orientationLocked}
                    />
                </View>

                <Animated.View
                    pointerEvents="box-none"
                    style={[StyleSheet.absoluteFillObject, { opacity: chrome }]}
                >
                    {infoHeight > 0 && (
                        <LinearGradient
                            pointerEvents="none"
                            colors={[
                                "rgba(0, 0, 0, 0.85)",
                                "rgba(0, 0, 0, 0.45)",
                                "rgba(0, 0, 0, 0)",
                            ]}
                            locations={[0, 0.55, 1]}
                            start={{ x: 0.5, y: 1 }}
                            end={{ x: 0.5, y: 0 }}  
                            style={{
                                position: "absolute",
                                bottom: reservedBottom,
                                left: 0,
                                right: 0,
                                height: infoHeight + GRADIENT_HEADROOM,
                            }}
                        />
                    )}
                    
                    <View
                        onLayout={(e) => setInfoHeight(e.nativeEvent.layout.height)}
                        style={{
                            position: "absolute",
                            bottom: (REEL_CONTROLS_HEIGHT + (SCRUB_ZONE_HEIGHT / 3)) + 15,
                            left: 0,
                            right: 0,
                            paddingBottom: infoBottomPadding,
                        }}
                        pointerEvents={hide || scrub ? "none" : "box-none"}
                    >
                        <Animated.View
                            style={{
                                gap: 10,
                                opacity: scrub ? 0 : hide ? 0.1 : 1,
                                paddingHorizontal: 5
                            }}
                        >
                            {/* profile row */}
                            <Button
                                style={{ width: "auto", padding: 0, justifyContent: "flex-start", alignItems: "flex-end", gap: 5, paddingLeft: 7, flexDirection: "row" }}
                                onPress={() => onSetActiveProfile(post_id ?? 0)}
                            >
                                <DynamicAvatarRenderer 
                                    avatar={avatar} 
                                    size={25} 
                                    xp={xp} 
                                    badge={badge} 
                                    background
                                    showBadge 
                                    showProgress 
                                />

                                <View
                                    style={{
                                        flexDirection: "column",
                                    }}
                                >
                                    <Text
                                        className={textStyles.sectionText}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        onPress={() => onSetActiveProfile(post_id ?? 0)}
                                    >
                                        @{limitLength(profile_name ?? "", 25)}
                                    </Text>

                                    <Text
                                        className={textStyles.body}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={{
                                            color: colors.secondaryText,
                                            opacity: 0.8,
                                            fontSize: 14,
                                        }}
                                    >
                                        {capitalize(limitLength(firstName ?? "", 25))}{" "}
                                        {capitalize(limitLength(lastName ?? "", 35))}
                                    </Text>
                                </View>

                            </Button>

                            {/* dish name + description */}
                            <Button 
                                style={{
                                    gap: 3,
                                    width: 300, 
                                    flexDirection: "column",   
                                    alignItems: "flex-start",  
                                    paddingVertical: 2,
                                }}
                                onPress={() => onOpenCook(post_id ?? 0)}
                                className="w-full"
                            >
                                <Text
                                    style={{ opacity: 0.95, color: colors.text }}
                                    className={textStyles.sectionText}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    onPress={() => onOpenCook(post_id ?? 0)}
                                >
                                    {info?.dish_name ?? "Name"}
                                </Text>

                                <Text
                                    style={{ opacity: 0.75, color: colors.text, fontSize: 15 }}
                                    className={textStyles.body}
                                >
                                    {shownDesc}
                                    {isLongDesc && (
                                        <Text
                                            onPress={() => setDescExpanded((p) => !p)}
                                            className={textStyles.body}
                                            style={{ color: colors.button, fontWeight: "700" }}
                                        >
                                            {descExpanded ? "  Show less..." : "  Read more..."}
                                        </Text>
                                    )}
                                </Text>

                            </Button>

                            <View
                                style={{
                                    paddingHorizontal: 7
                                }}
                            >
                                <FunctionRow 
                                    post_id={post_id ?? 0} 
                                    onSetSharePost={onSetSharePost}
                                    onOpenSteps={() => onOpenSteps(steps ?? [], info?.dish_name ?? "")}
                                />
                            </View>
                        
                        </Animated.View>

                    </View>

                </Animated.View>
                
                {scrub && (
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: reservedBottom + 30,
                            alignItems: "center",
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 34,
                                fontWeight: "600",
                                fontVariant: ["tabular-nums"],
                            }}
                        >
                            {formatClock(scrub.time)}
                            <Text style={{ opacity: 0.6 }}> / {formatClock(scrub.duration)}</Text>
                        </Text>
                    </View>
                )}

            </View>

        </View>
    )
}));


export const LandscapeReelTag = React.memo(forwardRef<MediaRef, Props>(({
    card,
    isActive,
    height,
    onSwipeUp,
    onSwipeDown,
    onVideoEnd,
    onOpenSteps,
    onSetActiveProfile,
    onSetSharePost,
    onOpenCook,
    isLandscape = false,
    onOrientationChange,
    orientationLocked = false,
    landscapeSheetOpen = false,
}, ref) => {

    const chrome = useReelChrome();
    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme("dark");

    const {
        post_id,
        info,
        avatar,
        xp,
        badge,
        profile_name,
        firstName,
        lastName,
        steps,
    } = card ?? {};

    const [infoHeight, setInfoHeight] = useState(0);

    const tagHeight = height ?? Dimensions.get("window").width * 9 / 16;
    const [hide, setHide] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [scrub, setScrub] = useState<ScrubState | null>(null);
    const scrubbingRef = useRef(false);

    const onSwipeUpRef = useRef(onSwipeUp);
    const onSwipeDownRef = useRef(onSwipeDown);

    const description = info?.dish_description ?? "";
    const isLongDesc = description.length > 120;
    const shownDesc = !descExpanded && isLongDesc
        ? `${description.slice(0, 120).trim()}…`
        : description;

    const handleScrub = useCallback((state: ScrubState | null) => {
        setScrub(state);

        const active = state !== null;
        if (active === scrubbingRef.current) return;

        scrubbingRef.current = active;

        if (active) {
            useReel.setState({ isScrubbing: true });
        } else {
            setTimeout(() => {
                if (!scrubbingRef.current) {
                    useReel.setState({ isScrubbing: false });
                }
            }, 250);
        }
    }, []);

    useEffect(() => {
        onSwipeUpRef.current = onSwipeUp;
        onSwipeDownRef.current = onSwipeDown;
    }, [onSwipeUp, onSwipeDown]);

    useEffect(() => {
        setDescExpanded(false);
        setHide(false);
    }, [post_id]);

    useEffect(() => () => {
        if (scrubbingRef.current) {
            useReel.setState({ isScrubbing: false });
        }
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gesture) =>
                Math.abs(gesture.dy) > Math.abs(gesture.dx),

            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy < -SWIPE_THRESHOLD) {
                    onSwipeUpRef.current();
                } else if (gesture.dy > SWIPE_THRESHOLD) {
                    onSwipeDownRef.current();
                }
                setHide(false);
            },

            onPanResponderTerminate: () => setHide(false),
        })
    ).current;

    const mutedUI = hide || !!scrub;

    return (
        <View
            style={{
                height: tagHeight,
                width: "100%",
                overflow: "hidden",
            }}
            {...panResponder.panHandlers}
        >
            {/* Full-bleed video */}
            <View
                pointerEvents="box-none"
                style={{ ...StyleSheet.absoluteFillObject }}
            >
                <ReelMedia
                    ref={ref}
                    loop={false}
                    uri={info?.dish_media_url ?? ""}
                    duration={info?.dish_media_duration}
                    style={{ width: "100%", height: "100%" }}
                    bottomOffset={insets.bottom}
                    onLongPress={() => setHide(true)}
                    onInteractionEnd={() => setHide(false)}
                    onEnd={() => onVideoEnd(post_id ?? 0)}
                    onScrub={handleScrub}
                    videoContentFit="contain"
                    autoPlay={isActive ? undefined : false}
                    isLandscape={isLandscape}
                    landscapeSheetOpen={landscapeSheetOpen}
                    onOrientationChange={onOrientationChange}
                    orientationLocked={orientationLocked}
                />
            </View>

            {/* Subtle top gradient */}
            <LinearGradient
                pointerEvents="none"
                colors={[
                    "rgba(0,0,0,0.32)",
                    "transparent",
                ]}
                locations={[0, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 110,
                }}
            />

            <Animated.View
                pointerEvents="box-none"
                style={[StyleSheet.absoluteFillObject, { opacity: chrome }]}
            >
                {/* Bottom readability gradient */}
                {!landscapeSheetOpen && infoHeight > 0 && (
                    <LinearGradient
                        pointerEvents="none"
                        colors={[
                            "rgba(0,0,0,0.75)",
                            "rgba(0,0,0,0.35)",
                            "rgba(0,0,0,0)",
                        ]}
                        locations={[0, 0.6, 1]}
                        start={{ x: 0.5, y: 1 }}
                        end={{ x: 0.5, y: 0 }}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: getReelReservedBottom(insets.bottom),
                            height: infoHeight + 24,
                        }}
                    />
                )}

                {/* Bottom-left creator and caption */}
                {!landscapeSheetOpen && (
                    <Animated.View
                        onLayout={(e) => setInfoHeight(e.nativeEvent.layout.height)}
                        pointerEvents={mutedUI ? "none" : "box-none"}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: getReelReservedBottom(insets.bottom) + SCRUB_ZONE_HEIGHT / 2 + 6,
                            paddingLeft: Math.max(insets.left, 16),
                            paddingRight: Math.max(insets.right, 16),
                            opacity: scrub ? 0 : hide ? 0.1 : 1,
                            gap: 3,
                        }}
                    >
                        <Button
                            onPress={() => onSetActiveProfile(post_id ?? 0)}
                            style={{
                                width: "auto",
                                padding: 0,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: 10,
                            }}
                        >
                            <DynamicAvatarRenderer
                                avatar={avatar}
                                size={25}
                                xp={xp}
                                badge={badge}
                                background
                                showBadge
                                showProgress
                            />

                            <View style={{ flexShrink: 1 }}>
                                <Text
                                    className={textStyles.sectionText}
                                    numberOfLines={1}
                                    style={{ color: "#fff", fontSize: 16 }}
                                >
                                    {limitLength(profile_name ?? "", 25)}
                                </Text>

                                <Text
                                    className={textStyles.body}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                        color: colors.secondaryText,
                                        opacity: 0.8,
                                        fontSize: 14,
                                    }}
                                >
                                    {capitalize(limitLength(firstName ?? "", 25))}{" "}
                                    {capitalize(limitLength(lastName ?? "", 35))}
                                </Text>
                            </View>

                        </Button>

                        <Pressable onPress={() => onOpenCook(post_id ?? 0)}>
                            <Text
                                className={textStyles.sectionText}
                                numberOfLines={1}
                                style={{ color: "#fff", fontSize: 17 }}
                            >
                                {info?.dish_name ?? "Name"}
                            </Text>

                            <Text
                                className={textStyles.body}
                                style={{
                                    color: "#fff",
                                    fontSize: 14,
                                    lineHeight: 19,
                                }}
                            >
                                {shownDesc}

                                {isLongDesc && (
                                    <Text
                                        onPress={() => setDescExpanded(value => !value)}
                                        style={{ color: "#fff", fontWeight: "700" }}
                                    >
                                        {descExpanded ? " Show less" : " Read more"}
                                    </Text>
                                )}
                            </Text>
                        </Pressable>

                        <View style={{ paddingTop: 2 }}>
                            <FunctionRow
                                post_id={post_id ?? 0}
                                onSetSharePost={onSetSharePost}
                                onOpenSteps={() =>
                                    onOpenSteps(steps ?? [], info?.dish_name ?? "")
                                }
                            />
                        </View>

                    </Animated.View>
                )}

            </Animated.View>

            {/* Scrub time */}
            {scrub && (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: getReelReservedBottom(insets.bottom) + 30,
                        alignItems: "center",
                    }}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 30,
                            fontWeight: "600",
                            fontVariant: ["tabular-nums"],
                        }}
                    >
                        {formatClock(scrub.time)}
                        <Text style={{ opacity: 0.65 }}>
                            {" "}/ {formatClock(scrub.duration)}
                        </Text>
                    </Text>
                </View>
            )}
        </View>
    );
}));


const ACTION_HEIGHT = 40;
const ACTION_BACKGROUND = "rgba(0,0,0,0.35)";


const ActionPill: React.FC<{
    onPress: () => void;
    count: number;
    children: React.ReactNode;
}> = ({ onPress, count, children }) => {
    const { colors } = useTheme("dark");

    return (
        <Pressable
            onPress={onPress}
            hitSlop={6}
            style={{
                height: ACTION_HEIGHT,
                paddingHorizontal: 14,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: ACTION_BACKGROUND,
            }}
        >
            {children}
            <Text
                style={{
                    color: colors.text,
                    fontSize: 15,
                    fontVariant: ["tabular-nums"],
                }}
            >
                {formatCount(count)}
            </Text>
        </Pressable>
    );
};


const ActionCircle: React.FC<{
    onPress: () => void;
    children: React.ReactNode;
}> = ({ onPress, children }) => {
    const { colors } = useTheme("dark");

    return (
        <Pressable
            onPress={onPress}
            hitSlop={6}
            style={{
                height: ACTION_HEIGHT,
                width: ACTION_HEIGHT,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: ACTION_BACKGROUND,
            }}
        >
            {children}
        </Pressable>
    );
};


export const FunctionRow: React.FC<{
    post_id: number;
    onSetSharePost: (post_id: number) => void;
    onOpenSteps: () => void;
}> = ({ post_id, onSetSharePost, onOpenSteps }) => {

    const setMood = useAvatarMood((s) => s.setMood);
    const togglePostAction = useFeed((s) => s.togglePostAction);
    const { colors } = useTheme("dark");

    const reel = useFeed((s) =>
        s.posts.find((p) => String(p.post_id) === String(post_id))
    );

    const counts: FeedActionCountsTypes = reel?.action_counts ?? {
        post_cook: 0,
        post_love: 0,
        post_share: 0,
        post_star: 0,
        post_view: 0,
    };
    const userActions = reel?.user_actions ?? [];
    const [animateLove, setAnimateLove] = useState(0);

    const handleAction = async (action: "post_love" | "post_star") => {
        if (action === "post_star") {
            setMood("focused", 3000);
        }

        if (action === "post_love" && !userActions.includes("post_love")) {
            setAnimateLove((prev) => prev + 1);
            setMood("excited", 3000);
        }

        await togglePostAction(post_id, action);
    };

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >

            <View 
                style={{
                    flexDirection: "row",
                    gap: 10,
                }}
            >

                <ActionPill count={counts.post_love ?? 0} onPress={() => handleAction("post_love")}>
                    <FeedLoveIcon
                        color={colors.text}
                        fillColor="red"
                        liked={userActions.includes("post_love")}
                        animationKey={animateLove}
                        size={22}
                    />
                </ActionPill>

                <ActionPill count={counts.post_star ?? 0} onPress={() => handleAction("post_star")}>
                    <FeedStarIcon
                        size={24}
                        color={colors.text}
                        fillColor="yellow"
                        starred={userActions.includes("post_star")}
                    />
                </ActionPill>

            </View>

            <View 
                style={{
                    flexDirection: "row",
                    gap: 10,
                }}
            >

                <ActionCircle onPress={() => {onOpenSteps()}}>
                    <ListIcon color={colors.text} size={20} />
                </ActionCircle>

                <ActionCircle onPress={() => onSetSharePost(post_id)}>
                    <ShareIcon color={colors.text} size={20} />
                </ActionCircle>

            </View>

        </View>
    );
};



export const EmptyReelTag: React.FC<{
    delay?: number;
    height?: number;
}> = ({ delay = 0, height }) => {
    const { colors } = useTheme("dark");
    const insets = useSafeAreaInsets();
    const tagHeight = height ?? REEL_TAG_HEIGHT;
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.8,
                    duration: 800,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.35,
                    duration: 800,
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
        radius = 7,
        style?: StyleProp<ViewStyle>
    ) => (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: radius,
                    backgroundColor: colors.secondaryCard,
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
            {/* Media placeholder */}
            {bone("100%", tagHeight, REEL_TAG_RADIUS, {
                position: "absolute",
                top: 0,
                left: 0,
            })}

            {/* Bottom readability gradient */}
            <LinearGradient
                pointerEvents="none"
                colors={[
                    "rgba(0,0,0,0)",
                    "rgba(0,0,0,0.35)",
                    "rgba(0,0,0,0.8)",
                ]}
                locations={[0, 0.45, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: tagHeight * 0.48,
                }}
            />

            {/* Creator, dish and description */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: REEL_CONTROLS_HEIGHT + SCRUB_ZONE_HEIGHT / 3 + 15,
                    paddingHorizontal: 12,
                    paddingBottom: insets.bottom + 15,
                    gap: 12,
                }}
            >
                {/* Creator */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    {bone(28, 28, 999)}

                    <View style={{ flex: 1, gap: 6 }}>
                        {bone("45%", 12, 5)}
                        {bone("65%", 10, 5)}
                    </View>
                </View>

                {/* Dish name and description */}
                <View style={{ gap: 8 }}>
                    {bone("72%", 16, 5)}
                    {bone("95%", 12, 5)}
                    {bone("68%", 12, 5)}
                </View>

                {/* Action pills */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 2,
                    }}
                >
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        {bone(82, 40, 999)}
                        {bone(82, 40, 999)}
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                        {bone(40, 40, 999)}
                        {bone(40, 40, 999)}
                    </View>
                </View>
            </View>
        </View>
    );
};


export default ReelTag;