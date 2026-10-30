import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    StyleProp,
    Animated,
    Pressable,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { SearchFeedCard } from "@/types/feed.types";
import {  Media } from "@/media/media";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Gesture } from "@/components/ButtonComponent";
import { formatCount } from "@/utils/time";
import { CookPotIcon, LikeIcon, StarIcon, ViewsIcon } from "@/icons/Icon";
import { DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { capitalize, limitLength } from "@/utils/text";
import { useReel } from "@/stores/useReel";
import { ImageMediaType } from "@/types/media.types";
import { difficultyColors } from "@/types";
import { withOpacity } from "@/components/GradientComponent";
import { PostStats } from "@/components/PostStatsComponent";
import { useOverlay } from "@/stores/useOverlay";
import { usePostLive } from "@/stores/usePostLive";

type DiscoveryTagProps = {
    card: SearchFeedCard;
    isActive?: boolean;  
    style?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    dark?: boolean;
    onPressMedia?: (layout: {
        x: number;
        y: number;
        width: number;
        height: number;
    }) => void;
    onPressProfile?: () => void;
    onPressInfo?: () => void;
};

const FunctionRow: React.FC<{
    icon: React.ReactNode;
    count: number;
    color: string;
}> = ({ icon, count, color }) => (
    <View
        style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
        }}
    >
        {icon}
        <Text
            style={{
                color,
                fontSize: 12,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
            }}
        >
            {formatCount(count)}
        </Text>
    </View>
);

export const DiscoveryTag: React.FC<DiscoveryTagProps> = ({
    card,
    isActive,
    style,
    containerStyle,
    dark,
    onPressMedia,
    onPressProfile,
    onPressInfo,
}) => {
    const {
        info,
        action_counts,
        avatar,
        profile_name,
        firstName,
        lastName,
        badge,
        xp,
        level,
    } = card;

    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const mediaRef = React.useRef<View>(null);

    const isReelOrigin = useReel(
        (s) => s.isVisible && s.originPostId === card.post_id
    );

    const openOverlay = useOverlay((s) => s.openOverlay);

    const openStats = () =>
        openOverlay({ custom: <PostStats dark={dark} card={card} /> });

    const seedLive = usePostLive((s) => s.seedLive);
    const liveCounts = usePostLive((s) => s.byId[String(card.post_id)]?.action_counts);
    const counts = { ...action_counts, ...liveCounts };

    useEffect(() => {
        seedLive(card.post_id, { action_counts });
    }, [card.post_id]);

    const difficultyColor = info.dish_difficulty
        ? difficultyColors[info.dish_difficulty]
        : colors.secondaryText;

    return (
        <Gesture>
            <View
                style={[
                    {
                        width: "100%",
                        height: 170,
                        borderRadius: 8,
                        backgroundColor: colors.background,

                        // Shadow
                        shadowColor: colors.text,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: dark ? 0.3 : 0.12,
                        shadowRadius: 6,
                        elevation: 4,
                    },
                    style,
                    containerStyle,
                ]}
            >
                <View
                    style={{
                        width: "100%",
                        height: "100%",
                        flexDirection: "row",
                        alignItems: "stretch",
                        borderRadius: 8,
                        overflow: "hidden",
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.secondaryCard,
                    }}
                >
                        {/* Left: dish image */}
                        <View
                            ref={mediaRef}
                            style={{
                                width: "38%",
                                height: "100%",
                                overflow: "hidden",
                                opacity: isReelOrigin ? 0 : 1,
                            }}
                        >
                            <Media
                                uri={info.dish_media_url}
                                mediaType={info.dish_media_type as ImageMediaType}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                iconSize={20}
                                muteControl="bottomRow"
                                onPress={() => {
                                    mediaRef.current?.measureInWindow(
                                        (x, y, width, height) => {
                                            onPressMedia?.({
                                                x,
                                                y,
                                                width,
                                                height,
                                            });
                                        }
                                    );
                                }}
                                bottomControlOffset={15}
                                autoPlay={isActive === undefined ? undefined : isActive ? undefined : false}
                            />
                        </View>

                        {/* Right: recipe details and creator */}
                        <View
                            style={{
                                flex: 1,
                                minWidth: 0,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                justifyContent: "center",
                                gap: 4,
                            }}
                        >
                            <Pressable 
                                onPress={onPressInfo}
                                style={{
                                    gap: 5
                                }}
                            >
                                {/* Difficulty */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: 999,
                                            backgroundColor: difficultyColor,
                                        }}
                                    />

                                    <Text
                                        className={textStyles.body}
                                        style={{
                                            color: difficultyColor,
                                            fontSize: 12,
                                            flexShrink: 1,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {info.dish_difficulty || "Difficulty not set"}
                                    </Text>
                                </View>

                                {/* Recipe name */}
                                <Text
                                    className={textStyles.section}
                                    style={{
                                        color: colors.text,
                                        fontSize: 16,
                                        fontWeight: "700",
                                        lineHeight: 19,
                                    }}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {info.dish_name}
                                </Text>

                                {/* Description */}
                                <Text
                                    className={textStyles.body}
                                    style={{
                                        color: colors.secondaryText,
                                        fontSize: 14,
                                        lineHeight: 15,
                                    }}
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                >
                                    {info.dish_description?.trim() ||
                                        "Discover this delicious recipe."}
                                </Text>

                            </Pressable>

                            {/* Action counts */}
                            <Button
                                onPress={openStats}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "flex-start",
                                    padding: 0,
                                    gap: 10,
                                    marginTop: 1,
                                }}
                            >
                                <FunctionRow
                                    icon={<LikeIcon size={16} />}
                                    count={counts?.post_love ?? 0}
                                    color={colors.text}
                                />

                                <FunctionRow
                                    icon={
                                        <StarIcon
                                            size={16}
                                            color="#ffca45"
                                            fillColor="#ffca45"
                                        />
                                    }
                                    count={counts?.post_star ?? 0}
                                    color={colors.text}
                                />

                                <FunctionRow
                                    icon={<CookPotIcon size={16} />}
                                    count={counts?.post_cook ?? 0}
                                    color={colors.text}
                                />

                                <FunctionRow
                                    icon={<ViewsIcon size={16} color={colors.text}/>}
                                    count={counts?.post_view ?? 0}
                                    color={colors.text}
                                />

                            </Button>

                            {/* Creator row: below action counts */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    minWidth: 0,
                                    gap: 6,
                                    marginTop: 2,
                                }}
                            >
                                <View style={{ flexShrink: 0 }}>
                                    <DynamicAvatarRenderer
                                        avatar={avatar}
                                        level={level}
                                        xp={xp}
                                        badge={badge}
                                        dark={dark}
                                        showBadge
                                        showProgress
                                        background
                                        size={20}
                                    />
                                </View>

                                <View
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        justifyContent: "center",
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

                </View>

            </View>

        </Gesture>
    );
};


