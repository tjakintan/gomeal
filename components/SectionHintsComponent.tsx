import React, { useEffect, useRef } from "react";
import { Animated, Text, View, TouchableOpacity } from "react-native";
import { PostSection, POST_SECTIONS_HINTS } from "@/types";
import { useTheme } from "@/provider/ThemeProvider";
import { SpinningLogoImage } from "@/utils/Logo";

type Props = {
  section: PostSection | null;
  visible: boolean;
  onDismiss: () => void;
};

const SectionHintOverlay: React.FC<Props> = ({ section, visible, onDismiss }) => {
  const { colors, textStyles } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, section]);

  if (!section) return null;

  const hint = POST_SECTIONS_HINTS[section];

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
        opacity,
        transform: [{ translateY }],
        zIndex: 50,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onDismiss}
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 16,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }}
      >
        {/* Icon cube */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: colors.button,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SpinningLogoImage size={30} />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: "700",
              fontSize: 14,
              marginBottom: 3,
            }}
          >
            {hint.title}
          </Text>
          <Text
            style={{
              color: colors.text,
              opacity: 0.65,
              fontSize: 12,
              lineHeight: 17,
            }}
          >
            {hint.description}
          </Text>
        </View>

        {/* Dismiss pill */}
        <Text style={{ color: colors.text, opacity: 0.35, fontSize: 11, marginTop: 2 }}>
          tap to close
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default SectionHintOverlay;