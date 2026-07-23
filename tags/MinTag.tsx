import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    StyleProp,
    Pressable,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { MinimumFeedCard } from "@/types/feed.types";
import { Media } from "@/media/media";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture } from "@/components/ButtonComponent";
import { formatCount } from "@/utils/time";
import { FeedLoveIcon, FeedStarIcon } from "@/icons/feed_icon";
import { EggsIcon } from "@/icons/Icon";

type MinTagProps = {
    minCard: MinimumFeedCard;
    style?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    dark?: boolean;
    onPress?: () => void;
};

const FunctionRow: React.FC<{ icon: React.ReactNode; count: number }> = ({ icon, count }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        {icon}
        <Text
            style={{
                color: "white",
                fontSize: 10,
                fontWeight: "500",
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
            }}
        >
            {formatCount(count)}
        </Text>
    </View>
);

export const MinTag: React.FC<MinTagProps> = ({
    minCard,
    style,
    containerStyle,
    dark,
    onPress,
}) => {
    const { info, action_counts } = minCard;
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const likeCount = action_counts?.post_love ?? 0;

    const containerRadius =
        typeof containerStyle === "object" &&
        !Array.isArray(containerStyle) &&
        containerStyle?.borderRadius !== undefined
            ? containerStyle.borderRadius
            : 25;

    const mediaInset = 5;
    const mediaRadius = Math.max(Number(containerRadius) - mediaInset, 0);

    return (
        <Gesture>
            <View
                style={[{ width: 155, height: 135 }, style]}
                className="flex-col items-center justify-center"
            >
                <View
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            backgroundColor: colors.card,
                            overflow: "hidden",
                            justifyContent: "center",
                            borderRadius: containerRadius,
                        },
                        containerStyle,
                    ]}
                >
                    <View
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                borderRadius: mediaRadius,
                                overflow: "hidden",
                            },
                        ]}
                    >
                        <Media
                            uri={info.dish_media_url}
                            mediaType={info.dish_media_type}
                            style={{ width: "100%", height: "100%" }}
                            iconSize={25}
                            onPress={onPress}
                            muteControl="row"
                        />
                    </View>

                    <LinearGradient
                        pointerEvents="none"
                        colors={[
                            "rgba(0, 0, 0, 0.85)",
                            "rgba(0, 0, 0, 0.45)",
                            "rgba(0, 0, 0, 0)",
                        ]}
                        locations={[0, 0.6, 1]}
                        start={{ x: 0.5, y: 1 }}
                        end={{ x: 0.5, y: 0 }}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 35,   
                            borderBottomLeftRadius: mediaRadius,
                            borderBottomRightRadius: mediaRadius,
                        }}
                    />

                    {/* Bottom overlay — name left, stats right */}
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            bottom: mediaInset + 4,
                            left: mediaInset + 5,
                            right: mediaInset + 5,
                            flexDirection: "row",
                            alignItems: "flex-end",
                            justifyContent: "space-between",
                        }}
                    >
                        {/* Dish name */}
                        <Text
                            style={{
                                color: "white",
                                flexShrink: 1,
                                minWidth: 0,
                                marginRight: 6,
                            }}
                            className={textStyles.caption}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {info.dish_name}
                        </Text>

                        {/* Stats: love · star · cook */}
                        <View style={{ flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <FunctionRow icon={<FeedLoveIcon size={15} color="white" fillColor="red" liked={false} />} count={action_counts?.post_love ?? 0} />
                            <FunctionRow icon={<FeedStarIcon size={15} color="white" fillColor="yellow" starred={false} />} count={action_counts?.post_star ?? 0} />
                            <FunctionRow icon={<EggsIcon size={15} />} count={action_counts?.post_cook ?? 0} />
                        </View>
                    </View>

                </View>
            </View>
        </Gesture>
    );
};