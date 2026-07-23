import * as Haptics from "expo-haptics";
import React, { useState, useRef, useEffect, forwardRef } from "react";
import {
  Animated,
  Pressable,
  View,
  Text,
  Easing,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from "react-native";
import Reanimated, { Extrapolation, interpolate, withDelay, withTiming } from "react-native-reanimated";
import { useTheme } from "@/provider/ThemeProvider";
import { GestureProps, ButtonProps, ToggleButtonProps, SelectionPickerButtonProps, DifficultyOptionButtonProps } from "@/types/components";
import { Gesture as RNGesture, GestureDetector } from "react-native-gesture-handler";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { difficultyColors } from "@/types/styles.types";
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT, buttonCornerRadius } from "@/types/layout.types";
import { Input } from "./InputComponent";
import { useSettingsStore } from "@/stores/useSettings";
import { CheckIcon } from "@/icons/Icon";
import { Unit } from "@/types";
import { formatCount } from "@/utils/time";
import GomealGlassView from "./GlassComponent";

// gesture
const SPRING = { damping: 22, stiffness: 450, mass: 0.35 };
// gesture
const PRESS_IN_MS = 35;
const PRESS_OUT_MS = 45;

export const Gesture: React.FC<GestureProps> = ({
  children,
  style,
  scaleAmount = 0.997,
  haptic = true,
}) => {
  const scale = useSharedValue(1);
  const hapticsEnabled = useSettingsStore(
    (state) => state.settings.app.hapticsEnabled
  );

  const tap = RNGesture.Tap()
    .maxDuration(120)
    .maxDistance(8)
    .onBegin(() => {
      "worklet";

      scale.value = withTiming(scaleAmount, {
        duration: PRESS_IN_MS,
      });

      if (haptic && hapticsEnabled) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onFinalize(() => {
      "worklet";

      scale.value = withTiming(1, {
        duration: PRESS_OUT_MS,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Reanimated.View style={[style, animatedStyle]}>
        {children}
      </Reanimated.View>
    </GestureDetector>
  );
};


// regular button
export const Button = forwardRef<View, ButtonProps>(
  (
    {
      label,
      onPress,
      onLongPress,
      disabled = false,
      background = false,
      clearBackground = false,
      children,
      style,
      className = "",
    },
    ref
  ) => {
    const { colors, textStyles } = useTheme();

    const pressable = (
      <Pressable
        ref={ref}
        onPress={disabled ? undefined : onPress}
        onLongPress={disabled ? undefined : onLongPress}
        disabled={disabled}
        className={`items-center justify-center p-2 ${className}`}
        style={[
          {
            height: (background || clearBackground) ? 40 : undefined,
            width: (background || clearBackground) ? 40 : undefined,
            backgroundColor: background ? colors.button : undefined,
            borderRadius: 999,
            elevation: background ? 1 : 0,
            shadowColor: background ? colors.text : "transparent",
            shadowOpacity: background ? 0.15 : 0,
            shadowRadius: background ? 5 : 0,
            shadowOffset: { width: 0.5, height: background ? 0.5 : 0 },
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {children ?? <Text className={textStyles.body}>{label}</Text>}
      </Pressable>
    );

    if (!clearBackground) {
      return <Gesture scaleAmount={0.999} haptic={!disabled}>{pressable}</Gesture>;
    }

    return (
      <GomealGlassView
        style={{
          height: 40,
          width: 40,
          justifyContent: "center",
          alignItems: "center",
          elevation: 1,
          borderRadius: 999,
        }}
        glassEffectStyle="regular"
        interactive
      >
        <Gesture scaleAmount={0.999} haptic={!disabled}>
          {pressable}
        </Gesture>
      </GomealGlassView>
    );
  }
);
Button.displayName = "Button";


// Button for toggling 
export const ToggleButton = ({
    value,
    defaultValue = false,
    onChange,
    disabled = false,
}: ToggleButtonProps) => {
    const { colors, textStyles } = useTheme();
    const [internal, setInternal] = useState(defaultValue);
    const isControlled = value !== undefined;
    const isOn = isControlled ? value : internal;
    const toggle = () => {
        if (disabled) return;
        const next = !isOn;
        if (!isControlled) setInternal(next);
        onChange?.(next);
    };
    return (
      <Gesture>
        <Pressable
            onPress={toggle}
            disabled={disabled}
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                opacity: disabled ? 0.4 : 1,
            }}
        >
            <View
                style={{
                    width: 52,
                    height: 30,
                    borderRadius: buttonCornerRadius,
                    padding: 3,
                    justifyContent: "center",
                    backgroundColor: isOn ? colors.button : colors.secondaryCard,
                }}
            >
                <View
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: buttonCornerRadius - 2,
                        backgroundColor: "#fff",
                        alignSelf: isOn ? "flex-end" : "flex-start",
                    }}
                />
            </View>
        </Pressable>
      </Gesture>
    );
};

// Button for selections
export const SelectionPickerButton = ({
  value,
  onChange,
  children,
}: SelectionPickerButtonProps) => {
  const { colors } = useTheme();

  return (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 4,
          alignSelf: "flex-start",
        }}
      >
        {React.Children.map(children, (child, i) => {
          const selected = i === value; // using index as value
          return (
            <Button
              key={i}
              onPress={() => onChange(i)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 12,
                backgroundColor: selected ? colors.button : "transparent",
                marginRight: i !== React.Children.count(children) - 1 ? 4 : 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {child}
            </Button>
          );
        })}
      </View>
  );
};

// difficulty lvl picker button
export const DifficultyOptionButton: React.FC<DifficultyOptionButtonProps> = ({
  value,
  selected,
  onChange,
}) => {
  const { colors, textStyles } = useTheme();
  const isSelected = selected === value;

  const anim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isSelected ? 1 : 0,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [anim, isSelected]);

  const circleScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  const textTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  return (
    <Button
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 5,
      }}
      onPress={() => onChange(value)}
    >
      <Animated.View
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: isSelected
            ? difficultyColors[value]
            : colors.background,
          transform: [{ scale: circleScale }],
        }}
      />

      <Animated.Text
        style={{
          color: isSelected ? difficultyColors[value] : colors.text,
          transform: [{ translateX: textTranslateX }],
        }}
        className={textStyles.bodyMedium}
      >
        {value}
      </Animated.Text>
    </Button>
  );
};


