import { ViewStyle, StyleProp, TextInputProps, PressableProps} from "react-native";
import { ReactNode } from "react";

export type GoMealGlassViewProps = {
    style?: ViewStyle;
    material?: "ultrathin" | "thin" | "regular" | "thick" | "chrome";
    cornerRadius?: number;
};

export type GestureProps = {
    children: React.ReactNode;
    style?: any;
    scaleAmount?: number;
    haptic?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
    onTouchStart?: () => void;
    onTouchEnd?: () => void;
    onTouchCancel?: () => void;
};

export type InputProps = TextInputProps & {
    label?: string;
    value?: string;
    dark?: boolean;
    multiline?: boolean,
    defaultValue?: string;
    onChangeText?: (text: string) => void;
    disabled?: boolean;
    children?: React.ReactNode;
    style?: ViewStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onIconPress?: () => void;
    iconBackground?: boolean;
    bottomSheet?: boolean;
    maxLength?: number;
    maxHeight ?: number;
    growDirection?: "top" | "bottom";
    showCharCount?: boolean;
    containerStyle?: ViewStyle | ViewStyle[];
};

export type DigitsInputProps = {
    label?: string;
    length?: number;
    value?: string;
    separator?: boolean;
    onChange?: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    style?: ViewStyle;
    boxStyle?: ViewStyle;
};

export type DobInputProps = {
    value?: string;
    label?: string;
    disabled?: boolean;
    placeholder?: string;
    size?: number;
    onChangeText?: (value: string) => void;
};

export type ButtonProps = PressableProps & {
    label?: string;
    background?: boolean;
    style?: StyleProp<ViewStyle>;
    className?: React.ReactNode;
    gesture?: any;
    clearBackground?: boolean;
    children?: React.ReactNode;
};

export type ToggleButtonProps = {
    value?: boolean;
    defaultValue?: boolean;
    onChange?: (v: boolean) => void;
    disabled?: boolean;
};

export type SelectionPickerButtonProps = {
    value: any;
    onChange: (val: any) => void;
    children: ReactNode[];
};

export type DifficultyOptionButtonProps = {
    value: "Easy" | "Medium" | "Hard";
    selected: "Easy" | "Medium" | "Hard" | "";
    onChange: (value: "Easy" | "Medium" | "Hard") => void;
};
