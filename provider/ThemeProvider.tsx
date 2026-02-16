import React, { createContext, useContext } from "react";
import { useThemeColors, useTextStyles } from "@/utils/utils";

type ThemeContextType = {
  colors: ReturnType<typeof useThemeColors>;
  textStyles: ReturnType<typeof useTextStyles>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colors = useThemeColors();
  const textStyles = useTextStyles();
  return <ThemeContext.Provider value={{ colors, textStyles }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};