// ingredient quantity button
export const IngredientQuantityButton: React.FC<{
    value: number;
    onChange: (value: number) => void;
}> = ({ value, onChange }) => {
    const { colors, textStyles } = useTheme();

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));

    const normalizeNumber = (nextValue: number) => {
        return Number(nextValue.toFixed(2));
    };

    const getStep = () => {
        return Number.isInteger(value) ? 1 : 0.1;
    };

    const commitEdit = () => {
        const parsed = parseFloat(draft);

        if (!isNaN(parsed) && parsed >= 0) {
            onChange(normalizeNumber(parsed));
        } else {
            setDraft(String(value));
        }

        setEditing(false);
    };

    return (
        <View style={{ flexDirection: "row", width: 100, alignItems: "center", gap: 5 }}>
            {editing ? (
                <Input
                    value={draft}
                    onChangeText={setDraft}
                    onBlur={commitEdit}
                    onSubmitEditing={commitEdit}
                    keyboardType="decimal-pad"
                    autoFocus
                    style={{ textAlign: "right" }}
                />
            ) : (
                <>
                    <Button
                        onPress={() => {
                            const step = getStep();
                            onChange(normalizeNumber(Math.max(0, value - step)));
                        }}
                    >
                        <Text className={textStyles.h1} style={{ color: colors.button }}>
                            −
                        </Text>
                    </Button>

                    <Button
                        onPress={() => {
                            setDraft(value === 0 ? "" : String(value));
                            setEditing(true);
                        }}
                    >
                        <Text className={textStyles.h2} style={{ minWidth: 24, textAlign: "center" }}>
                            {formatCount(value)}
                        </Text>
                    </Button>

                    <Button
                        onPress={() => {
                            const step = getStep();
                            onChange(normalizeNumber(value + step));
                        }}
                    >
                        <Text className={textStyles.h1} style={{ color: colors.button }}>
                            +
                        </Text>
                    </Button>
                </>
            )}
        </View>
    );
};


// ingredient unit button
export const IngredientUnitDropDownButton: React.FC<{
    selectedUnit: string;
    onSelectedUnit: (unit: string) => void;
}> = ({ selectedUnit, onSelectedUnit }) => {

    const { colors, textStyles } = useTheme();

    const UNITS: Unit[] = ["", "g", "kg", "oz", "lb", "ml", "l"];

    const currentIndex = Math.max(
        0,
        UNITS.indexOf(selectedUnit as Unit)
    );

    const handlePress = () => {
        const next = (currentIndex + 1) % UNITS.length;
        onSelectedUnit(UNITS[next]);
    };

    const handleLongPress = () => {
        onSelectedUnit("");
    };

    return (
        <Button
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={250}
            hitSlop={16}
            style={{
                padding: 8,
                flex: 1,
                alignItems: "center",
            }}
        >
            <Text
                className={textStyles.h3}
                style={{ color: colors.button }}
            >
                {UNITS[currentIndex].trim() || "—"}
            </Text>
        </Button>
    );
};

