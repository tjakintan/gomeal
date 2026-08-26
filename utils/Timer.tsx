import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    Animated,
    PanResponder,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { StepTimer } from "@/types";
import { useTimer, TIMER_FIELDS } from "@/stores/useTimer";
import { Button } from "@/components/ButtonComponent";
import { BackIcon, NoTimerIcon, TimerIcon } from "../icons/Icon";
import { SectionHeader } from "@/components/SectionComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_H    = 100;
const PAD_ITEMS = 2;
const PICKER_H  = ITEM_H * (PAD_ITEMS * 2 + 1); // 5 visible rows

// ─── Utils ────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

// ─── PickerColumn ─────────────────────────────────────────────────────────────

interface PickerColumnProps {
    max: number;
    value: number;
    label: string;
    onChange: (v: number) => void;
}

const PickerColumn: React.FC<PickerColumnProps> = ({ max, value, label, onChange }) => {
    const { colors } = useTheme();

    const translateY = useRef(new Animated.Value(-value * ITEM_H)).current;
    const anim       = useRef<Animated.CompositeAnimation | null>(null);
    const baseY      = useRef(-value * ITEM_H); // Y at gesture start
    const curValue   = useRef(value);

    // Keep latest props accessible inside PanResponder without stale closures
    const maxRef      = useRef(max);
    const onChangeRef = useRef(onChange);
    useEffect(() => { maxRef.current = max; }, [max]);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // Sync when value changes externally (e.g. Clear)
    useEffect(() => {
        const target = -value * ITEM_H;
        anim.current?.stop();
        anim.current = Animated.spring(translateY, {
            toValue: target,
            useNativeDriver: true,
            stiffness: 180,
            damping: 24,
            mass: 0.6,
        });
        anim.current.start();
        curValue.current = value;
        // baseY intentionally not updated here — only set on gesture grant
    }, [value]);

    // All logic in plain functions that read from refs — zero stale closure risk
    const clampY = (y: number) => {
        const min = -(maxRef.current - 1) * ITEM_H - ITEM_H * 0.5;
        const max = ITEM_H * 0.5;
        return Math.max(min, Math.min(max, y));
    };

    const snapToNearest = (y: number, vy = 0) => {
        // gs.vy is px/ms — scales for natural flick distance
        const flicked = y + vy * 120;
        const idx     = Math.round(-flicked / ITEM_H);
        const clamped = Math.max(0, Math.min(maxRef.current - 1, idx));
        const target  = -clamped * ITEM_H;

        anim.current?.stop();
        anim.current = Animated.spring(translateY, {
            toValue: target,
            useNativeDriver: true,
            stiffness: 180,
            damping: 24,
            mass: 0.6,
        });
        anim.current.start();

        if (clamped !== curValue.current) {
            curValue.current = clamped;
            onChangeRef.current(clamped);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder:  () => true,

            onPanResponderGrant: () => {
                // Capture exact current position before gesture starts
                anim.current?.stop();
                translateY.stopAnimation((y) => {
                    baseY.current = y;
                });
            },

            onPanResponderMove: (_e, gs) => {
                // gs.dy = total displacement from grant — correct, no double-counting
                const next = clampY(baseY.current + gs.dy);
                translateY.setValue(next);

                const idx = Math.max(0, Math.min(maxRef.current - 1, Math.round(-next / ITEM_H)));
                if (idx !== curValue.current) {
                    curValue.current = idx;
                    onChangeRef.current(idx);
                }
            },

            onPanResponderRelease: (_e, gs) => {
                // gs.vy = velocity in px/ms, already computed by RN gesture system
                snapToNearest(clampY(baseY.current + gs.dy), gs.vy);
            },

            onPanResponderTerminate: (_e, gs) => {
                snapToNearest(clampY(baseY.current + gs.dy));
            },
        })
    ).current;

    const items = Array.from({ length: max }, (_, i) => i);

    return (
        <View
            style={{
                flex: 1,                 // ← ONLY flex here — no width, since width IS the
                                          //   main axis in this row and would override flex
                height: PICKER_H,
                overflow: "hidden",
                position: "relative",
            }}
        >
            <Text
                pointerEvents="none"
                style={{
                    position: "absolute",
                    right: 4,
                    top: PICKER_H / 2 - 8,
                    fontSize: 11,
                    fontWeight: "500",
                    opacity: 0.35,
                    letterSpacing: 0.5,
                    zIndex: 12,
                    color: colors.text,
                }}
            >
                {label}
            </Text>

            {/* drag surface */}
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
                {...panResponder.panHandlers}
            />

            <Animated.View
                pointerEvents="none"
                style={{ transform: [{ translateY }], paddingTop: PAD_ITEMS * ITEM_H }}
            >
                {items.map((item) => {
                    const dist    = Math.abs(item - value);
                    const opacity =
                        dist === 0 ? 1 :
                        dist === 1 ? 0.4 :
                        dist === 2 ? 0.15 :
                        0.05;
                    const fontSize =
                        dist === 0 ? 46 :
                        dist === 1 ? 34 :
                        dist === 2 ? 24 :
                        18;

                    return (
                        <View
                            key={item}
                            style={{
                                height: ITEM_H,
                                width: "100%",       // fine here — this View's parent stacks
                                                      // in the default column direction, so
                                                      // width is the cross axis, not main axis
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.text,
                                    opacity,
                                    fontSize,
                                    fontWeight: dist === 0 ? "600" : "300",
                                    fontVariant: ["tabular-nums"],
                                }}
                            >
                                {pad(item)}
                            </Text>
                        </View>
                    );
                })}
            </Animated.View>
        </View>
    );
};

