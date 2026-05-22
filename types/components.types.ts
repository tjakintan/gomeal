import { ViewStyle, StyleProp, TextInputProps} from "react-native";
import { ReactNode } from "react";
export type GoMealGlassViewProps = {
    style?: ViewStyle;
    material?: "ultrathin" | "thin" | "regular" | "thick" | "chrome";
    cornerRadius?: number;
};

export type GestureProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scaleAmount?: number;
    duration?: number;
    haptic?: boolean;
}

export type InputProps = TextInputProps & {
    label?: string;
    value?: string;
    defaultValue?: string;
    onChangeText?: (text: string) => void;
    disabled?: boolean;
    children?: React.ReactNode;
    style?: ViewStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onIconPress?: () => void;
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
}

export type ButtonProps = {
  label?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  background?: boolean;
  children?: React.ReactNode; 
  style?: StyleProp<ViewStyle>;
  className?: string;
  gesture?: React.ReactNode; 
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
