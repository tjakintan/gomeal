import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

import { useTheme } from "@/provider/ThemeProvider";
import { Button } from "@/components/ButtonComponent";
import { useChefNexVoice } from "@/stores/useChefNex";

// Reanimated
import AnimatedReanimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSpring,
    interpolate,
    interpolateColor,
    cancelAnimation,
    Easing,
} from "react-native-reanimated";

// Skia
import {
    Canvas,
    Circle,
    Group,
    Blur,
    Paint,
    RadialGradient,
    vec,
    useClock,
} from "@shopify/react-native-skia";

// Audio
import {
    useAudioRecorder,
    useAudioPlayer,
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
} from "expo-audio";

// Haptics
import * as Haptics from "expo-haptics";

// Linear Gradient
import { LinearGradient } from "expo-linear-gradient";

// Safe Area
import { SafeAreaView } from "react-native-safe-area-context";

// Gesture Handler
import {
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";

// Expo Image (avatars, artwork, etc.)
import { Image } from "expo-image";


const chefNexVoiceRing: React.FC = () => {

    const orbScale = useSharedValue(1);
    const haloRotation = useSharedValue(0);
    const glowStrength = useSharedValue(0.6);
    const ripple = useSharedValue(0);

    const clock = useClock();

    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const player = useAudioPlayer();

    const canvasRef = useRef(null);
    const socketRef = useRef(null);

    // Initialize Audio
    useEffect(() => {
        setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            allowsRecording: true,
        });
    }, []);

}

const ChefNexVoiceScreen: React.FC<{isActive?: boolean; dark: boolean }> = ({ isActive, dark }) => {

    const { colors, textStyles} = useTheme(dark ? "dark" : undefined);
    const {
        messages,
        isRecording,
        isChefNexSpeaking,
        error,

        connect,
        disconnect,

        startListening,
        stopListening,

        sendPcmChunk,

        pushChefNexMessage,
        pushUserMessage,

    } = useChefNexVoice();

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background
            }}
        >

        </View>
    )

};

export default ChefNexVoiceScreen;