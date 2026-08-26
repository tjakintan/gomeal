import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    StyleProp,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { SearchFeedCard } from "@/types/feed.types";
import { Media } from "@/media/media";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture } from "@/components/ButtonComponent";
import { formatCount } from "@/utils/time";
import { EggsIcon, LikeIcon, StarIcon } from "@/icons/Icon";
import { DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { capitalize, limitLength } from "@/utils/text";

type DiscoveryTagProps = {
    card: SearchFeedCard;
    style?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    dark?: boolean;
    onPress?: (layout: {
        x: number;
        y: number;
        width: number;
        height: number;
    }) => void;
    onPressProfile?: () => void;
};

const FunctionRow: React.FC<{
    icon: React.ReactNode;
    count: number;
}> = ({ icon, count }) => (
    <View
        style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
        }}
    >
        {icon}

        <Text
            style={{
                color: "white",
                fontSize: 10,
                fontWeight: "500",
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowOffset: {
                    width: 0,
                    height: 1,
                },
                textShadowRadius: 3,
            }}
        >
            {formatCount(count)}
        </Text>
    </View>
);

export const DiscoveryTag: React.FC<DiscoveryTagProps> = ({
    card,
    style,
    containerStyle,
    dark,
    onPress,
    onPressProfile,
}) => {

    const { info, action_counts, avatar, tag_color, profile_name, firstName, lastName } = card;
    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    console.log(info, profile_name)

    const mediaRef = React.useRef<View>(null);

    return (
            <View
                style={[
                    {
                        width: 155,
                        height: 250,
                        flexDirection: "column",
                        borderWidth: 2,
                        borderColor: colors.card,
                        borderRadius: 30,
                        overflow: "hidden"
                    },
                    style,
                ]}
            >
                {/* Media */}
                <View
                    ref={mediaRef}
                    style={{
                        height: 175,
                        width: "100%",
                        overflow: "hidden",
                    }}
                >
                    <Media
                        uri={info.dish_media_url}
                        mediaType={info.dish_media_type}
                        style={{
                            width: "100%",
                            height: "100%",
                        }}
                        iconSize={25}
                        muteControl="row"
                        onPress={() => {
                            mediaRef.current?.measureInWindow(
                                (x, y, width, height) => {
                                    onPress?.({
                                        x,
                                        y,
                                        width,
                                        height,
                                    });
                                }
                            );
                        }}
                    />

                    {/* Bottom gradient */}
                    <LinearGradient
                        pointerEvents="none"
                        colors={[
                            "rgba(0,0,0,0.9)",
                            "rgba(0,0,0,0.45)",
                            "rgba(0,0,0,0)",
                        ]}
                        locations={[0, 0.6, 1]}
                        start={{ x: 0.5, y: 1 }}
                        end={{ x: 0.5, y: 0 }}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 45,
                        }}
                    />

                    {/* Stats */}
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            left: 8,
                            right: 8,
                            bottom: 7,
                            gap: 5,
                            flexDirection: "column",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                        }}
                    >
                        <FunctionRow
                            icon={<LikeIcon size={17} />}
                            count={
                                action_counts?.post_love ?? 0
                            }
                        />

                        <FunctionRow
                            icon={
                                <StarIcon
                                    size={17}
                                    color="yellow"
                                    fillColor="yellow"
                                />
                            }
                            count={
                                action_counts?.post_star ?? 0
                            }
                        />

                        <FunctionRow
                            icon={<EggsIcon size={17} />}
                            count={
                                action_counts?.post_cook ?? 0
                            }
                        />

                    </View>

                </View>


                {/* Creator row */}
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

            </View>
    );
};

export const EmptyDiscoveryTag: React.FC<{
    style?: StyleProp<ViewStyle>;
    dark?: boolean;
}> = ({ style, dark }) => {

    const { colors } = useTheme(dark ? "dark" : undefined);

    return (
        <View
            style={[
                {
                    width: 155,
                    height: 250,
                    flexDirection: "column",
                    borderWidth: 2,
                    borderColor: colors.card,
                    borderRadius: 30,
                    overflow: "hidden",
                },
                style,
            ]}
        >
            {/* Media skeleton */}
            <View
                style={{
                    height: 175,
                    width: "100%",
                    backgroundColor: colors.secondaryCard,
                }}
            />

            {/* Creator row skeleton */}
            <View
                style={{
                    flex: 1,
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    paddingHorizontal: 5,
                    paddingTop: 8,
                    paddingBottom: 5,
                    gap: 8,
                }}
            >
                <View
                    style={{
                        width: "70%",
                        height: 12,
                        borderRadius: 10,
                        backgroundColor: colors.secondaryCard,
                    }}
                />

                <View
                    style={{
                        gap: 6,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <View
                        style={{
                            width: 25,
                            height: 25,
                            borderRadius: 999,
                            backgroundColor: colors.secondaryCard,
                        }}
                    />

                    <View
                        style={{
                            flex: 1,
                            gap: 5,
                        }}
                    >
                        <View
                            style={{
                                width: "60%",
                                height: 10,
                                borderRadius: 10,
                                backgroundColor: colors.secondaryCard,
                            }}
                        />

                        <View
                            style={{
                                width: "40%",
                                height: 8,
                                borderRadius: 10,
                                backgroundColor: colors.secondaryCard,
                            }}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

export default DiscoveryTag;