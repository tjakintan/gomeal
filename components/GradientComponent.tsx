// GradientComponent.tsx
import { LinearGradient } from "expo-linear-gradient";
import { View, ViewStyle, StyleProp } from "react-native";
import React from "react";

type GradientHeaderProps = {
  children: React.ReactNode;
  height?: number;
  baseColor: string; // pass colors.background here — required, no guessing
  fadeSteps?: number[]; // opacity stops, e.g. [1, 0.6, 0]
  direction?: "top" | "bottom";
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  zIndex?: number;
};

// Converts a hex color like "#0A0A0A" or "#FFFFFF" into an rgba string at a given opacity.
// Falls back gracefully if an rgb()/rgba() string is passed instead.
export function withOpacity(color: string, opacity: number): string {
  if (color.startsWith("rgba") || color.startsWith("rgb")) {
    const parts = color.match(/[\d.]+/g);
    if (!parts) return color;
    const [r, g, b] = parts;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function GradientHeader({
  children,
  height = 100,
  baseColor,
  fadeSteps = [1, 0.85, 0.5, 0],
  direction = "top",
  contentStyle,
  zIndex = 10,
  style,
}: GradientHeaderProps) {
  const colors = fadeSteps.map((opacity) => withOpacity(baseColor, opacity)) as [string, string, ...string[]];

  return (
    <View
      style={{
        position: "absolute",
        [direction]: 0,
        left: 0,
        right: 0,
        zIndex,
        ...style
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={colors}
        start={direction === "top"
          ? { x: 0, y: 0 }
          : { x: 0, y: 1 }}
        end={direction === "top"
          ? { x: 0, y: 1 }
          : { x: 0, y: 0 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height,
        }}
      />
      <View style={contentStyle}>{children}</View>
    </View>
  );
}