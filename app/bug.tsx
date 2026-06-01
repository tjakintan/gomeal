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
import GomealGlassView from "@/components/GlassComponent";
import { apiFetch } from "@/api/api";
import { SpinningLogoImage } from "@/utils/Logo";
import { XIcon } from "@/icons/Icon";

type Options = {
    enabled?: boolean;
    onShake: () => void;
};

type BugReportScreenProps = {
    visible: boolean;
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
    visible,
    section,
    dark,
    onClose,
}) => {

    const sheetRef = useRef<BottomSheet>(null);
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (visible) {
            requestAnimationFrame(() => {
                sheetRef.current?.expand();
            });
        } else {
            sheetRef.current?.close();
        }
    }, [visible]);

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
        <BottomSheet
            ref={sheetRef}
            index={-1}
            snapPoints={[425]}
            enableDynamicSizing={false}
            enablePanDownToClose={false}
            enableContentPanningGesture={false}
            enableHandlePanningGesture={false}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            onClose={closeBugReport}
            backgroundStyle={{
                backgroundColor: "transparent",
                borderRadius: BUG_REPORT_RADIUS + 10,
            }}
            handleComponent={() => null}
            containerStyle={{
                zIndex: 1000,
                elevation: 1000,
            }}
        >

            <GomealGlassView
                glassEffectStyle="clear"
                style={{
                    height: 405,
                    marginHorizontal: 5,
                    borderRadius: BUG_REPORT_RADIUS + 10,
                }}
            >
                <View
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        opacity: 0.85,
                        backgroundColor: colors.secondaryCard,
                        borderRadius: BUG_REPORT_RADIUS + 10,
                    }}
                />

                <BottomSheetView
                    style={{
                        height: 385,
                        marginTop: 10,
                        marginHorizontal: 10,
                        padding: 16,
                        gap: 16,
                        overflow: "hidden",
                        alignSelf: "center",
                        backgroundColor: colors.background,
                        borderRadius: BUG_REPORT_RADIUS,
                    }}
                >
                    <View
                        style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: colors.secondaryCard,
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="bug-outline"
                                    size={18}
                                    color={colors.text}
                                />
                            </View>

                            <Text className={textStyles.h3}>
                                Bug Report
                            </Text>
                        </View>

                        <Button background onPress={closeBugReport}>
                            <XIcon color={colors.text} />
                        </Button>

                    </View>

                    <View style={{ gap: 8 }}>
                        <Text className={textStyles.bodyMedium} style={{ color: colors.text }}>
                            Support Category
                        </Text>

                        <View
                            style={{
                                height: 42,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                backgroundColor: colors.secondaryCard,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Text className={textStyles.caption} style={{ color: colors.text }}>
                                {section || "Bug report"}
                            </Text>
                        </View>
                    </View>

                    <View style={{ gap: 8, flex: 1 }}>
                        <Text className={textStyles.bodyMedium} style={{ color: colors.text }}>
                            Bug Description
                        </Text>

                        <Input
                            bottomSheet
                            multiline
                            value={message}
                            onChangeText={setMessage}
                            placeholder="What went wrong?"
                            style={{
                                minHeight: 98,
                                maxHeight: 120,
                                backgroundColor: colors.secondaryCard
                            }}
                        />
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            width: "100%",
                        }}
                    >
                        <Button
                            onPress={closeBugReport}
                            style={{
                                height: 42,
                                paddingHorizontal: 18,
                                borderRadius: 12,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: colors.secondaryCard,
                            }}
                        >
                            <Text className={textStyles.caption} style={{ color: colors.text }}>
                                Cancel
                            </Text>
                        </Button>

                        <View style={{ flex: 1 }}>
                            <Button
                                onPress={submitBugReport}
                                disabled={sending || !message.trim()}
                                style={{
                                    width: "100%",
                                    height: 42,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: sending || !message.trim() ? 0.45 : 1,
                                }}
                                background={sending ? false : true}
                            >
                                {sending ? (
                                    <SpinningLogoImage size={30} />
                                ) : (
                                    <Text className={textStyles.caption} style={{ color: colors.background }}>
                                        Submit
                                    </Text>
                                )}
                            </Button>
                        </View>

                    </View>

                </BottomSheetView>
                
            </GomealGlassView>

        </BottomSheet>
    );
};