// ─── TimerScreen ──────────────────────────────────────────────────────────────

interface TimerScreenProps {
    value: StepTimer | null;
    onClose?: () => void;
    onChange: (value: StepTimer | null) => void;
}

const TimerScreen: React.FC<TimerScreenProps> = ({ onClose, onChange }) => {
    const { colors, textStyles } = useTheme();
    const { draft, setDraft, closeTimer } = useTimer();
    const insets = useSafeAreaInsets();

    const isEmpty = !draft.hours && !draft.minutes && !draft.seconds;

    const handleBack = () => {
        closeTimer();
        onClose?.();
    };

    const handleSet = () => {
        if (isEmpty) return;
        onChange({ ...draft });
        closeTimer();
        onClose?.();
    };

    const handleClear = () => {
        onChange(null);
        closeTimer();
        onClose?.()
    };

    return (
        <View
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.background,
                paddingBottom: insets.bottom,
            }}
        >

            {/* ── Header ── */}
            <View style={{ top: insets.top }} className="w-full items-center gap-2 p-2 flex-row">
                <Button style={{ backgroundColor: colors.card }} onPress={handleBack}>
                    <BackIcon color={colors.text} />
                </Button>
                <SectionHeader
                    title="Timer"
                    titleClassName={textStyles.h3}
                    showBackground
                />
            </View>

            {/* ── Live readout ── */}
            <View style={{ paddingTop: 70, alignItems: "center", paddingVertical: 12 }}>
                <Text
                    style={{
                        fontSize: 15,
                        fontWeight: "500",
                        fontVariant: ["tabular-nums"],
                        letterSpacing: 0.5,
                        opacity: 0.45,
                        color: colors.text,
                    }}
                >
                    {pad(draft.hours ?? 0)}
                    <Text style={{ fontSize: 12, fontWeight: "400", opacity: 0.6 }}>h{"  "}</Text>
                    {pad(draft.minutes ?? 0)}
                    <Text style={{ fontSize: 12, fontWeight: "400", opacity: 0.6 }}>m{"  "}</Text>
                    {pad(draft.seconds ?? 0)}
                    <Text style={{ fontSize: 12, fontWeight: "400", opacity: 0.6 }}>s</Text>
                </Text>
            </View>

            {/* ── Picker (flex:1 centers it in the remaining vertical space;   */}
            {/*    the row itself keeps a FIXED height so PICKER_H math for   */}
            {/*    the rail stays accurate — it no longer fights flex:1)      */}
            <View style={{ flex: 1, justifyContent: "center" }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "stretch",
                        paddingHorizontal: 16,
                        height: PICKER_H,
                        width: "100%",
                    }}
                >
                    {/* selection rail */}
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            left: 16,
                            right: 16,
                            top: (PICKER_H - ITEM_H) / 2,
                            height: ITEM_H,
                            borderTopWidth: 1,
                            borderBottomWidth: 1,
                            opacity: 0.2,
                            zIndex: 10,
                            borderColor: colors.text,
                        }}
                    />

                    {TIMER_FIELDS.map((f, idx) => (
                        <React.Fragment key={f.key}>
                            {idx > 0 && (
                                <View
                                    style={{
                                        width: 12,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        zIndex: 11,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 24,
                                            fontWeight: "200",
                                            opacity: 0.2,
                                            marginBottom: 4,
                                            color: colors.text,
                                        }}
                                    >
                                        :
                                    </Text>
                                </View>
                            )}
                            <PickerColumn
                                max={f.max}
                                value={draft[f.key] ?? 0}
                                label={f.label}
                                onChange={(v) => setDraft(f.key, v)}
                            />
                        </React.Fragment>
                    ))}
                </View>
            </View>

            {/* ── Actions ── */}
            <View style={{ height: 100 }} className="w-full flex-row gap-5 items-end justify-center">
                <Button
                    style={{
                        height: 60,
                        width: 150,
                        flexDirection: "row",
                        gap: 10,
                        backgroundColor: colors.button,
                    }}
                    onPress={handleClear}
                    background={true}
                >
                    <NoTimerIcon size={30} color={colors.text} />
                    <Text className={textStyles.caption}>Clear</Text>
                </Button>
                <Button
                    style={{
                        height: 60,
                        width: 150,
                        flexDirection: "row",
                        gap: 10,
                        backgroundColor: colors.button,
                        opacity: isEmpty ? 0.35 : 1,
                    }}
                    onPress={handleSet}
                    background={true}
                    disabled={isEmpty}
                >
                    <TimerIcon size={30} color={colors.text} />
                    <Text className={textStyles.caption}>Set time</Text>
                </Button>
            </View>

        </View>
    );
};

export default TimerScreen;