import React, { createContext, useContext, ReactNode } from "react";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts, LuckiestGuy_400Regular } from '@expo-google-fonts/luckiest-guy';

const FontContext = createContext<{ fontsLoaded: boolean }>({ fontsLoaded: false });

export const FontProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    LuckiestGuy_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <FontContext.Provider value={{ fontsLoaded }}>
      {children}
    </FontContext.Provider>
  );
};

export const useFontsLoaded = () => useContext(FontContext).fontsLoaded;
