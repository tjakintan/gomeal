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

type MinTagProps = {
    minCard: MinimumFeedCard;
    style?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    dark?: boolean;
    onPress?: () => void;
};

export const MinTag: React.FC<MinTagProps> = ({
    minCard,
    style,
    containerStyle,
    dark,
    onPress,
}) => {

    const { info } = minCard;
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

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
            <Pressable
                onPress={onPress}
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
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                margin: mediaInset,
                                borderRadius: mediaRadius,
                                overflow: "hidden",
                            },
                        ]}
                    >

                        <Media
                            uri={info.dish_media_url}
                            mediaType={info.dish_media_type}
                            style={{ width: "100%", height: "100%" }}
                            disableInteraction={true}
                            iconSize={25}
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
                            left: mediaInset,
                            right: mediaInset,
                            bottom: mediaInset,
                            height: 25,
                            borderBottomLeftRadius: mediaRadius,
                            borderBottomRightRadius: mediaRadius,
                        }}
                    />

                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            bottom: 5,
                            left: 10,
                            right: 10,
                            padding: 5,
                            minWidth: 0,
                        }}
                    >

                        <Text
                            style={{
                                color: "white",
                                flexShrink: 1,
                                minWidth: 0,
                            }}
                            className={textStyles.caption}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {info.dish_name}
                        </Text>

                    </View>

                </View>

            </Pressable>
        </Gesture>
    );

};