
import React, { useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    StyleProp,
    Pressable,
    Animated,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { MinimumFeedCard } from "@/types/feed.types";
import { Media } from "@/media/media";
import { Button, Gesture } from "@/components/ButtonComponent";
import { formatCount } from "@/utils/time";
import { CookPotIcon, LikeIcon, StarIcon, ViewsIcon } from "@/icons/Icon";
import { ImageMediaType } from "@/types/media.types";
import { difficultyColors } from "@/types/styles.types";
import { useReel } from "@/stores/useReel";
import { GradientHeader, withOpacity } from "@/components/GradientComponent";
import { LinearGradient } from "expo-linear-gradient";
import { useOverlay } from "@/stores/useOverlay";
import PostStats from "@/components/PostStatsComponent";
import { useFeed } from "@/stores/useFeed";
import { usePostLive } from "@/stores/usePostLive";

type MinTagProps = {
    minCard: MinimumFeedCard;
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

export const MinTag: React.FC<MinTagProps> = ({
    minCard,
    isActive,
    style,
    containerStyle,
    dark,
    onPressMedia,
    onPressInfo,
}) => {

    const { post_id, info, action_counts } = minCard;
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const mediaRef = React.useRef<View>(null);

    const isReelOrigin = useReel(
        (s) => s.isVisible && s.originPostId === post_id
    );

    const openOverlay = useOverlay((s) => s.openOverlay);

    const openStats = () =>
        openOverlay({ custom: <PostStats dark={dark} card={minCard} /> });

    const seedLive = usePostLive((s) => s.seedLive);
    const liveCounts = usePostLive((s) => s.byId[String(post_id)]?.action_counts);
    const counts = { ...action_counts, ...liveCounts };

    useEffect(() => {
        seedLive(post_id, { action_counts });
    }, [post_id]);

    const difficultyColor = info.dish_difficulty
        ? difficultyColors[info.dish_difficulty]
        : colors.secondaryText;

    return (
        <Gesture>
            <View
                style={[
                    {
                        width: "100%",
                        borderRadius: 8,
                        backgroundColor: colors.background,

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
                        height: 125,
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
                            minHeight: 125,
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
                            muteControl="bottomRow"
                            autoPlay={isActive === undefined ? undefined : isActive ? undefined : false}
                        />
                    </View>

                    {/* Right: recipe details */}
                    <View
                        style={{
                            flex: 1,
                            minWidth: 0,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            justifyContent: "center",
                            gap: 5,
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
                                    style={{
                                        color: difficultyColor,
                                        fontSize: 12,
                                    }}
                                    numberOfLines={1}
                                >
                                    {info?.dish_difficulty || "Difficulty not set"}
                                </Text>
                            </View>

                            {/* Dish name */}
                            <Text
                                className={textStyles.section}
                                style={{
                                    color: colors.text,
                                    fontSize: 16,
                                    fontWeight: "700",
                                    lineHeight: 20,
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {info.dish_name}
                            </Text>

                            {/* Dish description */}
                            <Text
                                className={textStyles.body}
                                style={{
                                    color: colors.secondaryText,
                                    fontSize: 15,
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
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                                marginTop: 3,
                                flexWrap: "wrap",
                                padding: 0,
                                justifyContent: "flex-start",
                            }}
                            onPress={openStats}
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
                    </View>
                    
                </View>

            </View>

        </Gesture>
    );
};

type EmptyMinTagProps = {
    style?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    dark?: boolean;
};

export const EmptyMinTag: React.FC<EmptyMinTagProps> = ({
    style,
    containerStyle,
    dark,
}) => {
    const { colors } = useTheme(dark ? "dark" : undefined);

    const opacity = React.useRef(
        new Animated.Value(0.45)
    ).current;

    React.useEffect(() => {
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
                    width: "95%",
                    borderRadius: 8,
                    backgroundColor: colors.background,
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
                    height: 125,
                    flexDirection: "row",
                    alignItems: "stretch",
                    borderRadius: 8,
                    overflow: "hidden",
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.secondaryCard,
                }}
            >
                {/* Left: dish media */}
                <View
                    style={{
                        width: "38%",
                        height: "100%",
                        overflow: "hidden",
                        backgroundColor: colors.secondaryCard,
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

                {/* Right: recipe details */}
                <View
                    style={{
                        flex: 1,
                        minWidth: 0,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
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
                        {bone(12, 12, 6)}
                        {bone("42%", 9)}
                    </View>

                    {/* Dish name */}
                    {bone("90%", 15)}

                    {/* Dish description */}
                    <View style={{ gap: 5 }}>
                        {bone("100%", 9)}
                        {bone("76%", 9)}
                    </View>

                    {/* Action counts */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            marginTop: 3,
                        }}
                    >
                        {bone(30, 12)}
                        {bone(30, 12)}
                        {bone(30, 12)}
                        {bone(30, 12)}
                    </View>
                </View>
            </View>
        </View>
    );
};
