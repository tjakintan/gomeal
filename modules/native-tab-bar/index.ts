import { requireNativeView } from "expo";
import type { ViewProps } from "react-native";

export type TabItem = {
  title: string;
  activeIcon: string;
  inactiveIcon: string;
};

export type TabPressEvent = {
  index: number;
};

export type NativeTabBarProps = ViewProps & {
  items: TabItem[];
  selectedIndex: number;

  /**
   * Optional active icon tint.
   * When undefined, active icons use their original asset colors.
   */
  activeColor?: string;

  onTabPress?: (event: {
    nativeEvent: TabPressEvent;
  }) => void;
};

const NativeTabBar = requireNativeView<NativeTabBarProps>("NativeTabBar");

export default NativeTabBar;