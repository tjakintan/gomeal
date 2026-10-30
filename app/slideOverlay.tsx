import { useTheme } from "@/provider/ThemeProvider";
import { getScreenCornerRadius } from "expo-screen-corners";
import React from "react";
import { View, StyleSheet } from "react-native";

type Props = {
    children: React.ReactNode;
    dark?: boolean;
};

const SlidingOverlay = ({ children, dark }: Props) => {
    const { colors } = useTheme(dark ? "dark" : undefined);

    const radius = getScreenCornerRadius();

    return (
        <View
            style={[
                StyleSheet.absoluteFillObject,
                {
                    zIndex: 2000,
                    borderRadius: radius,
                    backgroundColor: colors.background,
                    overflow: "visible",
                    shadowColor: colors.text,
                    shadowOpacity: 0.12,
                    shadowRadius: radius,
                    shadowOffset: { width: 0, height: -1 },
                    elevation: 2,
                },
            ]}
        >
            <View
                style={{
                    flex: 1,
                    borderRadius: radius,
                    backgroundColor: colors.background,
                    overflow: "hidden",
                }}
            >
                {children}
            </View>
        </View>
    );
};

export default SlidingOverlay;