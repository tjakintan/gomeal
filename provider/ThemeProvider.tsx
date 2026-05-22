import React, { createContext, useContext } from "react";
import { useThemeColors, useTextStyles, useDark, useDarkTextStyles } from "@/stores/useTheme";

type ThemeContextType = {
  colors: ReturnType<typeof useThemeColors>;
  textStyles: ReturnType<typeof useTextStyles>;
};

type ThemeProviderProps = {
    children: React.ReactNode;
    override?: "dark";
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colors = useThemeColors();
  const textStyles = useTextStyles();
  return <ThemeContext.Provider value={{ colors, textStyles }}>{children}</ThemeContext.Provider>;
};

export const useTheme = (override?: "dark") => {

  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");

  const darkColors = useDark();
  const darkTextStyles = useDarkTextStyles();

  if (override === "dark") {
    return {
      colors: darkColors,
      textStyles: darkTextStyles,
    };
  }

  return context;
};