// nutrition servings button
export const NutritionServingsButton: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}> = ({ value, onChange, min = 0, step = 1 }) => {
  const { colors, textStyles } = useTheme();

  const max = 5;

  return (
    <View style={{ alignItems: "center", gap: 20 }}>
      <Button
        onPress={() => { onChange( Math.max(min, value - step))}}
        clearBackground
      >
        <Text style={{ color: colors.text, fontSize: 18, lineHeight: 22 }}>−</Text>
      </Button>

      <Text className={textStyles.h2} style={{ minWidth: 32, textAlign: "center" }}>
        {value}
      </Text>

      <Button
        onPress={() => onChange(value + step)}
        disabled={value === max ? true : false}
        clearBackground
      >
        <Text style={{ color: colors.text, fontSize: 18, lineHeight: 22 }}>+</Text>
      </Button>
    </View>
  );
};

// check button
export const CheckButton: React.FC<{
  value?: boolean;
  defaultValue?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}> = ({
  value,
  defaultValue = false,
  onChange,
  disabled = false,
  size = 28,
  style,
}) => {
  const { colors } = useTheme();
  const [internal, setInternal] = useState(defaultValue);

  const isControlled = value !== undefined;
  const checked = isControlled ? value : internal;

  const toggle = () => {
    if (disabled) return;

    const next = !checked;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <Gesture>
      <Pressable
        onPress={toggle}
        disabled={disabled}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 4,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.4 : 1,
            backgroundColor: checked ? colors.button : colors.card,
          },
          style, // 👈 custom style override
        ]}
      >
        {checked ? (
          <CheckIcon
            size={size * 0.65}
            color="#fff"
          />
        ) : null}
      </Pressable>
    </Gesture>
  );
};

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

export const ExpandingButton: React.FC<{
  expanded: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  expandedChildren?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  expandedStyle?: StyleProp<ViewStyle>;
  clearBackground?: boolean;
  expandedWidth?: number;
  expandedHeight?: number;
  borderRadius?: number;
}> = ({
  expanded,
  onPress,
  children,
  expandedChildren,
  style,
  expandedStyle,
  clearBackground = false,
  expandedWidth = 175,
  expandedHeight = 105,
  borderRadius = 20,
}) => {
  const { colors } = useTheme();

  const width = useSharedValue(40);
  const height = useSharedValue(40);
  const radius = useSharedValue(50);

  useEffect(() => {
    width.value = withSpring(expanded ? expandedWidth : 40, SPRING);
    height.value = withSpring(expanded ? expandedHeight : 40, SPRING);

    radius.value = withSpring(
      expanded ? borderRadius : 20,
      SPRING
    );
  }, [expanded, expandedWidth, expandedHeight, borderRadius]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
    borderRadius: radius.value,
  }));

  const content = expanded ? expandedChildren ?? children : children;

  const innerContent = (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {content}
    </View>
  );

  return (
  <>
      <Gesture scaleAmount={0.97}>
        {clearBackground ? (
          <Reanimated.View
            style={[
              animatedStyle,
              {
                position: "relative",
                overflow: "hidden",
                borderCurve: "continuous",
                zIndex: expanded ? 999 : 1,
                elevation: expanded ? 999 : 1,
              },
              style,
              expanded && expandedStyle,
            ]}
          >
            <GomealGlassView
              style={[StyleSheet.absoluteFillObject, { overflow: "hidden", borderRadius, }]}
              glassEffectStyle="clear"
              interactive
            >
              <AnimatedPressable
                onPress={onPress}
                hitSlop={8}
                disabled={expanded}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {innerContent}
              </AnimatedPressable>
            </GomealGlassView>
          </Reanimated.View>
        ) : (
          <AnimatedPressable
            onPress={onPress}
            hitSlop={8}
            disabled={expanded}
            style={[
              animatedStyle,
              {
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                overflow: "hidden",
              },
              expanded && expandedStyle,
            ]}
          >
            {expanded && (
              <View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: colors.background,
                  opacity: 0.8,
                }}
              />
            )}
            {innerContent}
          </AnimatedPressable>
        )}
      </Gesture>
    </>
  );
};