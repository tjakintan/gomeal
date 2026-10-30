import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { DisclaimerIcon } from "@/icons/Icon";

type DisclaimerProps = {
    dark?: boolean;
    title?: string;
    message?: string;
};

export const Disclaimer: React.FC<DisclaimerProps> = ({
    dark,
    title = "DISCLAIMER",
    message = "Always check ingredients for allergens and dietary restrictions. Use proper food handling and cooking techniques, and exercise caution when using knives, utensils, ovens, or stoves.",
}) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    return (
        <View
            style={{
                minHeight: 100,
                width: "95%",
                marginTop: 10,
                alignSelf: "center",
                borderRadius: 20,
                padding: 14,
                flexDirection: "row",
                gap: 10,
                backgroundColor: colors.secondaryCard,
            }}
        >
            <DisclaimerIcon size={24} color="#fffc41" />

            <View style={{ flex: 1, gap: 4 }}>
                <Text
                    style={{
                        color: colors.danger,
                        fontWeight: "700",
                    }}
                    className={textStyles.body}
                >
                    {title}
                </Text>

                <Text
                    style={{
                        color: colors.text,
                        opacity: 0.75,
                        lineHeight: 18,
                    }}
                    className={textStyles.body}
                >
                    {message}
                </Text>
            </View>
        </View>
    );
};

export default Disclaimer;