export const EmptyDiscoveryTag: React.FC<{
    style?: StyleProp<ViewStyle>;
    dark?: boolean;
}> = ({ style, dark }) => {
    const { colors } = useTheme(dark ? "dark" : undefined);

    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.85,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [opacity]);

    const bone = (
        width: number | `${number}%`,
        height: number,
        radius = 5
    ) => (
        <Animated.View
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor: colors.secondaryCard,
                opacity,
            }}
        />
    );

    return (
        <View
            style={[
                {
                    width: "100%",
                    height: 150,
                    borderRadius: 8,
                    backgroundColor: colors.background,
                    shadowColor: colors.text,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: dark ? 0.3 : 0.12,
                    shadowRadius: 6,
                    elevation: 4,
                },
                style,
            ]}
        >
            <View
                style={{
                    flex: 1,
                    flexDirection: "row",
                    borderRadius: 8,
                    overflow: "hidden",
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.secondaryCard,
                }}
            >
                {/* Dish image skeleton */}
                <View
                    style={{
                        width: "38%",
                        height: "100%",
                        backgroundColor: colors.secondaryCard,
                        overflow: "hidden",
                    }}
                >
                    <Animated.View
                        style={{
                            flex: 1,
                            backgroundColor: colors.card,
                            opacity,
                        }}
                    />
                </View>

                {/* Image-to-content transition */}
                <LinearGradient
                    pointerEvents="none"
                    colors={[
                        "transparent",
                        withOpacity(colors.background, 0.45),
                        colors.background,
                    ]}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                        position: "absolute",
                        left: "28%",
                        top: 0,
                        bottom: 0,
                        width: "10%",
                        zIndex: 1,
                    }}
                />

                {/* Recipe details skeleton */}
                <View
                    style={{
                        flex: 1,
                        minWidth: 0,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        justifyContent: "center",
                        gap: 7,
                    }}
                >
                    {/* Difficulty */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        {bone(7, 7, 4)}
                        {bone("35%", 9)}
                    </View>

                    {/* Recipe name */}
                    {bone("82%", 14)}

                    {/* Description */}
                    <View style={{ gap: 4 }}>
                        {bone("100%", 8)}
                        {bone("72%", 8)}
                    </View>

                    {/* Action counts */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            marginTop: 1,
                        }}
                    >
                        {bone(30, 9)}
                        {bone(30, 9)}
                        {bone(30, 9)}
                    </View>

                    {/* Creator */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 1,
                        }}
                    >
                        {bone(22, 22, 11)}

                        <View
                            style={{
                                flex: 1,
                                gap: 4,
                            }}
                        >
                            {bone("48%", 8)}
                            {bone("65%", 8)}
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};


export default DiscoveryTag;