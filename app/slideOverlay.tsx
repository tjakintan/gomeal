import { useTheme } from "@/provider/ThemeProvider";
import React from "react";
import { View, StyleSheet } from "react-native";

type Props = {
    children: React.ReactNode;
    dark?: boolean;
};

const SlidingOverlay = ({ children, dark }: Props) => {

    const { colors } = useTheme(dark ? "dark" : undefined);

    return (
        <View
            style={[
                StyleSheet.absoluteFillObject,
                {
                    zIndex: 2000,
                    backgroundColor: colors.background,
                },
            ]}
        >
            {children}
        </View>
    );
};

export default SlidingOverlay;