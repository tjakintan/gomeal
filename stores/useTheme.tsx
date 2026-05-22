import { useColorScheme } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { ThemePalette } from "@/types/layout.types";
import { ACCENT_COLORS } from "@/types";
    
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
      danger: "#f65353", 
    },
};

export const baseTextStyles = {
    display: "font-luckiest-guy text-4xl tracking-tight",
    h1: "font-luckiest-guy text-3xl tracking-tight",
    h2: "font-luckiest-guy text-2xl",
    h3: "font-luckiest-guy text-xl tracking-wide",
  
    section: "font-inter-semibold text-lg tracking-widest",
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



