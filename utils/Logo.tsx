import React, { useEffect, useRef } from "react";
import { Animated, Easing, ImageSourcePropType, StyleProp, ImageStyle } from "react-native";

const DEFAULT_LOGO = require("../assets/logo/gomeal_icon.png");

interface SpinningLogoImageProps {
  size?: number;
  duration?: number;
}

export const SpinningLogoImage: React.FC<SpinningLogoImageProps> = ({
  size = 200,
  duration = 2000,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = () => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => spin());
    };

    spin();
  }, [rotateAnim, duration]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.Image
      source={DEFAULT_LOGO}
      style={{
          width: size,
          height: size,
          transform: [{ rotate }],
        }}
      resizeMode="contain"
    />
  );
};
