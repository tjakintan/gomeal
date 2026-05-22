import React, { useState, useRef, useEffect, forwardRef } from "react";
import { View, Text, TextInput, TextInputProps, ViewStyle, Keyboard, TouchableWithoutFeedback, Pressable, StyleProp} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { InputProps, DigitsInputProps, DobInputProps  } from "@/types/components";
import { Button } from "./ButtonComponent";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { getDobParts, isValidDob, onlyDigits } from "@/utils/time";

type FocusBoxProps = {
    focused: boolean;
    disabled?: boolean;
    focusedColor?: string;
    unfocusedColor?: string;
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
};

const FocusBox: React.FC<FocusBoxProps> = ({
  focused,
  disabled = false,
  focusedColor,
  unfocusedColor = "transparent",
  style,
  children,
}) => {

  const { colors } = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderWidth: progress.value * 2,
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [unfocusedColor, focusedColor ?? colors.button]
    ),
  }));

  return (
    <Animated.View
      style={[
        {
          opacity: disabled ? 0.5 : 1,
          overflow: "hidden",
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  value,
  defaultValue = "",
  onChangeText,
  multiline = false,
  disabled = false,
  dark = false,
  leftIcon,
  rightIcon,
  onIconPress,
  children,
  style,
  containerStyle,
  bottomSheet = false,
  ...props
}, ref) => {

  const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

  const minInputHeight = 40;
  const maxInputHeight = 100;
  const [inputHeight, setInputHeight] = useState(multiline ? 100 : 40);
  
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const text = isControlled ? value : internal;

  const [focused, setFocused] = useState(false);

  const handleFocus = (e: any) => {
    props.onFocus?.(e);
    setFocused(true);
  };

  const handleBlur = (e: any) => {
    props.onBlur?.(e);
    setFocused(false);
  };

  const handleChange = (t: string) => {
    if (!isControlled) setInternal(t);
    onChangeText?.(t);
  };

  const InputComponent = bottomSheet ? BottomSheetTextInput : TextInput;

  return (
    <View style={{ width: "100%" }}>
      
      {label && (
        <View className="items-start justify-center pb-2">
          <Text
            className={textStyles.caption}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: colors.secondaryCard,
              borderRadius: 15,
            }}
          >
            {label}
          </Text>
        </View>
      )}

      <View
        style={{
          ...containerStyle,
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
          paddingHorizontal: 3,
          borderColor: colors.secondaryCard,
          borderRadius: 15,
          gap: 10
        }}
      >

        {leftIcon && (
          <Button onPress={onIconPress}>{leftIcon}</Button>
        )}

        <FocusBox
          focused={focused}
          disabled={disabled}
          style={[
            {
              flex: 1,
              backgroundColor: colors.button,
              borderRadius: 17,
            },
            containerStyle,
          ]}
        >
          <InputComponent
            multiline={multiline}
            scrollEnabled={multiline}

            onContentSizeChange={(event) => {
              if (!multiline) return;

              const nextHeight = Math.min(
                Math.max(event.nativeEvent.contentSize.height, minInputHeight),
                maxInputHeight,
              );

              setInputHeight(nextHeight);
              props.onContentSizeChange?.(event);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            value={text}
            onChangeText={handleChange}
            placeholderTextColor={colors.secondaryText}
            editable={!disabled}
            style={[
              {
                height: multiline ? inputHeight : 40,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.secondaryCard,
                paddingVertical: multiline ? 10 : 5,
                paddingHorizontal: 10,
                textAlignVertical: multiline ? "top" : "center",
              },
              style,
            ]}
            {...props}
          />
        </FocusBox>

        {rightIcon && (
          <Button onPress={onIconPress}>{rightIcon}</Button>
        )}

        {children}

      </View>

    </View>
  );
});

export const DigitsInput: React.FC<DigitsInputProps> = ({
  length = 6,
  value,
  label,
  onChange,
  onComplete,
  disabled = false,
  separator = false,
  style,
  boxStyle,
}) => {
  const { colors, textStyles } = useTheme();

  const [digits, setDigits] = useState<string[]>(() => {
    const d = (value ?? "").split("").slice(0, length);
    while (d.length < length) d.push("");
    return d;
  });

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const refs = useRef<Array<TextInput | null>>(
    Array.from({ length }, () => null)
  );

  useEffect(() => {
    if (value !== undefined) {
      const d = value.split("").slice(0, length);
      while (d.length < length) d.push("");
      setDigits(d);
    }
  }, [value, length]);

  const update = (next: string[]) => {
    setDigits(next);

    const joined = next.join("");
    onChange?.(joined);

    if (next.every((d) => d !== "")) {
      onComplete?.(joined);
    }
  };

  const onChangeText = (text: string, i: number) => {
    const clean = text.replace(/[^0-9]/g, "");

    if (!clean) {
      const next = [...digits];
      next[i] = "";
      update(next);
      return;
    }

    if (clean.length > 1) {
      const next = [...digits];
      let cursor = i;

      for (let j = 0; j < clean.length && cursor < length; j += 1, cursor += 1) {
        next[cursor] = clean[j];
      }

      update(next);

      const nextFocus = Math.min(cursor, length - 1);

      setTimeout(() => {
        if (next.every((d) => d !== "")) {
          refs.current[nextFocus]?.blur();
        } else {
          refs.current[nextFocus]?.focus();
        }
      }, 50);

      return;
    }

    const next = [...digits];
    next[i] = clean;
    update(next);

    if (i < length - 1) {
      refs.current[i + 1]?.focus();
    } else {
      refs.current[i]?.blur();
    }
  };

  const onKeyPress = (key: string, i: number) => {
    if (key !== "Backspace") return;

    const next = [...digits];

    if (digits[i] !== "") {
      next[i] = "";
      update(next);
      return;
    }

    if (i > 0) {
      next[i - 1] = "";
      update(next);
      refs.current[i - 1]?.focus();
    }
  };

  const half = Math.floor(length / 2);

  return (
    <View style={{ width: "100%", gap: 10 }}>
      {label && (
        <View className="items-start justify-center">
          <Text
            className={textStyles.caption}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: colors.secondaryCard,
              borderRadius: 15,
              color: colors.danger,
            }}
          >
            {label}
          </Text>
        </View>
      )}

      <View
        style={[
          {
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        {digits.map((digit, i) => (
          <React.Fragment key={i}>
            {separator && i === half && (
              <Text
                style={{
                  fontSize: 20,
                  color: colors.secondaryText,
                  marginHorizontal: 2,
                }}
              >
                -
              </Text>
            )}

            <Pressable onPress={() => refs.current[i]?.focus()} disabled={disabled}>
              <FocusBox
                focused={focusedIndex === i}
                disabled={disabled}
                style={[
                  {
                    width: 48,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: digit ? colors.secondaryCard : colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  boxStyle,
                ]}
              >
                <TextInput
                  ref={(r) => {
                    refs.current[i] = r;
                  }}
                  value={digit}
                  onChangeText={(t) => onChangeText(t, i)}
                  onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, i)}
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={length}
                  textAlign="center"
                  selectionColor={colors.text}
                  editable={!disabled}
                  caretHidden
                  style={{
                    width: "100%",
                    height: "100%",
                    fontSize: 22,
                    fontWeight: "500",
                    color: colors.text,
                    textAlign: "center",
                    textAlignVertical: "center",
                  }}
                />
              </FocusBox>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};


type DobPartInputProps = {
  value: string;
  placeholder: string;
  disabled: boolean;
  size: number;
  width: number;
  maxLength: number;
  colors: ReturnType<typeof useTheme>["colors"];
  onChangeText: (text: string) => void;
  onKeyPress?: TextInputProps["onKeyPress"];
};

const DobPartInput = forwardRef<TextInput, DobPartInputProps>(({
  value,
  placeholder,
  disabled,
  size,
  width,
  maxLength,
  colors,
  onChangeText,
  onKeyPress,
}, ref) => {
  const [focused, setFocused] = useState(false);

  return (
    <FocusBox
      focused={focused}
      disabled={disabled}
      style={{
        width,
        height: size,
        borderRadius: 14,
        backgroundColor: value ? colors.background : colors.secondaryCard,
      }}
    >
      <TextInput
        ref={ref}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={maxLength}
        textAlign="center"
        selectionColor={colors.text}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          height: "100%",
          fontSize: 15,
          color: colors.text,
          textAlign: "center",
          textAlignVertical: "center",
          paddingHorizontal: 10,
        }}
      />
    </FocusBox>
  );
});

export const DobInput: React.FC<DobInputProps> = ({
  value = "",
  placeholder = "",
  label,
  disabled = false,
  size = 40,
  onChangeText,
}) => {
  const { colors, textStyles } = useTheme();

  const monthRef = useRef<TextInput | null>(null);
  const dayRef = useRef<TextInput | null>(null);
  const yearRef = useRef<TextInput | null>(null);

  const [month = "", day = "", year = ""] = getDobParts(value);
  const [
    placeholderMonth = "mm",
    placeholderDay = "dd",
    placeholderYear = "yyyy",
  ] = getDobParts(placeholder);

  const updateDob = (next: {
    month?: string;
    day?: string;
    year?: string;
  }) => {
    const nextMonth = next.month ?? month;
    const nextDay = next.day ?? day;
    const nextYear = next.year ?? year;

    onChangeText?.(`${nextMonth}/${nextDay}/${nextYear}`);
  };

  const handleMonthChange = (text: string) => {
    const clean = onlyDigits(text, 2);
    updateDob({ month: clean });

    if (clean.length === 2) {
      dayRef.current?.focus();
    }
  };

  const handleDayChange = (text: string) => {
    const clean = onlyDigits(text, 2);
    updateDob({ day: clean });

    if (clean.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleYearChange = (text: string) => {
    const clean = onlyDigits(text, 4);
    updateDob({ year: clean });

    if (clean.length === 4) {
      yearRef.current?.blur();
    }
  };

  return (
    <View style={{ width: "100%", gap: 5 }}>
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <DobPartInput
          ref={monthRef}
          value={month}
          disabled={disabled}
          placeholder={placeholderMonth || "mm"}
          size={size}
          width={55}
          maxLength={2}
          colors={colors}
          onChangeText={handleMonthChange}
        />

        <Text className={textStyles.h3} style={{ color: colors.text }}>
          /
        </Text>

        <DobPartInput
          ref={dayRef}
          value={day}
          disabled={disabled}
          placeholder={placeholderDay || "dd"}
          size={size}
          width={55}
          maxLength={2}
          colors={colors}
          onChangeText={handleDayChange}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && day.length === 0) {
              monthRef.current?.focus();
            }
          }}
        />

        <Text className={textStyles.h3} style={{ color: colors.text }}>
          /
        </Text>

        <DobPartInput
          ref={yearRef}
          value={year}
          disabled={disabled}
          placeholder={placeholderYear || "yyyy"}
          size={size}
          width={90}
          maxLength={4}
          colors={colors}
          onChangeText={handleYearChange}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && year.length === 0) {
              dayRef.current?.focus();
            }
          }}
        />
      </View>

      {label && (
        <View className="items-start justify-center">
          <Text
            className={textStyles.caption}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: colors.secondaryCard,
              borderRadius: 15,
              color: colors.danger,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};




 