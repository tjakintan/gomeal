import { useEffect, useRef, useState } from "react";
import { Accelerometer } from "expo-sensors";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { create_bug_report_api } from "@/api/profile.api";
import { useTheme } from "@/provider/ThemeProvider";
import { useUser } from "@/stores/useUser";
import { Input } from "@/components/InputComponent";
import { Button } from "@/components/ButtonComponent";
import { apiFetch } from "@/api/api";
import { SpinningLogoImage } from "@/utils/Logo";
import { XIcon } from "@/icons/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

type Options = {
    enabled?: boolean;
    onShake: () => void;
};

type BugReportScreenProps = {
    section: string;
    dark: boolean;
    onClose: () => void;
};

const BUG_REPORT_RADIUS = 28;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useActivateBugReport({ enabled = true, onShake }: Options) {
    const onShakeRef = useRef(onShake);
    const lastShakeAt = useRef(0);
    const lastMagnitude = useRef(0);
    const shakeHits = useRef<number[]>([]);
    const baselineMagnitude = useRef<number | null>(null);
    const baselineSamples = useRef<number[]>([]);

    useEffect(() => {
        onShakeRef.current = onShake;
    }, [onShake]);

    useEffect(() => {
        if (!enabled) return;

        let mounted = true;
        let subscription: { remove: () => void } | null = null;

        const start = async () => {
            const available = await Accelerometer.isAvailableAsync();
            if (!available || !mounted) return;

            Accelerometer.setUpdateInterval(40);

            subscription = Accelerometer.addListener(({ x, y, z }) => {
                const now = Date.now();
                const magnitude = Math.sqrt(x * x + y * y + z * z);

                // Build a rolling baseline over first 20 samples
                // so resting gravity (~1.0) is factored out per-device
                if (baselineSamples.current.length < 20) {
                    baselineSamples.current.push(magnitude);
                    baselineMagnitude.current =
                        baselineSamples.current.reduce((a, b) => a + b, 0) /
                        baselineSamples.current.length;
                    lastMagnitude.current = magnitude;
                    return;
                }

                const baseline = baselineMagnitude.current ?? 1;
                const delta = Math.abs(magnitude - lastMagnitude.current);
                const deviation = Math.abs(magnitude - baseline);

                lastMagnitude.current = magnitude;

                // Require both a sharp spike AND meaningful deviation from rest
                const isShakeHit = delta > 1.2 && deviation > 0.8;

                if (!isShakeHit) return;

                // Sliding window: only keep hits within last 600ms
                const window = 600;
                shakeHits.current = shakeHits.current
                    .filter((hitAt) => now - hitAt < window)
                    .concat(now);

                // Need 4 hits in window (up from 3) to reduce false positives
                // and enforce a cooldown between triggers
                if (
                    shakeHits.current.length >= 4 &&
                    now - lastShakeAt.current > 1500
                ) {
                    lastShakeAt.current = now;
                    shakeHits.current = [];
                    onShakeRef.current();
                }
            });
        };

        start();

        return () => {
            mounted = false;
            subscription?.remove();
            // Reset calibration on unmount so re-mount recalibrates
            baselineSamples.current = [];
            baselineMagnitude.current = null;
        };
    }, [enabled]);
}

export const BugReportScreen: React.FC<BugReportScreenProps> = ({
    section,
    dark,
    onClose,
}) => {

    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const closeBugReport = () => {
        if (sending) return;
        setMessage("");
        onClose();
    };

    const submitBugReport = async () => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage || sending) return;

        try {
            setSending(true);

            const res = await create_bug_report_api(section || "unknown", trimmedMessage);

            if (!res.ok) {
                throw new Error("bug_report_failed");
            }

            setMessage("");
            onClose();
        } catch (err) {
            console.log("[bug_report_error]", err);
        } finally {
            setSending(false);
        }
    };

    return (
        <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
                flexGrow: 1,
                gap: 10,
                justifyContent: "center",
                paddingBottom: insets.bottom,
            }}
            extraKeyboardSpace={0}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
    
            {/* Category */}
            <View style={{ gap: 8, width: "100%" }}>
                <Text
                    className={textStyles.bodyMedium}
                    style={{ color: colors.text }}
                >
                    Support Category
                </Text>

                <View
                    style={{
                        height: 44,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        justifyContent: "center",
                        backgroundColor: colors.secondaryCard,
                    }}
                >
                    <Text
                        className={textStyles.caption}
                        style={{ color: colors.text }}
                    >
                        {section || "Bug Report"}
                    </Text>
                </View>
            </View>

            {/* Description */}
            <View style={{  width :"100%", gap: 8 }}>
                <Text
                    className={textStyles.bodyMedium}
                    style={{ color: colors.text }}
                >
                    Bug Description
                </Text>

                <Input
                    multiline
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Describe what happened..."
                    style={{
                        flex: 1,
                        textAlignVertical: "top",
                        backgroundColor: colors.secondaryCard,
                    }}
                    containerStyle={{
                        height: 150
                    }}
                />
            </View>

            {/* Footer */}
            <View
                style={{
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                }}
            >

                <Button
                    onPress={submitBugReport}
                    disabled={sending || !message.trim()}
                    background={!sending}
                    style={{
                        width: 200,
                        height: 60,
                        opacity: sending || !message.trim() ? 0.45 : 1,
                    }}
                >
                    {sending ? (
                        <SpinningLogoImage size={30} />
                    ) : (
                        <Text
                            className={textStyles.h3}
                            style={{ color: colors.text }}
                        >
                            Submit
                        </Text>
                    )}
                </Button>

                <Button
                    onPress={closeBugReport}
                    style={{
                        width: 200,
                        height: 55,
                        backgroundColor: colors.danger,
                    }}
                    background
                >
                    <Text
                        className={textStyles.h3}
                        style={{ color: colors.text }}
                    >
                        Cancel
                    </Text>
                </Button>


            </View>

        </KeyboardAwareScrollView>
    );
};
