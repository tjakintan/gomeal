import React, { useEffect, useState, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, TouchableWithoutFeedback, Keyboard, Animated, StyleSheet, AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Slot } from "expo-router";
import "@/style/global.css";
import { ThemeProvider, useTheme } from "@/provider/ThemeProvider";
import { FontProvider } from "@/provider/FontProvider";
import * as SplashScreen from "expo-splash-screen";
import { useUser } from "@/stores/useUser";
import { useFeed } from "@/stores/useFeed";
import { useSearch } from "@/stores/useSearch";
import BootScreen from "./boot";
import { startCacheSweep, stopCacheSweep, sweepStaleCaches } from "@/stores/cache";
import { pauseSocket, resumeSocket } from "@/api/socket";
import { KeyboardProvider } from "react-native-keyboard-controller";

const withTimeout = <T,>(
  promise: Promise<T>,
  ms: number,
  errorMessage = "request_timeout"
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeoutId)), timeout]);
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
        },
    },
});

function LayoutContent() {
  const { colors } = useTheme();
  const user = useUser((state) => state.user);
  const loadFeed = useFeed((state) => state.loadFeed);
  const loadTrend = useSearch((state) => state.loadTrend);

  const [booting, setBooting] = useState(true);
  const [showBootOverlay, setShowBootOverlay] = useState(true);
  const bootOpacity = useRef(new Animated.Value(1)).current;
  const bootStartedRef = useRef(false);

  const fadeOutBoot = (onDone?: () => void) => {
    setBooting(false);
    Animated.timing(bootOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setShowBootOverlay(false);
      onDone?.();
    });
  };

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!user) {
      bootStartedRef.current = false;
      fadeOutBoot();
      return;
    }

    if (bootStartedRef.current) return;
    bootStartedRef.current = true;

    let mounted = true;

    const boot = async () => {
        try {
            bootOpacity.setValue(1);
            setShowBootOverlay(true);
            setBooting(true);

            await withTimeout(
                Promise.all([
                    loadFeed(undefined, undefined, true, false),
                    loadTrend(),
                ]),
                7000,
                "feed_boot_timeout"
            );
        } catch (err) {
            if ((err as Error).message === "feed_boot_timeout") {
                console.warn("[boot] Feed timed out, showing stale or empty");
                // Don't throw — still fade out normally
            } else {
                console.log("[app_boot_error]", err);
            }
        } finally {
            if (!mounted) return;
            fadeOutBoot();
        }
    };

    boot();
    return () => { mounted = false; };
  }, [user?.sub]);

  useEffect(() => {
      if (user) {
          startCacheSweep();
      } else {
          stopCacheSweep();
      }
      return () => stopCacheSweep();
  }, [user?.sub]);

  useEffect(() => {
      const sub = AppState.addEventListener("change", (state) => {
          if (state === "active" && user) {
              sweepStaleCaches();
          }
      });
      return () => sub.remove();
  }, [user?.sub]);

  useEffect(() => {
      const sub = AppState.addEventListener("change", (state) => {
          if (state === "background") pauseSocket();
          if (state === "active" && user) resumeSocket();
      });
      return () => sub.remove();
  }, [user?.sub]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Slot />
        </GestureHandlerRootView>
      </TouchableWithoutFeedback>

      {showBootOverlay && (
        <Animated.View
          pointerEvents={booting ? "auto" : "none"}
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: bootOpacity,
            zIndex: 999,
          }}
        >
          <BootScreen />
        </Animated.View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      
        <QueryClientProvider client={queryClient}>
          <FontProvider>
            <ThemeProvider>
                <LayoutContent />
            </ThemeProvider>
          </FontProvider>
        </QueryClientProvider>
    </KeyboardProvider>
  );
}