import React, { useEffect, useRef, memo, useCallback } from "react";

import {
    Pressable,
    StyleSheet,
    useWindowDimensions,
    Animated as RNAnimated,
    View,
} from "react-native";

import BottomSheet, { BottomSheetBackdropProps, BottomSheetView } from "@gorhom/bottom-sheet";

import { useBottomSheet, BottomSheetEntry } from "@/stores/useBottomSheet";
import { useTheme } from "@/provider/ThemeProvider";

import Animated, {
    makeMutable,
    useAnimatedStyle,
    useSharedValue,
    useAnimatedReaction,
    interpolate,
    Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const bottomSheetPosition = makeMutable(0);
export const bottomSheetFirstSnap = makeMutable(0);

export type SheetContentProps = {
    children: React.ReactNode;
};

export const SheetContent = ({ children }: SheetContentProps) => {
    const { height: screenHeight } = useWindowDimensions();

    const animatedStyle = useAnimatedStyle(() => ({
        height: screenHeight - bottomSheetPosition.value,
    }));

    return (
        <Animated.View style={[{ height: "auto", width: "100%" }, animatedStyle]}>
            {children}
        </Animated.View>
    );
};

const SheetBackdrop = ({
    animatedIndex,
    style,
    maxOpacity,
    onPress,
}: BottomSheetBackdropProps & {
    maxOpacity: number;
    onPress: () => void;
}) => {
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            animatedIndex.value,
            [-1, 0],
            [0, maxOpacity],
            Extrapolation.CLAMP
        ),
    }));

    return (
        <Animated.View
            pointerEvents="auto"
            style={[style, { backgroundColor: "#000" }, animatedStyle]}
        >
            <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} />
        </Animated.View>
    );
};

/**
 * One physical <BottomSheet> per stack entry.
 * - Opens itself on mount.
 * - Closes itself when `closing` flips true (store.closeBottomSheet()).
 * - Removes ITSELF from the stack on onClose (pan-down or programmatic).
 * - Only the top entry is interactive and drives the shared mutables.
 */
const SheetItem = memo(function SheetItem({
    entry,
    isTop,
    closing,
    forceDark,
}: {
    entry: BottomSheetEntry;
    isTop: boolean;
    closing: boolean;
    forceDark?: boolean;
}) {
    const sheetRef = useRef<BottomSheet>(null);
    const { height: screenHeight } = useWindowDimensions();

    const { colors } = useTheme(forceDark || entry.dark ? "dark" : undefined);


    // Each sheet tracks its own position...
    const position = useSharedValue(screenHeight);

    // backdrop
    const handleBackdropPress = useCallback(() => {
        sheetRef.current?.close();
    }, []);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <SheetBackdrop
                {...props}
                maxOpacity={entry.backdropOpacity}
                onPress={handleBackdropPress}
            />
        ),
        [entry.backdropOpacity, handleBackdropPress]
    );

    // ...but only the top sheet writes to the global mutable
    useAnimatedReaction(
        () => (isTop ? position.value : null),
        (v) => {
            if (v !== null) bottomSheetPosition.value = v;
        },
        [isTop]
    );

    // CLOSE (programmatic)
    useEffect(() => {
        if (closing) sheetRef.current?.close();
    }, [closing]);

    return (
        <View
            // lower sheets shouldn't steal touches / gestures
            pointerEvents={isTop ? "box-none" : "none"}
            style={StyleSheet.absoluteFillObject}
        >
            <BottomSheet
                ref={sheetRef}
                index={entry.index}
                animateOnMount
                bottomInset={0}
                containerStyle={{ flex: 1 }}
                backdropComponent={entry.backdropOpacity > 0 ? renderBackdrop : undefined}
                snapPoints={entry.snapPoints}
                animatedPosition={position}
                enablePanDownToClose
                enableHandlePanningGesture
                enableContentPanningGesture
                enableDynamicSizing={entry.enableDynamicSizing}
                onClose={() => useBottomSheet.getState().removeBottomSheet(entry.id)}
                backgroundStyle={{
                    backgroundColor: colors.background,
                    borderRadius: 20,
                    shadowColor: colors.text,
                    shadowOpacity: 0.06,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: -1 },
                    elevation: 2,
                }}
                handleIndicatorStyle={{
                    backgroundColor: colors.secondaryCard,
                    width: 45,
                    height: 5,
                }}
            >
                <BottomSheetView style={{ flex: 1, overflow: "hidden" }}>
                    {entry.content}
                </BottomSheetView>
            </BottomSheet>
        </View>
    );
});

export default function AppBottomSheet({ dark }: { dark?: boolean }) {
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const stack = useBottomSheet((s) => s.stack);
    const closingId = useBottomSheet((s) => s.closingId);

    const isLandscape = screenWidth > screenHeight;
    const sideInset = isLandscape ? Math.max(insets.left, insets.right, 16) : 0;
    const sheetWidth = isLandscape
        ? Math.min(screenWidth - sideInset * 2, 560)
        : screenWidth;

    // Keep bottomSheetFirstSnap in sync with the TOP sheet
    const top = stack[stack.length - 1];
    useEffect(() => {
        if (!top) {
            bottomSheetFirstSnap.value = 0;
            return;
        }
        const first = top.snapPoints?.[0];
        bottomSheetFirstSnap.value =
            typeof first === "number"
                ? first
                : typeof first === "string" && first.endsWith("%")
                    ? (parseFloat(first) / 100) * screenHeight
                    : 0;
    }, [top?.id, top?.snapPoints, screenHeight]);

    useEffect(() => {
        if (stack.length === 0) {
            bottomSheetPosition.value = screenHeight;   
        }
    }, [stack.length, screenHeight]);

    return (
        <View
            pointerEvents="box-none"
            style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 100,
            }}
        >
            <View
                pointerEvents="box-none"
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: isLandscape ? (screenWidth - sheetWidth) / 2 : 0,
                    width: sheetWidth,
                }}
            >
                {stack.map((entry, i) => (
                    <SheetItem
                        key={entry.id}
                        entry={entry}
                        isTop={i === stack.length - 1}
                        closing={closingId === entry.id}
                        forceDark={dark}
                    />
                ))}
            </View>
        </View>
    );
}