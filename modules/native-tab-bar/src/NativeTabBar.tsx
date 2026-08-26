import React from "react";
import { requireNativeViewManager } from "expo-modules-core";
import type { NativeSyntheticEvent, ViewProps } from "react-native";

type TabItem = {
  title: string;
};

type TabPressEvent = {
  index: number;
};

type NativeTabBarNativeProps = ViewProps & {
  items: TabItem[];
  selectedIndex: number;
  onTabPress?: (
    event: NativeSyntheticEvent<TabPressEvent>
  ) => void;
};

type NativeTabBarProps = ViewProps & {
  items: TabItem[];
  selectedIndex: number;
  onTabPress?: (index: number) => void;
};

const NativeView =
  requireNativeViewManager<NativeTabBarNativeProps>("NativeTabBar");

export default function NativeTabBar({
  items,
  selectedIndex,
  onTabPress,
  ...props
}: NativeTabBarProps) {
  return (
    <NativeView
      {...props}
      items={items}
      selectedIndex={selectedIndex}
      onTabPress={(event) => {
        onTabPress?.(event.nativeEvent.index);
      }}
    />
  );
}