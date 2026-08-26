import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { BackIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { Button } from "@/components/ButtonComponent";

const ChefNexImageScreen: React.FC<{isActive?: boolean; dark: boolean }> = ({ isActive, dark }) => {

    const { colors, textStyles} = useTheme(dark ? "dark" : undefined);

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background
            }}
        >

        </View>
    )

};

export default ChefNexImageScreen;

