import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardHeight(
  onChange?: (height: number, visible: boolean) => void
) {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    // keep latest callback without re-subscribing listeners every render
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const show = Keyboard.addListener(showEvent, (e) => {
        const height = e.endCoordinates.height;
            setIsKeyboardVisible(true);
            setKeyboardHeight(height);
            onChangeRef.current?.(height, true);
        });

        const hide = Keyboard.addListener(hideEvent, () => {
            setIsKeyboardVisible(false);
            setKeyboardHeight(0);
            onChangeRef.current?.(0, false);
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

  return { keyboardHeight, isKeyboardVisible };
}