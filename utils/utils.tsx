import { Image, Text, View, StyleSheet } from "react-native";
import { Gesture as RNGesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { GestureProps, SectionIconProps } from "@/types/layout";
import { ThemePalette } from "@/types/layout";

export const glassStyle = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  containerStyle: {
    position: 'absolute',
    top: 200,
    left: 50,
    width: 250,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  glass1: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  glass2: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  glass3: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});


/** -------------------------------
 * Gesture Component with Haptics
 * -------------------------------
 */
export const Gesture: React.FC<GestureProps> = ({
  children,
  style,
  scaleAmount = 0.88,
  duration = 100,
  haptic = true, 
}) => {
  const scale = useSharedValue(1);
  const hapticsEnabled = useSettingsStore(
    (state) => state.settings.app.hapticsEnabled
  );
  const tap = RNGesture.Tap()
    .onBegin(() => {
      "worklet";
      scale.value = withSpring(scaleAmount, {
        damping: 20,
        stiffness: 600,
        mass: 0.3,
      });
      if (haptic && hapticsEnabled) {
        runOnJS(Haptics.impactAsync)(
          Haptics.ImpactFeedbackStyle.Light
        );
      }
    })
    .onFinalize(() => {
      "worklet";
      scale.value = withSpring(1, {
        damping: 20,
        stiffness: 600,
        mass: 0.3,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tap}><Animated.View style={[style, animatedStyle]}>{children}</Animated.View></GestureDetector>
  );
};

/** -------------------------------
 * Navigation Icon Component
 * -------------------------------
 */
export const Icons: React.FC<SectionIconProps> = ({ name, img_url }) => {
  return (
    <View className="flex items-center">
      <Image source={img_url} className="w-7 h-7" resizeMode="contain" />
      <Text className="font-thin text-xs mt-1">{name}</Text>
    </View>
  );
};

/** -------------------------------
 * Theme Hooks
 * -------------------------------
 */

// Get the active theme: light | dark
export const useActiveTheme = (): "light" | "dark" => {
  const themeSetting = useSettingsStore((state) => state.settings.app.theme);
  const systemTheme = useColorScheme(); // "light" | "dark"
  return themeSetting === "system" ? systemTheme! : themeSetting;
};

// Full color palette
export const themeColors: Record<"light" | "dark", ThemePalette> = {
  light: {
    background: "#ffffff",
    card: "#f8f8f8",
    secondaryCard: "#e5e7eb",
    text: "#000000",
    secondaryText: "#4b5563",
    accent: "#5114d3",
  },
  dark: {
    background: "#000000",
    card: "#1c1c1e",
    secondaryCard: "#2c2c2e",
    text: "#ffffff",
    secondaryText: "#d1d5db",
    accent: "#5114d3",
  },
};

// Hook to get all colors dynamically
export const useThemeColors = () => {
  const activeTheme = useActiveTheme();
  return themeColors[activeTheme];
};

/** -------------------------------
 * Text Styles
 * -------------------------------
 */
export const baseTextStyles = {
  display: "font-inter-extrabold text-4xl tracking-tight",
  h1: "font-inter-extrabold text-3xl tracking-tight",
  h2: "font-inter-bold text-2xl",
  h3: "font-inter-semibold text-xl",
  section: "font-inter-semibold text-lg",
  body: "font-inter text-base",
  bodyMedium: "font-inter-medium text-base",
  caption: "font-inter text-sm",
  small: "font-thin text-xs tracking-widest",
};

// Dynamic text styles based on active theme
export const useTextStyles = () => {
  const { text } = useThemeColors(); // current text color
  const colorClass = text === "#ffffff" ? "text-white" : "text-black";

  const themedStyles: Record<string, string> = {};

  Object.entries(baseTextStyles).forEach(([key, style]) => {
    const styleWithoutColor = style.replace(/\btext-(white|black|gray-\d+)\b/g, "").trim();

    themedStyles[key] = [styleWithoutColor, colorClass].filter(Boolean).join(" ");
  });

  return themedStyles;
};