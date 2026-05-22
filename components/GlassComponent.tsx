import React, { ReactNode } from "react";
import { Pressable, View, StyleProp, ViewStyle, StyleSheet } from "react-native";
import {
    GlassView,
    GlassContainer,
    isLiquidGlassAvailable,
    isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { GomealGlassViewProps } from "@/types/layout.types";

const GomealGlassView: React.FC<GomealGlassViewProps> = ({
    style,
    children,
    glassEffectStyle = "clear",
}) => {
    // Fallback if Liquid Glass is not supported
    if (!isLiquidGlassAvailable) {
        return (
            <View style={style}>
                {children}
            </View>
        );
    }

    return (
        <GlassView
            style={style}
            glassEffectStyle={glassEffectStyle}
            isInteractive={false}
            pointerEvents="box-none"
        >
            {children}
        </GlassView>
    );
};


export default GomealGlassView;
