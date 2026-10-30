import React from "react";
import { requireNativeViewManager } from "expo-modules-core";
import type {
    NativeSyntheticEvent,
    ViewProps,
} from "react-native";

export type TabItem = {
    title: string;
    activeIcon: string;
    inactiveIcon: string;
    badgeCount?: string;
};

export type TabPressEvent = {
    index: number;
};

type NativeTabBarNativeProps = ViewProps & {
    items: TabItem[];
    selectedIndex: number;
    activeColor?: string;
    badgeColor?: string;
    badgeTextColor?: string;
    badgeBorderColor?: string;
    onTabPress?: (event: NativeSyntheticEvent<TabPressEvent>) => void;
};

export type NativeTabBarProps = ViewProps & {
    items: TabItem[];
    selectedIndex: number;
    activeColor?: string;
    badgeColor?: string;
    badgeTextColor?: string;
    badgeBorderColor?: string;
    onTabPress?: (index: number) => void;
};

const NativeView =
    requireNativeViewManager<NativeTabBarNativeProps>(
        "NativeTabBar"
    );

export default function NativeTabBar({
    items, selectedIndex, activeColor,
    badgeColor, badgeTextColor, badgeBorderColor,
    onTabPress, ...props
}: NativeTabBarProps) {
    return (
        <NativeView
            {...props}
            items={items}
            selectedIndex={selectedIndex}
            activeColor={activeColor}
            badgeColor={badgeColor}
            badgeTextColor={badgeTextColor}
            badgeBorderColor={badgeBorderColor}
            onTabPress={(e) => onTabPress?.(e.nativeEvent.index)}
        />
    );
}