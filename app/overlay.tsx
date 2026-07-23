import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Button } from "@/components/ButtonComponent";
import { XIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OverlayContent } from "@/stores/useOverlay";
import { GradientHeader } from "@/components/GradientComponent";

type Props = {
    content: OverlayContent;
    onClose: () => void;
    dark?: boolean;
};

export const Overlay: React.FC<Props> = ({ content, onClose, dark }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const insets = useSafeAreaInsets();

    return (
        <View style={{...StyleSheet.absoluteFillObject, backgroundColor: colors.background,}}>

            <View
                style={{
                    flex: 1,
                    marginTop: insets.top,
                    overflow: "hidden",
                }}
            >
                <GradientHeader
                    baseColor={colors.background}
                    height={90}
                    fadeSteps={[1, 0.95, 0.8, 0]}
                    contentStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 16,
                        paddingBottom: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            className={textStyles.h3}
                            numberOfLines={2}
                            style={{
                                color: colors.text,
                                marginRight: 12,
                            }}
                        >
                            {content.title}
                        </Text>
                    </View>

                    {content.showX !== false && (
                        <Button
                            onPress={onClose}
                            clearBackground
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                            }}
                        >
                            <XIcon color={colors.danger} />
                        </Button>
                    )}
                    
                </GradientHeader>

                <View
                    style={{ flex:1, padding: 16, paddingTop: 80, gap: 12 }}
                >
                    {content.body && (
                        <GradientHeader
                            baseColor={colors.background}
                            style={{
                                position: "relative",
                            }}
                        >
                            <Text className={textStyles.body} style={{ color: colors.secondaryText }}>
                                {content.body}
                            </Text>
                        </GradientHeader>
                    )}

                    {content.custom && (
                        <View style={{ flex: 1, marginTop: 10 }}>
                            {content.custom}
                        </View>
                    )}

                    {content.items?.map((item, i) => (
                        <View
                            key={i}
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 16,
                            }}
                        >
                            <Text
                                className={textStyles.bodyMedium}
                                style={{
                                    color: colors.secondaryText,
                                    flex: 1,
                                }}
                            >
                                {item.label}
                            </Text>

                            <View
                                style={{
                                    flex: 2,
                                    alignItems: "flex-end",
                                }}
                            >
                                <Text
                                    className={textStyles.bodyMedium}
                                    style={{ color: colors.text }}
                                >
                                    {String(item.value ?? "")}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

            </View>

        </View>
    );
};