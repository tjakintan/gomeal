import React, { ReactNode } from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { Button } from "./ButtonComponent";

type SectionHeaderProps = {
  title?: string;
  subtitle?: string;
  showDivider?: boolean;
  showBackground?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  titleClassName?: string;
  subtitleStyle?: TextStyle;
  subtitleClassName?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onIconPress?: () => void;
  children?: ReactNode;
  dark?: boolean;
};

export const SectionHeader = ({
  title,
  subtitle,
  showDivider = false,
  showBackground = false,
  dark = false,
  style,
  titleStyle,
  titleClassName,
  subtitleStyle,
  subtitleClassName,
  leftIcon,
  rightIcon,
  onIconPress,
  children,
}: SectionHeaderProps) => {

  const { colors, textStyles } = useTheme(
    dark ? "dark" : undefined
  );

  return (
    <View
      style={[
        {
          flexShrink: 1,
          minWidth: 0,
          paddingHorizontal: 8,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      <View
        style={{
          width: "100%",
          flexShrink: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minWidth: 0,
        }}
      >
        {leftIcon && (
          <Button onPress={onIconPress}>
            {leftIcon}
          </Button>
        )}

        {(title || children) && (
          <View
            style={[
              {
                minWidth: 0,
                maxWidth: "100%",
                flexShrink: 1,
                alignItems: "flex-start",
              },
              showBackground && {
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 5,
                borderWidth: 3,
                borderColor: colors.card,
                backgroundColor: colors.secondaryCard,
              },
            ]}
          >
            {title && (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  {
                    color: colors.text,
                    flexShrink: 1,
                  },
                  titleStyle,
                ]}
                className={titleClassName ?? textStyles.section}
              >
                {title}
              </Text>
            )}

            {children}
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0 }} />

        {rightIcon && (
          <Button onPress={onIconPress}>
            {rightIcon}
          </Button>
        )}
      </View>

      {subtitle && (
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[
            {
              marginTop: title || leftIcon ? 6 : 0,
              color: colors.secondaryText,
              flexShrink: 1,
            },
            subtitleStyle,
          ]}
          className={subtitleClassName}
        >
          {subtitle}
        </Text>
      )}

      {showDivider && (
        <View
          style={{
            width: "100%",
            height: 1,
            backgroundColor: colors.secondaryCard,
          }}
        />
      )}
    </View>
  );
};