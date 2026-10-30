import { Animated, useColorScheme } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { ThemePalette } from "@/types/layout.types";
import { ACCENT_COLORS } from "@/types";
import { useEffect, useRef, useState } from "react";
import ImageColors from "react-native-image-colors"

export const themeColors: Record<"light" | "dark", ThemePalette> = {
    light: {
        background: "#ffffff",
        card: "#f4f4f4",
        secondaryCard: "#e5e7eb",
        text: "#000000",
        secondaryText: "#4b5563",

        accent: "#5114d3",

        button: "#4A90D9",
        buttonSecondary: "#cccccc",

        messageSent: "#6894f4",
        messageReceived: "#E5E7EB",

        messageSentText: "#FFFFFF",
        messageReceivedText: "#111827",

        danger: "#dc2626",
    },

    dark: {
        background: "#000000",
        card: "#1c1c1e",
        secondaryCard: "#2c2c2e",
        text: "#ffffff",
        secondaryText: "#d1d5db",

        accent: "#5114d3",

        button: "#4A90D9",
        buttonSecondary: "#6b6b70",

        messageSent: "#2563EB",
        messageReceived: "#2C2C2E",

        messageSentText: "#FFFFFF",
        messageReceivedText: "#FFFFFF",

        danger: "#f65353",
    },
};

export const baseTextStyles = {
    display: "font-luckiest-guy text-4xl tracking-tight",
    h1: "font-luckiest-guy text-3xl tracking-tight",
    h2: "font-luckiest-guy text-2xl",
    h3: "font-luckiest-guy text-xl tracking-wide",
  
    section: "font-inter-semibold text-lg",
    sectionText: "font-inter-semibold text-base tracking-wide",
    body: "font-inter",
    
    bodyMedium: "font-luckiest-guy text-base",
    caption: "font-luckiest-guy text-sm tracking-wider",
    small: "font-thin text-xs tracking-wide ",
};

export const useActiveTheme = (): "light" | "dark" => {
  const themeSetting = useSettingsStore((state) => state.settings.app.theme);
  const systemTheme = useColorScheme();

  if (themeSetting === "system") {
    return systemTheme === "dark" ? "dark" : "light"; // fallback to "light"
  }

  return themeSetting;
};

export const useDark = () => {
    const accentColor = useSettingsStore((state) => state.settings.app.accentColor);
    const accentHex = ACCENT_COLORS[accentColor] ?? themeColors.dark.accent;
    
    return {
        ...themeColors.dark,
        accent: accentHex,
    };
};

export const useThemeColors = () => {

  const activeTheme = useActiveTheme();
  const accentColor = useSettingsStore((state) => state.settings.app.accentColor);

  const base = themeColors[activeTheme];

  const accentHex = ACCENT_COLORS[accentColor] ?? base.accent;

  return {
    ...base,
    accent: accentHex,
  };

};

export const useAnimatedThemeColors = (forceDark = false) => {
  const activeTheme = useActiveTheme();
  const isDark = forceDark || activeTheme === "dark";

  const accentColor = useSettingsStore((state) => state.settings.app.accentColor);
  const accentHex = ACCENT_COLORS[accentColor] ?? themeColors.dark.accent;

  const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isDark ? 1 : 0,
      duration: 250,
      // Must run on JS thread
      useNativeDriver: false, 
    }).start();
  }, [isDark]);

  const c = (key: keyof ThemePalette) =>
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.light[key], themeColors.dark[key]],
    });

  return {
    background: c("background"),
    card: c("card"),
    secondaryCard: c("secondaryCard"),
    text: c("text"),
    secondaryText: c("secondaryText"),
    button: c("button"),
    buttonSecondary: c("buttonSecondary"),
    danger: c("danger"),
    accent: accentHex,
  };
};

export const useTextStyles = () => {

    const { text } = useThemeColors(); 
    const colorClass = text === "#ffffff" ? "text-white" : "text-black";

    const themedStyles: Record<string, string> = {};

    Object.entries(baseTextStyles).forEach(([key, style]) => {
      const styleWithoutColor = style.replace(/\btext-(white|black|gray-\d+)\b/g, "").trim();

      themedStyles[key] = [styleWithoutColor, colorClass].filter(Boolean).join(" ");
    });

    return themedStyles;
};

export const useDarkTextStyles = () => {

  const colorClass = "text-white";
  const themedStyles: Record<string, string> = {};

  Object.entries(baseTextStyles).forEach(([key, style]) => {

    const styleWithoutColor = style.replace(/\btext-(white|black|gray-\d+)\b/g, "").trim();
    themedStyles[key] = [styleWithoutColor, colorClass].filter(Boolean).join(" ");

  });

  return themedStyles;
};

export function useProfileImageTextColor(imageUrl?: string | null) {
    const [textColor, setTextColor] = useState("#FFFFFF");

    useEffect(() => {
        if (!imageUrl) {
            setTextColor("#FFFFFF");
            return;
        }

        let cancelled = false;

        ImageColors.getColors(imageUrl, {
            fallback: "#000000",
            cache: true,
            key: imageUrl,
        })
            .then((result) => {
                if (cancelled) return;

                const hex =
                    result.platform === "ios"
                        ? result.background
                        : result.platform === "android"
                        ? result.average ?? result.dominant
                        : result.dominant;

                setTextColor(
                    hex ? getContrastingTextColor(hex) : "#FFFFFF"
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setTextColor("#FFFFFF");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [imageUrl]);

    return textColor;
}

function getContrastingTextColor(hex: string): string {
    const normalized = hex.replace("#", "").trim();

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return "#FFFFFF";
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);

    // Approximate perceived brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 200 ? "#000000" : "#FFFFFF";
}