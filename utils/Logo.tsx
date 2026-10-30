import { useTheme } from "@/provider/ThemeProvider";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface SpinningLogoImageProps {
  dark?: boolean;
  size?: number;
  duration?: number;
}

export const SpinningLogoImage: React.FC<SpinningLogoImageProps> = ({
  dark,
  size = 200,
  duration = 1200,
}) => {

  const { colors } = useTheme(dark ? "dark" : undefined);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [duration, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const strokeWidth = Math.max(5, size * 0.06);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Length of the visible rotating segment
  const segmentLength = circumference * 0.22;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Solid center circle */}
      <View
        style={{
          position: "absolute",
          width: size * 0.58,
          height: size * 0.58,
          borderRadius: 999,
          backgroundColor: colors.button,
        }}
      />

      {/* Rotating progress arc */}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          transform: [{ rotate }],
        }}
      >
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={colors.text}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${segmentLength} ${circumference}`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};