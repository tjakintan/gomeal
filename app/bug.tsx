import { useEffect, useRef, useState } from "react";
import { Accelerometer } from "expo-sensors";
import { Text, View } from "react-native";
import { create_bug_report_api } from "@/api/profile.api";
import { useTheme } from "@/provider/ThemeProvider";
import { Input } from "@/components/InputComponent";
import { Button } from "@/components/ButtonComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { XIcon } from "@/icons/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export type Options = {
    enabled?: boolean;
    onShake: () => void;
};

export type BugReportScreenProps = {
    section: string;
    dark?: boolean;
    onClose: () => void;
};

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

