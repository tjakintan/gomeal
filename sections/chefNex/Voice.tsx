import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

import { useTheme } from "@/provider/ThemeProvider";
import { Button } from "@/components/ButtonComponent";
import { useChefNexVoice } from "@/stores/chefNex/useChefNexVoice";

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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Gesture Handler
import {
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";

// Expo Image (avatars, artwork, etc.)
import { Image } from "expo-image";
import { GradientHeader } from "@/components/GradientComponent";
import { BackIcon } from "@/icons/Icon";


const MENU_HEIGHT = 65;


const voiceScreen: React.FC<{
    active?: boolean
}> = ({
    active = false,
}) => {

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


    return (
        <>
        
        </>
    );
};


const ChefNexVoiceScreen: React.FC<{
    isActive?: boolean; 
    dark?: boolean;
    onClose?: () => void; 
}> = ({ isActive, dark, onClose }) => {

    const insets = useSafeAreaInsets();
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
            <GradientHeader
                height={MENU_HEIGHT}
                baseColor={colors.background}
                direction="top"
                style={{
                    paddingTop: insets.top,
                }}
                contentStyle={{
                    height: MENU_HEIGHT,
                    paddingHorizontal: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
                zIndex={10}
            >
                {/* LEFT */}
                <View
                    style={{
                        width: 40,
                        alignItems: "flex-start",
                        justifyContent: "center",
                    }}
                >
                    <Button
                        onPress={() => {
                            onClose?.();
                        }}
                        clearBackground
                    >
                        <BackIcon color={colors.text} />
                    </Button>
                </View>

                <Text
                    className={textStyles.sectionText}
                    style={{
                        color: colors.text,
                        textAlign: "center",
                        flex: 1,
                    }}
                    pointerEvents="none"
                >
                    Speak...
                </Text>

            </GradientHeader>

        </View>
    )

};

export default ChefNexVoiceScreen;