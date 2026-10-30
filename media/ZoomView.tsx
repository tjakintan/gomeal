import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from "react-native-reanimated";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

type Props = {
    width: number;
    height: number;
    children: React.ReactNode;
    onZoomChange?: (zoomed: boolean) => void;
};

export const ZoomView: React.FC<Props> = ({ width, height, children, onZoomChange }) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const savedTx = useSharedValue(0);
    const savedTy = useSharedValue(0);

    const clampTranslation = (s: number, x: number, y: number) => {
        "worklet";
        const maxX = (width * s - width) / 2;
        const maxY = (height * s - height) / 2;
        return {
            x: Math.min(Math.max(x, -maxX), maxX),
            y: Math.min(Math.max(y, -maxY), maxY),
        };
    };

    const reset = () => {
        "worklet";
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        if (onZoomChange) runOnJS(onZoomChange)(false);
    };

    const pinch = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.8), MAX_SCALE * 1.5);
        })
        .onEnd(() => {
            if (scale.value <= 1) {
                reset();
                return;
            }
            const final = Math.min(scale.value, MAX_SCALE);
            scale.value = withTiming(final);
            savedScale.value = final;

            const c = clampTranslation(final, tx.value, ty.value);
            tx.value = withTiming(c.x);
            ty.value = withTiming(c.y);
            savedTx.value = c.x;
            savedTy.value = c.y;

            if (onZoomChange) runOnJS(onZoomChange)(true);
        });

    const pan = Gesture.Pan()
        .manualActivation(true)
        .onTouchesMove((_e, manager) => {
            if (scale.value > 1) manager.activate();
            else manager.fail();
        })
        .onStart(() => {
            savedTx.value = tx.value;
            savedTy.value = ty.value;
        })
        .onUpdate((e) => {
            const c = clampTranslation(
                scale.value,
                savedTx.value + e.translationX,
                savedTy.value + e.translationY
            );
            tx.value = c.x;
            ty.value = c.y;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1) {
                reset();
            } else {
                scale.value = withTiming(DOUBLE_TAP_SCALE);
                savedScale.value = DOUBLE_TAP_SCALE;
                if (onZoomChange) runOnJS(onZoomChange)(true);
            }
        });

    const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: tx.value },
            { translateY: ty.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View style={[{ width, height }, style]}>{children}</Animated.View>
        </GestureDetector>
    );
};