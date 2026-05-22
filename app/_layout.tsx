import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Slot } from "expo-router";
import "@/style/global.css";
import { ThemeProvider, useTheme } from "@/provider/ThemeProvider";
import { FontProvider } from "@/provider/FontProvider";
import * as SplashScreen from "expo-splash-screen";

function LayoutContent() {

  const { colors } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Slot />
          </GestureHandlerRootView>
        </TouchableWithoutFeedback>
    </View>
  );
}

export default function RootLayout() {
  const [granted, setGranted] = useState(false);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <FontProvider>
        <ThemeProvider>
          <LayoutContent />
        </ThemeProvider>
      </FontProvider>
    </QueryClientProvider>
  );
}
