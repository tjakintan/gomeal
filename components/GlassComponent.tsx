import React, { ReactNode } from "react";
import { View } from "react-native";
import {
    GlassView,
    isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { GomealGlassViewProps } from "@/types/layout.types";
import { BlurView } from "expo-blur";

const GomealGlassView: React.FC<GomealGlassViewProps> = ({
    style,
    children,
    interactive = false,
    glassEffectStyle = "clear",
}) => {
    // Fallback if Liquid Glass is not supported
    if (!isLiquidGlassAvailable) {
        return (
            <BlurView
                intensity={60}
                tint="dark"
                style={[{ overflow: "hidden" }, style]}
            >
                {children}
            </BlurView>
        );
    }

    return (
        <GlassView
            style={style}
            glassEffectStyle={glassEffectStyle}
            isInteractive={interactive}
        >
            {children}
        </GlassView>
    );
};


export default GomealGlassView;
