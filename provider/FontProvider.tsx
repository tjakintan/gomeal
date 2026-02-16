// theme/FontProvider.tsx
import React, { createContext, useContext, ReactNode } from "react";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
const FontContext = createContext<{ fontsLoaded: boolean }>({ fontsLoaded: false });

export const FontProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <FontContext.Provider value={{ fontsLoaded }}>
      {children}
    </FontContext.Provider>
  );
};

export const useFontsLoaded = () => useContext(FontContext).fontsLoaded;
