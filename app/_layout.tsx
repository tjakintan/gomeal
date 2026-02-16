//Entry point for layout 
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Slot } from "expo-router";
import "@/style/global.css";
import { ThemeProvider, useTheme } from "@/provider/ThemeProvider";
import { FontProvider } from "@/provider/FontProvider";


function LayoutContent() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Slot />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <FontProvider>
      <ThemeProvider>
        <LayoutContent />
      </ThemeProvider>
    </FontProvider>
  );
}
